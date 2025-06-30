from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, Depends, Header, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import requests
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, Date, DateTime, func, TIMESTAMP, JSON
from sqlalchemy.orm import sessionmaker, relationship, Session, declarative_base
from sqlalchemy.exc import NoResultFound
import json as pyjson
import json
from datetime import date, datetime, timedelta
import io
from fastapi.responses import StreamingResponse
import csv
from fpdf import FPDF
from jose import JWTError, jwt
import bcrypt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi import APIRouter
import re

# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mapmyroute")
print("DATABASE_URL:", os.getenv("DATABASE_URL"))
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Models ---
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True, nullable=True)  # Firebase UID (nullable)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)  # For email/password users
    name = Column(String)
    picture = Column(String)
    skill_paths = relationship("SkillPathDB", back_populates="user")

class SkillPathDB(Base):
    __tablename__ = "skill_paths"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    data = Column(Text)  # JSON string of roadmap weeks/goals
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("UserDB", back_populates="skill_paths")

class PlannerDB(Base):
    __tablename__ = "planner"
    id = Column(Integer, primary_key=True, index=True)
    skill_path_id = Column(Integer, ForeignKey("skill_paths.id"))
    week = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="pending")  # pending, complete, deferred
    due_date = Column(Date)
    rescheduled_to = Column(Date)  # new column for rescheduling
    skill_path = relationship("SkillPathDB")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(Text)
    created_at = Column(TIMESTAMP)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(Text)
    options = Column(JSON)
    correct_option = Column(String(10))
    skill_tag = Column(String(100))

class UserQuizAttempt(Base):
    __tablename__ = "user_quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    answers = Column(JSON)
    score = Column(Integer)
    attempted_at = Column(TIMESTAMP)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize Firebase Admin SDK (only once)
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class RoadmapRequest(BaseModel):
    topic: str
    level: str
    time: str
    duration: str
    goal: Optional[str] = None  # <-- Add this line

class RoadmapWeek(BaseModel):
    week: int
    goals: List[str]

class RoadmapResponse(BaseModel):
    title: str
    description: str
    weeks: List[RoadmapWeek]

class TokenRequest(BaseModel):
    token: str

