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
import urllib.parse

# --- Database Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mapmyroute.db")
print("DATABASE_URL:", os.getenv("DATABASE_URL"))

# Ensure database directory exists (for SQLite)
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
            print(f"Created database directory: {db_dir}")
        except PermissionError:
            # If we can't create the directory, use current directory instead
            print(f"Permission denied for {db_dir}, using current directory")
            DATABASE_URL = "sqlite:///./mapmyroute.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
    correct_option = Column(String)  # Keep for backward compatibility
    correct_option_index = Column(Integer)  # New: index of correct option
    skill_tag = Column(String(100))

class UserQuizAttempt(Base):
    __tablename__ = "user_quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    answers = Column(JSON)
    score = Column(Integer)
    attempted_at = Column(TIMESTAMP)

class UserProgress(Base):
    __tablename__ = "user_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    current_skills = Column(Text, default="[]")  # JSON string for SQLite compatibility
    updated_at = Column(DateTime, default=datetime.utcnow)

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
        # Try to clean/truncate and re-parse
        try:
            cleaned = clean_json_string(text)
            return json.loads(cleaned)
        except Exception:
            try:
                truncated = truncate_to_last_complete_json(text)
                return json.loads(truncated)
            except Exception:
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
        "For each week, list 2-4 specific learning goals or tasks. "
        "Respond with only valid JSON, no explanations, no markdown, no comments. "
        "Format: {title, description, weeks: [{week, goals: [..]}]}"
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

    # Automatically update user progress if task is marked complete
    if body.status == "complete":
        skill_path = db.query(SkillPathDB).filter_by(id=task.skill_path_id).first()
        if skill_path:
            skill_tag = skill_path.title
            progress = db.query(UserProgress).filter_by(user_id=user.id).first()
            if progress:
                # Parse current_skills from JSON string
                current_skills = pyjson.loads(progress.current_skills) if progress.current_skills else []
                if skill_tag not in current_skills:
                    current_skills.append(skill_tag)
                    progress.current_skills = pyjson.dumps(current_skills)
                    progress.updated_at = datetime.utcnow()
            else:
                progress = UserProgress(user_id=user.id, current_skills=pyjson.dumps([skill_tag]))
                db.add(progress)
            db.commit()
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

def is_resource_available(url):
    """Check if a resource URL is available (YouTube: oEmbed API + HTML, playlists: HTML, others: status 200 and not a known error page)."""
    try:
        import urllib.parse
        # YouTube playlist check
        if ("youtube.com/playlist?list=" in url):
            resp = requests.get(url, timeout=5)
            html = resp.text.lower()
            playlist_error_phrases = [
                "this playlist does not exist",
                "playlist unavailable",
                "this playlist is private",
                "no videos found"
            ]
            for phrase in playlist_error_phrases:
                if phrase in html:
                    print(f"YouTube playlist unavailable: {url}")
                    return False
            if len(html.strip()) < 100:
                print(f"YouTube playlist very short/empty: {url}")
                return False
            return True
        # YouTube video check via oEmbed API and HTML fallback
        if ("youtube.com/watch" in url or "youtu.be/" in url):
            # Normalize to full YouTube URL
            if "youtu.be/" in url:
                video_id = url.split("youtu.be/")[-1].split("?")[0]
                yt_url = f"https://www.youtube.com/watch?v={video_id}"
            else:
                # Extract video_id from v= param if present
                parsed = urllib.parse.urlparse(url)
                query = urllib.parse.parse_qs(parsed.query)
                video_id = query.get("v", [None])[0]
                if video_id:
                    yt_url = f"https://www.youtube.com/watch?v={video_id}"
                else:
                    yt_url = url
            oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(yt_url)}&format=json"
            resp = requests.get(oembed_url, timeout=5)
            if resp.status_code == 200:
                return True
            # Fallback: check HTML for error phrases
            resp2 = requests.get(yt_url, timeout=5)
            html = resp2.text.lower()
            yt_error_phrases = [
                "this video isn't available anymore",
                "video unavailable",
                "this video is private",
                "has been removed",
                "is not available in your country"
            ]
            for phrase in yt_error_phrases:
                if phrase in html:
                    print(f"YouTube unavailable: {url}")
                    return False
            if len(html.strip()) < 100:
                print(f"YouTube very short/empty: {url}")
                return False
            return True
        # Other resources: check status and HTML content
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            print(f"Resource not 200: {url}")
            return False
        # Check for common and platform-specific error phrases in the HTML (case-insensitive, partial match)
        error_phrases = [
            # Generic
            "not found", "404", "unavailable", "error", "page not found", "does not exist", "removed", "private",
            # Coursera
            "course not found", "page not found", "this course is no longer available", "enrollments are closed", "we were not able to find the page you're looking for.",
            # Udemy
            "course not found", "sorry, this course is no longer available", "this course is unavailable", "udemy.com home page",
            # Amazon
            "currently unavailable", "the web address you entered is not a functioning page", "out of print", "no longer available", "looking for something? we're sorry. the web address you entered is not a functioning page on our site"
        ]
        html = resp.text.lower()
        if len(html.strip()) < 100:
            print(f"Resource very short/empty: {url}")
            return False  # Very short/empty page
        for phrase in error_phrases:
            if phrase in html:
                print(f"Resource error phrase '{phrase}' found: {url}")
                return False
        return True
    except Exception as e:
        print(f"Resource check exception for {url}: {e}")
        return False

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
                    # Filter out unavailable resource links (all platforms)
                    if is_resource_available(r["url"]):
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
        # Summary
        pdf.set_font("Arial", '', 12)
        pdf.cell(0, 10, f"Total Weeks: {len(roadmap.get('weeks', []))}", ln=True)
        pdf.ln(2)
        # Roadmap weeks
        for week in roadmap.get("weeks", []):
            pdf.set_font("Arial", 'B', 14)
            pdf.ln(4)
            pdf.set_text_color(34, 197, 94)  # green for week header
            pdf.cell(0, 10, f"Week {week['week']}", ln=True)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("Arial", '', 12)
            for goal in week["goals"]:
                x = pdf.get_x()
                pdf.set_x(x + 12)  # indent
                pdf.multi_cell(0, 8, f"- {goal}")
            # Draw a line after each week
            pdf.ln(1)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
        pdf.set_text_color(0, 0, 0)
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
    # Fetch all skill paths for the user
    skill_paths = db.query(SkillPathDB).filter_by(user_id=user_id).all()
    all_questions = []
    quiz_id_to_return = None
    for skill_path in skill_paths:
        skill_tag = skill_path.title
        print(f"[QUIZ DEBUG] Skill Path: {skill_tag}")
        # Fetch or create a quiz for this skill (for quiz_id)
        quiz_obj = db.query(Quiz).filter_by(title=skill_tag).first()
        if not quiz_obj:
            quiz_obj = Quiz(title=skill_tag, description=f"Auto-generated quiz for {skill_tag}")
            db.add(quiz_obj)
            db.commit()
            db.refresh(quiz_obj)
        quiz_id = quiz_obj.id
        if quiz_id_to_return is None:
            quiz_id_to_return = quiz_id
        # Fetch completed tasks for this skill path
        completed_tasks = db.query(PlannerDB).filter_by(skill_path_id=skill_path.id, status="complete").all()
        completed_descriptions = [t.description for t in completed_tasks]
        print(f"[QUIZ DEBUG] Completed Descriptions: {completed_descriptions}")
        # Always use Groq to generate questions based on completed tasks
        questions = []
        if completed_descriptions:
            prompt = (
                f"Generate 3 quiz questions (with 4 options each, and the correct answer) for the skill: {skill_tag}. "
                f"Base the questions on these completed tasks: {completed_descriptions}. "
                "Respond in JSON as a list: [{question_text, options, correct_option}]. "
                "Strictly respond with valid JSON only. Do not include any explanations, markdown, or extra text."
            )
            messages = [
                {"role": "system", "content": "You are a quiz generator."},
                {"role": "user", "content": prompt}
            ]
            try:
                content = call_groq(messages)
                try:
                    generated = parse_json_from_response(content)
                except Exception as e:
                    print(f"Groq JSON parse error: {e}")
                    print(f"Raw Groq response: {content}")
                    # Try fallback repair/extract
                    try:
                        generated = fallback_parse_arrays(content)
                        print("[QUIZ DEBUG] Used fallback_parse_arrays for Groq response.")
                    except Exception as e2:
                        print(f"Fallback JSON parse also failed: {e2}")
                        continue  # Skip this skill if still broken
                for q in generated:
                    # Find the index of the correct option
                    try:
                        # Try to interpret correct_option as an index
                        correct_index = int(q["correct_option"])
                        if not (0 <= correct_index < len(q["options"])):
                            raise ValueError
                    except (ValueError, TypeError):
                        # Fallback to fuzzy matching
                        correct_index = None
                        for idx, opt in enumerate(q["options"]):
                            opt_str = str(opt).strip().lower()
                            correct_str = str(q["correct_option"]).strip().lower()
                            if (
                                opt_str == correct_str or
                                opt_str in correct_str or
                                correct_str in opt_str
                            ):
                                correct_index = idx
                                break
                    if correct_index is None:
                        print(f"[QUIZ WARNING] Could not find correct option for question: {q['question_text']}")
                        print(f"[QUIZ WARNING] Options: {q['options']}")
                        print(f"[QUIZ WARNING] Correct answer: {q['correct_option']}")
                        continue  # Skip this question
                    existing = db.query(Question).filter_by(
                        quiz_id=quiz_id,
                        question_text=q["question_text"],
                        skill_tag=skill_tag
                    ).first()
                    if existing:
                        question = existing
                    else:
                        question = Question(
                            quiz_id=quiz_id,
                            question_text=q["question_text"],
                            options=q["options"],
                            correct_option=q["correct_option"],
                            correct_option_index=correct_index,
                            skill_tag=skill_tag
                        )
                        db.add(question)
                        db.commit()
                        db.refresh(question)
                    questions.append({
                        "id": question.id,
                        "question_text": question.question_text,
                        "options": question.options,
                        "skill_tag": question.skill_tag
                    })
                print(f"[QUIZ DEBUG] Generated {len(questions)} questions for skill: {skill_tag}")
            except Exception as e:
                print(f"Groq question generation failed: {e}")
        else:
            print(f"[QUIZ DEBUG] No completed tasks for skill: {skill_tag}")
        all_questions.extend(questions)
    print(f"[QUIZ DEBUG] Total questions returned: {len(all_questions)}")
    quiz = {
        "title": "Weekly Challenge",
        "quiz_id": quiz_id_to_return,
        "questions": all_questions
    }
    return quiz