# --- Auth (Firebase) ---
@app.post("/auth/firebase")
def firebase_auth_endpoint(body: TokenRequest, db: Session = Depends(get_db)):
    try:
        decoded = firebase_auth.verify_id_token(body.token)
        # Get or create user in DB
        user = db.query(UserDB).filter_by(uid=decoded["uid"]).first()
        if not user:
            user = UserDB(
                uid=decoded["uid"],
                email=decoded.get("email"),
                name=decoded.get("name"),
                picture=decoded.get("picture")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return {
            "uid": user.uid,
            "email": user.email,
            "name": user.name,
            "picture": user.picture
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")

def call_groq(messages, model="llama-3.3-70b-versatile", max_tokens=800, temperature=0.7):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in the environment. Please add it to your .env file.")
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': model,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': temperature
    }
    try:
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        if 'choices' not in data or not data['choices']:
            raise ValueError('No choices returned from Groq API')
        return data['choices'][0]['message']['content']
    except Exception as e:
        print(f"Groq API error: {str(e)}")
        print(f"Groq API response: {getattr(e, 'response', None)}")
        raise

def parse_json_from_response(text):
    try:
        # Try to extract JSON from markdown/code block if present
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing JSON: {str(e)}")
        print(f"Raw text: {text}")
        raise

# --- AI Roadmap Generation (Groq) ---
@app.post("/roadmap/generate", response_model=RoadmapResponse)
def generate_roadmap(req: RoadmapRequest):
    # Add goal to the prompt if provided
    goal_part = f" The end goal is: {req.goal}." if req.goal else ""
    prompt = (
        f"Generate a {req.duration}-week learning roadmap for {req.topic} at {req.level} level. "
        f"Assume the learner has {req.time} available per week."
        f"{goal_part} "
        "For each week, list 2-4 specific learning goals or tasks. Respond in JSON as: "
        "{title, description, weeks: [{week, goals: [..]}]}"
    )
    messages = [
        {"role": "system", "content": "You are an expert learning path generator."},
        {"role": "user", "content": prompt}
    ]
    try:
        content = call_groq(messages, model="llama-3.3-70b-versatile")
        parsed = parse_json_from_response(content)
        return RoadmapResponse(**parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    """Accept both Firebase and JWT tokens. Try Firebase first, then JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    token = authorization.split(" ", 1)[1]
    # Try Firebase first
    try:
        decoded = firebase_auth.verify_id_token(token)
        user = db.query(UserDB).filter_by(uid=decoded["uid"]).first()
        if not user:
            user = UserDB(
                uid=decoded["uid"],
                email=decoded.get("email"),
                name=decoded.get("name"),
                picture=decoded.get("picture")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception:
        # If Firebase fails, try JWT
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
            user = db.query(UserDB).filter_by(id=user_id).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

# --- Skill Paths CRUD ---
@app.get("/skill-paths")
def list_skill_paths(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    paths = db.query(SkillPathDB).filter_by(user_id=user.id).all()
    result = []
    for p in paths:
        # Calculate progress
        total = db.query(PlannerDB).filter_by(skill_path_id=p.id).count()
        completed = db.query(PlannerDB).filter_by(skill_path_id=p.id, status="complete").count()
        progress = int((completed / total) * 100) if total else 0
        result.append({
            "id": p.id,
            "title": str(p.title),
            "description": str(p.description),
            "data": pyjson.loads(str(p.data)) if p.data is not None else None,
            "created_at": p.created_at,
            "progress": progress
        })
    return result

class SkillPathCreate(BaseModel):
    title: str
    description: Optional[str] = None
    data: dict  # roadmap weeks/goals

@app.post("/skill-paths")
def create_skill_path(body: SkillPathCreate, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = SkillPathDB(
        user_id=user.id,
        title=body.title,
        description=body.description,
        data=pyjson.dumps(body.data)
    )
    db.add(path)
    db.commit()
    db.refresh(path)

    # Automatically create planner tasks for each week, using AI to break down into 7 daily tasks
    weeks = body.data.get('weeks', [])
    start_date = date.today()
    for week in weeks:
        week_num = week.get('week')
        goals = week.get('goals', [])
        # Use AI to break down the week's goals into 7 daily tasks
        prompt = (
            f"Given these goals for Week {week_num}: {goals}, break them down into 7 daily tasks (one for each day, Monday to Sunday). "
            "Respond as a JSON list of 7 strings."
        )
        messages = [
            {"role": "system", "content": "You are an expert learning coach."},
            {"role": "user", "content": prompt}
        ]
        try:
            content = call_groq(messages, model="llama-3.3-70b-versatile")
            daily_tasks = parse_json_from_response(content)
            if not isinstance(daily_tasks, list) or len(daily_tasks) != 7:
                raise ValueError("AI did not return 7 daily tasks.")
        except Exception as e:
            # Fallback: evenly distribute goals or repeat if not enough
            daily_tasks = []
            for i in range(7):
                daily_tasks.append(goals[i % len(goals)] if goals else f"Task {i+1}")
        # Assign due dates for each day (Monday-Sunday)
        week_start = start_date + timedelta(weeks=week_num-1)
        for i, daily_task in enumerate(daily_tasks):
            due_date = week_start + timedelta(days=i)
            task = PlannerDB(
                skill_path_id=path.id,
                week=week_num,
                description=daily_task,
                due_date=due_date
            )
            db.add(task)
    db.commit()

    return {
        "id": path.id,
        "title": path.title,
        "description": path.description,
        "data": body.data,
        "created_at": path.created_at
    }

@app.get("/skill-paths/{id}")
def get_skill_path(id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(SkillPathDB).filter_by(id=id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    # Defensive: ensure data is valid JSON and has weeks as a list
    try:
        data = pyjson.loads(str(path.data)) if path.data is not None else None
        if not data or not isinstance(data, dict) or "weeks" not in data or not isinstance(data["weeks"], list):
            data = {"weeks": []}
    except Exception:
        data = {"weeks": []}
    return {
        "id": path.id,
        "title": str(path.title),
        "description": str(path.description),
        "data": data,
        "created_at": path.created_at
    }

class SkillPathUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None

@app.put("/skill-paths/{id}")
def update_skill_path(id: int, body: SkillPathUpdate, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(SkillPathDB).filter_by(id=id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    if body.title is not None:
        setattr(path, "title", body.title)
    if body.description is not None:
        setattr(path, "description", body.description)
    if body.data is not None:
        setattr(path, "data", pyjson.dumps(body.data))
    db.commit()
    db.refresh(path)
    return {
        "id": path.id,
        "title": str(path.title),
        "description": str(path.description),
        "data": pyjson.loads(str(path.data)) if path.data is not None else None,
        "created_at": path.created_at
    }

@app.delete("/skill-paths/{id}")
def delete_skill_path(id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(SkillPathDB).filter_by(id=id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    db.delete(path)
    db.commit()
    return {"message": "Skill path deleted"}

# --- Planner CRUD ---
class PlannerTaskCreate(BaseModel):
    skill_path_id: int
    week: int
    description: str
    due_date: Optional[date] = None

class PlannerTaskUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    rescheduled_to: Optional[date] = None

@app.get("/planner")
def get_planner(skill_path_id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only allow access to user's own skill paths
    path = db.query(SkillPathDB).filter_by(id=skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    tasks = db.query(PlannerDB).filter_by(skill_path_id=skill_path_id).all()
    return [
        {
            "id": t.id,
            "week": t.week,
            "description": t.description,
            "status": t.status,
            "due_date": t.due_date
        } for t in tasks
    ]

@app.get("/planner/week", response_model=List[dict])
def get_weekly_tasks(date: date = Query(...), user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get all tasks for the week containing the given date
    week_number = date.isocalendar()[1]
    tasks = db.query(PlannerDB).join(SkillPathDB).filter(
        SkillPathDB.user_id == user.id,
        PlannerDB.week == week_number
    ).all()
    return [
        {
            "id": t.id,
            "skill_path_id": t.skill_path_id,
            "week": t.week,
            "description": t.description,
            "status": t.status,
            "due_date": t.due_date,
            "rescheduled_to": t.rescheduled_to
        } for t in tasks
    ]

@app.post("/planner", response_model=dict)
def create_planner_task(body: PlannerTaskCreate, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only allow creating tasks for user's own skill paths
    path = db.query(SkillPathDB).filter_by(id=body.skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    task = PlannerDB(
        skill_path_id=body.skill_path_id,
        week=body.week,
        description=body.description,
        due_date=body.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "skill_path_id": task.skill_path_id,
        "week": task.week,
        "description": task.description,
        "status": task.status,
        "due_date": task.due_date,
        "rescheduled_to": task.rescheduled_to
    }


# PATCH single planner task (existing logic)
@app.patch("/planner/{id}", response_model=dict)
def patch_planner_task(id: int, body: PlannerTaskUpdate, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(PlannerDB).join(SkillPathDB).filter(PlannerDB.id==id, SkillPathDB.user_id==user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.description is not None:
        setattr(task, "description", body.description)
    if body.status is not None:
        setattr(task, "status", body.status)
    if body.due_date is not None:
        setattr(task, "due_date", body.due_date)
    if body.rescheduled_to is not None:
        setattr(task, "rescheduled_to", body.rescheduled_to)
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "skill_path_id": task.skill_path_id,
        "week": task.week,
        "description": task.description,
        "status": task.status,
        "due_date": task.due_date,
        "rescheduled_to": task.rescheduled_to
    }

# --- Batch shift endpoint for pending tasks in current week ---
from pydantic import conint

class ShiftPendingTasksRequest(BaseModel):
    skill_path_id: int
    week: conint(ge=1)

@app.post("/planner/shift_pending", response_model=dict)
def shift_pending_tasks(
    body: ShiftPendingTasksRequest = Body(...),
    user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only allow shifting for user's own skill path
    path = db.query(SkillPathDB).filter_by(id=body.skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    # Get all tasks for the week
    week_tasks = db.query(PlannerDB).filter_by(skill_path_id=body.skill_path_id, week=body.week).all()
    if not week_tasks:
        return {"shifted": 0, "message": "No tasks found for this week."}
    # Only shift incomplete (not 'complete') tasks
    pending_tasks = [t for t in week_tasks if t.status != 'complete']
    if not pending_tasks:
        return {"shifted": 0, "message": "All tasks in the current week are complete. No pending tasks to shift."}
    # Find the latest due_date among all tasks in this skill path
    all_tasks = db.query(PlannerDB).filter_by(skill_path_id=body.skill_path_id).all()
    latest_due = None
    for t in all_tasks:
        if t.due_date and (latest_due is None or t.due_date > latest_due):
            latest_due = t.due_date
    if not latest_due:
        latest_due = date.today()
    # Shift each pending task to the next available day
    shifted = 0
    for t in pending_tasks:
        latest_due = latest_due + timedelta(days=1)
        t.due_date = latest_due
        db.add(t)
        shifted += 1
    db.commit()
    return {"shifted": shifted, "message": f"Shifted {shifted} pending tasks to future dates."}

@app.delete("/planner/{id}")
def delete_planner_task(id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(PlannerDB).join(SkillPathDB).filter(PlannerDB.id==id, SkillPathDB.user_id==user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

# --- Progress Analytics ---
@app.get("/analytics")
def get_analytics(skill_path_id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only allow access to user's own skill paths
    path = db.query(SkillPathDB).filter_by(id=skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    total = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id).scalar()
    completed = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="complete").scalar()
    pending = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="pending").scalar()
    deferred = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="deferred").scalar()
    percent_complete = (completed / total * 100) if total else 0
    # Dummy time spent (could be tracked per task in future)
    time_spent = completed * 2  # e.g., 2 hours per completed task
    return {
        "total_tasks": total,
        "completed": completed,
        "pending": pending,
        "deferred": deferred,
        "percent_complete": percent_complete,
        "time_spent_hours": time_spent
    }

@app.get("/analytics/suggestions")
def get_analytics_suggestions(skill_path_id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get analytics data
    path = db.query(SkillPathDB).filter_by(id=skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    total = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id).scalar()
    completed = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="complete").scalar()
    pending = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="pending").scalar()
    deferred = db.query(func.count()).select_from(PlannerDB).filter_by(skill_path_id=skill_path_id, status="deferred").scalar()
    percent_complete = (completed / total * 100) if total else 0
    time_spent = completed * 2  # e.g., 2 hours per completed task

    # Compose prompt for Groq
    prompt = (
        f"Here are my learning stats: {completed} completed, {pending} pending, {deferred} deferred, "
        f"{percent_complete:.1f}% complete, {time_spent} hours spent. "
        "Give me 3 specific, actionable suggestions to improve my learning progress."
    )
    api_key = os.getenv("GROQ_API_KEY")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an expert learning coach."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 300,
        "temperature": 0.7
    }
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return {"suggestions": content}
    except Exception as e:
        return {"suggestions": [], "error": str(e)}

# --- Resource Library ---
@app.get("/resources")
def get_resources(topic: Optional[str] = None):
    import os, requests
    api_key = os.getenv("GROQ_API_KEY")
    if not topic or not topic.strip():
        return {"resources": []}
    prompt = (
        f"List the best online resources (courses, videos, articles) for learning {topic}. "
        "Include links from Udemy, YouTube, Coursera, freeCodeCamp, and other reputable sites. "
        "For each, provide: title, url, type (Free/Paid), difficulty, and platform. "
        "Respond in JSON as [{\"title\":..., \"url\":..., \"type\":..., \"difficulty\":..., \"platform\":...}]."
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an expert learning resource recommender."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 800,
        "temperature": 0.7
    }
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        # Try to extract JSON from markdown/code block if present
        import re
        match = re.search(r"```json\s*(.*?)```", content, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            # Try to find first [ ... ] block
            match = re.search(r"(\[\s*{.*?}\s*\])", content, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                json_str = content
        try:
            resources = json.loads(json_str)
        except Exception:
            # Try to fix common JSON issues (single quotes, trailing commas)
            json_str_fixed = json_str.replace("'", '"')
            json_str_fixed = re.sub(r",\s*}", "}", json_str_fixed)
            json_str_fixed = re.sub(r",\s*]", "]", json_str_fixed)
            resources = json.loads(json_str_fixed)
        # Ensure it's a list of dicts with required keys
        if not isinstance(resources, list):
            resources = []
        else:
            filtered = []
            for r in resources:
                if isinstance(r, dict) and "title" in r and "url" in r:
                    filtered.append(r)
            resources = filtered
        return {"resources": resources}
    except Exception as e:
        print("Resource fetch error:", e)
        return {"resources": [], "error": str(e)}

# --- Export & Account ---
@app.get("/export")
def export_roadmap(skill_path_id: int, format: str = "pdf", user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(SkillPathDB).filter_by(id=skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    data = path.data
    roadmap = pyjson.loads(str(data)) if data is not None else {}
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Week", "Goal"])
        for week in roadmap.get("weeks", []):
            for goal in week["goals"]:
                writer.writerow([week["week"], goal])
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=roadmap_{skill_path_id}.csv"})
    else:  # PDF
        pdf = FPDF()
        pdf.add_page()
        # App Name Header
        pdf.set_font("Arial", 'B', 20)
        pdf.cell(0, 14, "MapMyRoute", ln=True, align='C')
        pdf.ln(2)
        # Title
        pdf.set_font("Arial", 'B', 18)
        pdf.cell(0, 12, str(path.title), ln=True, align='C')
        pdf.ln(2)
        # Description (italic)
        pdf.set_font("Arial", 'I', 12)
        pdf.multi_cell(0, 10, str(path.description or ""), align='C')
        pdf.ln(4)
        # Roadmap weeks
        for week in roadmap.get("weeks", []):
            pdf.set_font("Arial", 'B', 14)
            pdf.ln(4)
            pdf.cell(0, 10, f"Week {week['week']}", ln=True)
            pdf.set_font("Arial", '', 12)
            for goal in week["goals"]:
                pdf.cell(10)  # indent
                pdf.set_font("Arial", '', 12)
                pdf.cell(0, 8, f"- {goal}", ln=True)
        pdf_output = io.BytesIO(pdf.output(dest='S').encode('latin1'))
        return StreamingResponse(pdf_output, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=roadmap_{skill_path_id}.pdf"})

@app.delete("/user/delete")
def delete_account(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
    return {"message": "Account and all data deleted"}

@app.get("/")
def read_root():
    return {"message": "MapMyRoute API running"}

@app.post("/auth/google")
def google_auth():
    return {"message": "Google OAuth placeholder"}

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"

# Helper: create JWT
def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# Helper: get user from JWT
security = HTTPBearer()
def get_current_user_jwt(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(UserDB).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Registration endpoint
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

@app.post("/auth/register")
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(UserDB).filter_by(email=body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = UserDB(email=body.email, password_hash=hashed, name=body.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

# Login endpoint
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
def login_user(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter_by(email=body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

@app.post("/planner/generate-from-skill-path/{skill_path_id}")
def generate_weekly_plan(skill_path_id: int, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    path = db.query(SkillPathDB).filter_by(id=skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    roadmap = pyjson.loads(str(path.data)) if path.data is not None else {}
    # Optionally, enhance with Groq
    prompt = (
        f"Given this skill path roadmap: {roadmap}, generate a detailed weekly planner with actionable tasks for each week. Respond in JSON as: [{{week, goals: [..]}}]"
    )
    api_key = os.getenv("GROQ_API_KEY")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an expert learning coach."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 800,
        "temperature": 0.7
    }
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        weekly_plan = pyjson.loads(content)
        return {"weekly_plan": weekly_plan}
    except Exception as e:
        # Fallback: just return the original roadmap weeks
        return {"weekly_plan": roadmap.get("weeks", []), "error": str(e)}

from fastapi import Body

class RegenerateWeekRequest(BaseModel):
    skill_path_id: int
    week: int
    mode: str  # "deeper" or "easier"

@app.post("/planner/regenerate_week")
def regenerate_week(
    body: RegenerateWeekRequest = Body(...),
    user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch the skill path and week data
    path = db.query(SkillPathDB).filter_by(id=body.skill_path_id, user_id=user.id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Skill path not found")
    roadmap = pyjson.loads(str(path.data)) if path.data is not None else {}
    week_obj = None
    for w in roadmap.get("weeks", []):
        if w.get("week") == body.week:
            week_obj = w
            break
    if not week_obj:
        raise HTTPException(status_code=404, detail="Week not found in roadmap")
    # Compose prompt for Groq
    if body.mode == "deeper":
        prompt = (
            f"Given this learning week for {path.title}: {week_obj['goals']}, expand and go deeper. "
            "Break down each goal into more advanced sub-topics or tasks. Respond as a JSON list of new goals."
        )
    else:
        prompt = (
            f"Given this learning week for {path.title}: {week_obj['goals']}, make it easier and more beginner-friendly. "
            "Break down each goal into simpler sub-tasks or easier steps. Respond as a JSON list of new goals."
        )
    messages = [
        {"role": "system", "content": "You are an expert learning coach."},
        {"role": "user", "content": prompt}
    ]
    try:
        content = call_groq(messages, model="llama-3.3-70b-versatile")
        new_goals = parse_json_from_response(content)
        if not isinstance(new_goals, list):
            raise Exception("AI did not return a list")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq error: {str(e)}")
    # Update roadmap in DB
    for w in roadmap.get("weeks", []):
        if w.get("week") == body.week:
            w["goals"] = new_goals
    path.data = pyjson.dumps(roadmap)
    db.commit()
    # Remove old planner tasks for this week
    db.query(PlannerDB).filter_by(skill_path_id=path.id, week=body.week).delete()
    # Recreate planner tasks for the week (distribute new goals over 7 days)
    start_date = date.today() + timedelta(weeks=body.week-1)
    # Use AI to break down into 7 daily tasks
    prompt = (
        f"Given these goals for Week {body.week}: {new_goals}, break them down into 7 daily tasks (one for each day, Monday to Sunday). "
        "Respond as a JSON list of 7 strings."
    )
    messages = [
        {"role": "system", "content": "You are an expert learning coach."},
        {"role": "user", "content": prompt}
    ]
    try:
        content = call_groq(messages, model="llama-3.3-70b-versatile")
        daily_tasks = parse_json_from_response(content)
        if not isinstance(daily_tasks, list) or len(daily_tasks) != 7:
            raise Exception("AI did not return 7 daily tasks")
    except Exception:
        # fallback: repeat goals
        daily_tasks = []
        for i in range(7):
            daily_tasks.append(new_goals[i % len(new_goals)] if new_goals else f"Task {i+1}")
    for i, daily_task in enumerate(daily_tasks):
        due_date = start_date + timedelta(days=i)
        task = PlannerDB(
            skill_path_id=path.id,
            week=body.week,
            description=daily_task,
            due_date=due_date
        )
        db.add(task)
    db.commit()
    return {"week": body.week, "new_goals": new_goals}

from fastapi import APIRouter
api_router = APIRouter()

def clean_json_string(json_str):
    import re
    # Remove markdown code block markers
    json_str = re.sub(r"^```json|```$", "", json_str, flags=re.MULTILINE).strip()
    # Replace single quotes with double quotes
    json_str = json_str.replace("'", '"')
    # Remove trailing commas before } or ]
    json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
    # Insert missing commas between objects in arrays
    json_str = re.sub(r"}(\s*){", r"},\1{", json_str)
    # Remove newlines between objects in arrays
    json_str = re.sub(r"]\s*\[", "], [", json_str)
    # Remove any double commas
    json_str = re.sub(r",\s*,", ",", json_str)
    # Remove any comma before closing array
    json_str = re.sub(r",\s*]", "]", json_str)
    return json_str

def truncate_to_last_complete_json(json_str):
    # Find the last closing curly or square bracket
    last_curly = json_str.rfind('}')
    last_square = json_str.rfind(']')
    last = max(last_curly, last_square)
    if last != -1:
        return json_str[:last+1], (last != len(json_str)-1)
    return json_str, False

def remove_incomplete_objects(json_str):
    import re
    # Always remove the last object in each array, regardless of completeness
    def fix_array(match):
        arr = match.group(0)
        # Find all objects in the array
        objects = list(re.finditer(r'\{[^\}]*\}', arr))
        if len(objects) > 1:
            # Remove the last object
            last_obj = objects[-1]
            arr = arr[:last_obj.start()] + ']'  # Remove from last object to end, close array
            # Remove any trailing comma
            arr = re.sub(r',\s*]', ']', arr)
        return arr
    # Apply to all arrays in the JSON string
    json_str = re.sub(r'\[[^\]]*\]', fix_array, json_str, flags=re.MULTILINE)
    return json_str

def extract_valid_objects(json_str):
    import re
    # For each array, extract all valid {...} objects and reconstruct the array
    def fix_array(match):
        arr = match.group(0)
        objs = re.findall(r'\{[^\{\}]*\}', arr)
        return '[' + ','.join(objs) + ']'
    # Replace each array with only its valid objects
    json_str = re.sub(r'\[[^\]]*\]', fix_array, json_str)
    return json_str

def fallback_parse_arrays(json_str):
    import re
    import json
    arrays = {}
    for key in ['videos', 'video_tutorials', 'articles', 'courses', 'online_courses', 'books', 'tools']:
        match = re.search(rf'"{key}"\s*:\s*(\[[^\]]*\])', json_str)
        if match:
            arr_str = match.group(1)
            try:
                arr = json.loads(arr_str)
                arrays[key] = arr
            except Exception:
                arrays[key] = []
        else:
            arrays[key] = []
    arrays['error'] = "Partial results: failed to parse full response, but some arrays were recovered."
    return arrays

@api_router.post("/get-resources")
async def get_resources_api(request: Request):
    try:
        data = await request.json()
        topic = data.get('topic')
        difficulty_level = data.get('difficultyLevel', 'Beginner')
        if not topic:
            return JSONResponse(status_code=400, content={
                'videos': [],
                'video_tutorials': [],
                'articles': [],
                'courses': [],
                'online_courses': [],
                'books': [],
                'tools': [],
                'error': 'Missing required field: topic'
            })
        # Prompt for platform-agnostic, ranked resources (no learning style)
        prompt = f"""
For the topic '{topic}', curate and rank the best resources from across the entire internet. Include:
- Free videos
- Articles
- Premium and free courses
- Books
- Tools
For each resource, provide: title, url, type (Free/Paid), platform/source, and a userRating (1-5) or rank (1=best). Group the response as:
{{
  "videos": [{{"title":..., "url":..., "type":..., "platform":..., "userRating":...}}],
  "articles": [{{...}}],
  "courses": [{{...}}],
  "books": [{{"title":..., "url":..., "author":..., "userRating":...}}],
  "tools": [{{...}}]
}}
Respond in JSON only.
"""
        api_key = os.getenv("GROQ_API_KEY")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data_groq = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are an expert learning resource recommender."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        import requests
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data_groq,
                timeout=60
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            # Try to extract JSON from markdown/code block if present
            match = re.search(r"```json\s*(.*?)```", content, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                # Try to find first { ... } block
                match = re.search(r"({\s*\"videos\".*})", content, re.DOTALL)
                if match:
                    json_str = match.group(1)
                else:
                    json_str = content
            json_str = clean_json_string(json_str)
            json_str, was_truncated = truncate_to_last_complete_json(json_str)
            json_str = extract_valid_objects(json_str)
            try:
                resources = json.loads(json_str)
            except Exception as e:
                print("Failed to parse JSON from Groq response:", e)
                print("Raw response was:", content)
                # Fallback: try to parse each array individually
                resources = fallback_parse_arrays(json_str)
                resources['raw_response'] = content
            # Ensure all keys are present and are lists (including legacy fields)
            default_resources = {
                'videos': [],
                'video_tutorials': [],
                'articles': [],
                'courses': [],
                'online_courses': [],
                'books': [],
                'tools': []
            }
            if not isinstance(resources, dict):
                resources = default_resources
            else:
                for key in default_resources:
                    if key not in resources or not isinstance(resources[key], list):
                        resources[key] = []
            if was_truncated:
                resources['error'] = resources.get('error', '') + " Some results may be missing due to incomplete data from the AI."
            return resources
        except Exception as e:
            print("Resource fetch error (categorized):", e)
            return {
                'videos': [],
                'video_tutorials': [],
                'articles': [],
                'courses': [],
                'online_courses': [],
                'books': [],
                'tools': [],
                'error': str(e)
            }
    except Exception as e:
        return JSONResponse(status_code=500, content={
            'videos': [],
            'video_tutorials': [],
            'articles': [],
            'courses': [],
            'online_courses': [],
            'books': [],
            'tools': [],
            'error': str(e)
        })

app.include_router(api_router, prefix="/api")

@app.get("/user/{user_id}/progress")
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    # Example: fetch user progress from your existing tables
    # Replace with your actual logic
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
    return progress

@app.get("/quiz/personalized/{user_id}")
def get_personalized_quiz(user_id: int, db: Session = Depends(get_db)):
    # Fetch user progress
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
    # Example: get relevant skill tags from progress
    skill_tags = progress.current_skills if progress else []
    # Fetch questions matching skill tags
    questions = db.query(Question).filter(Question.skill_tag.in_(skill_tags)).all()
    # Pick a quiz or create one on the fly
    quiz = {"title": "Weekly Challenge", "questions": [q for q in questions]}
    return quiz

@app.post("/quiz/attempt")
def submit_quiz_attempt(user_id: int, quiz_id: int, answers: dict, db: Session = Depends(get_db)):
    # Fetch correct answers
    questions = db.query(Question).filter(Question.quiz_id == quiz_id).all()
    score = sum(1 for q in questions if answers.get(str(q.id)) == q.correct_option)
    attempt = UserQuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        answers=answers,
        score=score,
        attempted_at=datetime.utcnow()
    )
    db.add(attempt)
    db.commit()
    return {"score": score, "total": len(questions)}

@app.get("/quiz/history/{user_id}")
def get_quiz_history(user_id: int, db: Session = Depends(get_db)):
    attempts = db.query(UserQuizAttempt).filter(UserQuizAttempt.user_id == user_id).all()
    return attempts