class QuizAttemptRequest(BaseModel):
    user_id: int
    quiz_id: int
    answers: dict
    question_ids: list[int]

@app.post("/quiz/attempt")
def submit_quiz_attempt(body: QuizAttemptRequest, db: Session = Depends(get_db)):
    user_id = body.user_id
    quiz_id = body.quiz_id
    answers = body.answers
    question_ids = body.question_ids
    # Fetch only the questions that were shown to the user
    questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
    # Debug print for each question
    for q in questions:
        print(f"[QUIZ SCORING DEBUG] QID: {q.id}, User Index: {answers.get(str(q.id))}, Correct Index: {q.correct_option_index}, Options: {q.options}")
    score = sum(1 for q in questions if answers.get(str(q.id)) == q.correct_option_index)
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

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")
ADZUNA_COUNTRY = "in"  # India
ADZUNA_BASE_URL = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/1"
ADZUNA_CATEGORIES_URL = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/categories"
ADZUNA_LOCATIONS_URL = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/locations/1"

# Helper to call Adzuna API for job search
def adzuna_job_search(skill, location, results=10):
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": results,
        "what": skill,
        "where": location,
        "content-type": "application/json"
    }
    url = ADZUNA_BASE_URL + "?" + urllib.parse.urlencode(params)
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.json().get("results", [])
    return []

# Helper to call Adzuna API for salary benchmarking
def adzuna_salary_benchmark(role, location):
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": role,
        "where": location,
        "content-type": "application/json"
    }
    url = ADZUNA_BASE_URL + "?" + urllib.parse.urlencode(params)
    resp = requests.get(url)
    if resp.status_code == 200:
        jobs = resp.json().get("results", [])
        salaries = [j.get("salary_is_predicted") == "1" and float(j.get("salary_max", 0)) for j in jobs if j.get("salary_max")]
        if salaries:
            avg_salary = sum(salaries) / len(salaries)
            return {"average_salary": avg_salary, "sample_size": len(salaries)}
    return {"average_salary": None, "sample_size": 0}

# Helper to get skill relevance score
def adzuna_skill_relevance(skills, location, results=50):
    skill_scores = {}
    for skill in skills:
        jobs = adzuna_job_search(skill, location, results)
        skill_scores[skill] = len(jobs)
    return skill_scores

@app.get("/api/job-postings")
def get_job_postings(skill: str, location: str = "India", results: int = 10):
    """Get live job postings from Adzuna for a skill and location."""
    postings = adzuna_job_search(skill, location, results)
    return {"postings": postings}

@app.get("/api/salary-benchmark")
def get_salary_benchmark(role: str, location: str = "India"):
    """Get average salary for a role in a location from Adzuna."""
    data = adzuna_salary_benchmark(role, location)
    return data

@app.get("/api/skill-relevance")
def get_skill_relevance(skills: str, location: str = "India", results: int = 50):
    """Get demand score for each skill based on job postings from Adzuna."""
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    scores = adzuna_skill_relevance(skill_list, location, results)
    return {"relevance": scores}

@app.get("/api/job-categories")
def get_job_categories():
    """Get job categories from Adzuna for India."""
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "content-type": "application/json"
    }
    url = ADZUNA_CATEGORIES_URL + "?" + urllib.parse.urlencode(params)
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.json().get("results", [])
    return []

def fetch_adzuna_locations(level_url=None, depth=1, max_depth=3):
    """Recursively fetch sublocations from Adzuna up to max_depth."""
    if not level_url:
        level_url = ADZUNA_LOCATIONS_URL
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "content-type": "application/json"
    }
    url = level_url + "?" + urllib.parse.urlencode(params)
    print(f"Fetching locations from: {url}")
    resp = requests.get(url)
    print(f"Status code: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")  # Print first 500 chars
    if resp.status_code != 200:
        return []
    results = resp.json().get("results", [])
    flat = []
    for loc in results:
        flat.append({"tag": loc.get("tag"), "display_name": loc.get("display_name")})
        # If there are sublocations and we haven't reached max_depth, fetch them
        if loc.get("locations") and depth < max_depth:
            for sub in loc["locations"]:
                sub_url = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/locations/{sub['tag']}"
                flat.extend(fetch_adzuna_locations(sub_url, depth+1, max_depth))
    return flat

@app.get("/api/job-locations")
def get_job_locations():
    # Use GeoNames API for Indian cities
    username = "sakshi_thorat"
    url = f"http://api.geonames.org/searchJSON?country=IN&featureClass=P&maxRows=1000&username={username}"
    resp = requests.get(url)
    if resp.status_code == 200:
        data = resp.json()
        # Return a list of dicts with tag and display_name
        return [
            {"tag": city["name"].lower().replace(' ', '-'), "display_name": city["name"]}
            for city in data.get("geonames", [])
        ]
    return []

@app.get("/api/user-skills/{user_id}")
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    # Get all skill paths for the user
    paths = db.query(SkillPathDB).filter_by(user_id=user_id).all()
    acquired = []
    in_progress = []
    for p in paths:
        total = db.query(PlannerDB).filter_by(skill_path_id=p.id).count()
        completed = db.query(PlannerDB).filter_by(skill_path_id=p.id, status="complete").count()
        # Use the skill path title as the skill name
        skill_name = str(p.title)
        if total == 0:
            continue
        if completed == total:
            acquired.append(skill_name)
        elif completed > 0:
            in_progress.append(skill_name)
    return {"acquired": acquired, "in_progress": in_progress}

@app.get("/roadmap/suggestions/{user_id}")
def get_roadmap_suggestions(user_id: int, db: Session = Depends(get_db)):
    # Find missed tasks
    missed_tasks = db.query(PlannerDB).join(SkillPathDB).filter(
        SkillPathDB.user_id == user_id,
        PlannerDB.status != "complete",
        PlannerDB.due_date < date.today()
    ).all()
    suggestions = []
    if missed_tasks:
        suggestions.append(f"You have {len(missed_tasks)} missed tasks. Consider combining them into this week or rescheduling.")
    else:
        suggestions.append("Great job! Consider taking on extra practice or exploring advanced topics.")
    return {"suggestions": suggestions}

@app.post("/roadmap/recalculate/{user_id}")
def recalculate_roadmap(user_id: int, db: Session = Depends(get_db)):
    # Find all missed tasks (not complete, due date in the past)
    missed_tasks = db.query(PlannerDB).join(SkillPathDB).filter(
        SkillPathDB.user_id == user_id,
        PlannerDB.status != "complete",
        PlannerDB.due_date < date.today()
    ).all()
    if not missed_tasks:
        return {"message": "No missed tasks to reschedule."}
    # Find the latest due date among all tasks for this user
    latest_due = db.query(PlannerDB.due_date).join(SkillPathDB).filter(
        SkillPathDB.user_id == user_id
    ).order_by(PlannerDB.due_date.desc()).first()
    if latest_due and latest_due[0]:
        start_date = latest_due[0] + timedelta(days=1)
    else:
        start_date = date.today()
    # Move each missed task to a new week after the latest due date
    for i, task in enumerate(missed_tasks):
        # Assign to the next week (spread out missed tasks)
        new_due = start_date + timedelta(days=i)
        task.due_date = new_due
        # Optionally, update week number (find the week number for new_due)
        task.week = new_due.isocalendar()[1]
        db.add(task)
    db.commit()
    return {"message": f"Rescheduled {len(missed_tasks)} missed tasks to future weeks."}

@app.post("/roadmap/ai-recalculate/{user_id}")
def ai_recalculate_roadmap(user_id: int, db: Session = Depends(get_db)):
    # Gather all skill paths for the user
    paths = db.query(SkillPathDB).filter_by(user_id=user_id).all()
    updated_count = 0
    for path in paths:
        # Load roadmap data
        try:
            data = pyjson.loads(str(path.data)) if path.data is not None else None
            if not data or not isinstance(data, dict) or "weeks" not in data or not isinstance(data["weeks"], list):
                continue
        except Exception:
            continue
        # Get all planner tasks for this path
        tasks = db.query(PlannerDB).filter_by(skill_path_id=path.id).all()
        completed = [t for t in tasks if t.status == "complete"]
        missed = [t for t in tasks if t.status != "complete" and t.due_date and t.due_date < date.today()]
        pending = [t for t in tasks if t.status != "complete" and (not t.due_date or t.due_date >= date.today())]
        # Prepare a summary for AI
        prompt = (
            f"The user is working on the skill path '{path.title}'. "
            f"Completed tasks: {len(completed)}. Missed tasks: {len(missed)}. Pending tasks: {len(pending)}. "
            f"Here are the pending and missed tasks: {[t.description for t in missed + pending]}. "
            "Please intelligently redistribute these tasks over the next weeks, compressing if the user is ahead or stretching if behind. "
            "Return a JSON list of weeks, each with a list of tasks."
        )
        messages = [
            {"role": "system", "content": "You are an expert learning coach."},
            {"role": "user", "content": prompt}
        ]
        try:
            content = call_groq(messages, model="llama-3.3-70b-versatile")
            weeks = parse_json_from_response(content)
            if not isinstance(weeks, list):
                continue
        except Exception:
            continue
        # Remove all non-complete tasks from planner
        for t in missed + pending:
            db.delete(t)
        db.commit()
        # Add new tasks from AI plan
        today = date.today()
        for i, week in enumerate(weeks):
            week_num = i + 1
            week_tasks = week if isinstance(week, list) else week.get("tasks", [])
            for j, desc in enumerate(week_tasks):
                due_date = today + timedelta(weeks=i, days=j)
                task = PlannerDB(
                    skill_path_id=path.id,
                    week=week_num,
                    description=desc,
                    due_date=due_date
                )
                db.add(task)
        db.commit()
        updated_count += 1
    return {"message": f"AI intelligently updated {updated_count} skill path(s) with a new roadmap."}

@app.get("/user/me")
def get_me(user: UserDB = Depends(get_current_user)):
    return {"id": user.id, "uid": user.uid, "email": user.email, "name": user.name}