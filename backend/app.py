from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime, timedelta
from dateutil.parser import parse
import os
from dotenv import load_dotenv
import requests
import json
import traceback
from sqlalchemy import create_engine, Column, Integer, String, JSON, Text, DateTime, Boolean, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import csv
from io import StringIO
from sqlalchemy_utils import database_exists, create_database
import datetime
import urllib.parse

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama3-70b-8192'  # You can change to another supported model if needed

# Database connection logic
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    db_name = os.getenv('DATABASE_NAME')
    db_user = os.getenv('DATABASE_USER')
    db_password = os.getenv('DATABASE_PASSWORD')
    db_host = os.getenv('DATABASE_HOST', 'localhost')
    db_port = os.getenv('DATABASE_PORT', '5432')
    if db_name and db_user and db_password:
        db_user_enc = urllib.parse.quote_plus(db_user)
        db_password_enc = urllib.parse.quote_plus(db_password)
        DATABASE_URL = f"postgresql://{db_user_enc}:{db_password_enc}@{db_host}:{db_port}/{db_name}"
    else:
        # Fallback to SQLite for development
        DATABASE_URL = "sqlite:///./mapmyroute.db"
        print("Using SQLite database for development. Set PostgreSQL environment variables for production.")

# Automatically create the database if it does not exist
if not database_exists(DATABASE_URL):
    create_database(DATABASE_URL)

engine = create_engine(DATABASE_URL)
Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class UserHistory(Base):
    __tablename__ = 'user_history'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    type = Column(String)
    input = Column(JSON)
    result = Column(JSON)

class UserChat(Base):
    __tablename__ = 'user_chat'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    message = Column(Text)
    response = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Roadmap(Base):
    __tablename__ = 'roadmap'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    topic = Column(String)
    current_level = Column(String)
    duration_weeks = Column(Integer)
    hours_per_week = Column(Integer)
    roadmap_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ResourceRecommendation(Base):
    __tablename__ = 'resource_recommendation'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    topic = Column(String)
    difficulty_level = Column(String)
    resources_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# New models for Progress Tracker & Planner
class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    due_date = Column(Date)
    priority = Column(String, default='medium')  # low, medium, high
    status = Column(String, default='pending')  # pending, in_progress, completed, overdue
    category = Column(String)  # study, practice, review, etc.
    estimated_hours = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Progress(Base):
    __tablename__ = 'progress'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    task_id = Column(Integer)
    completion_percentage = Column(Integer, default=0)
    notes = Column(Text)
    date = Column(Date, default=datetime.date.today)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# New models for User Account & Dashboard
class SkillPlan(Base):
    __tablename__ = 'skill_plans'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    skill_name = Column(String, nullable=False)
    description = Column(Text)
    current_level = Column(String, default='beginner')  # beginner, intermediate, advanced, expert
    target_level = Column(String, default='intermediate')
    total_hours_planned = Column(Integer, default=0)
    total_hours_spent = Column(Integer, default=0)
    status = Column(String, default='active')  # active, completed, paused, abandoned
    start_date = Column(Date, default=datetime.date.today)
    target_completion_date = Column(Date)
    roadmap_json = Column(JSON)  # Store the generated roadmap
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class UserProgress(Base):
    __tablename__ = 'user_progress'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    skill_plan_id = Column(Integer)
    date = Column(Date, default=datetime.date.today)
    hours_spent = Column(Integer, default=0)
    topics_covered = Column(JSON)  # List of topics covered
    notes = Column(Text)
    completion_percentage = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TimeTracking(Base):
    __tablename__ = 'time_tracking'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    skill_plan_id = Column(Integer)
    session_start = Column(DateTime)
    session_end = Column(DateTime)
    duration_minutes = Column(Integer)
    activity_type = Column(String)  # study, practice, review, project
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

def save_to_history(user_id, entry):
    db = SessionLocal()
    history = UserHistory(
        user_id=user_id,
        type=entry['type'],
        input=entry['input'],
        result=entry['result']
    )
    db.add(history)
    db.commit()
    db.close()

def save_chat(user_id, message, response):
    db = SessionLocal()
    chat = UserChat(
        user_id=user_id,
        message=message,
        response=response
    )
    db.add(chat)
    db.commit()
    db.close()

def save_roadmap(user_id, topic, current_level, duration_weeks, hours_per_week, roadmap_json):
    db = SessionLocal()
    roadmap = Roadmap(
        user_id=user_id,
        topic=topic,
        current_level=current_level,
        duration_weeks=duration_weeks,
        hours_per_week=hours_per_week,
        roadmap_json=roadmap_json
    )
    db.add(roadmap)
    db.commit()
    # --- Auto-generate tasks from roadmap_json ---
    start_date = datetime.date.today()
    for week in roadmap_json.get('weekly_plans', []):
        week_num = week.get('week', 1)
        week_start = start_date + datetime.timedelta(weeks=week_num-1)
        topics = week.get('topics', [])
        num_topics = len(topics)
        for i, topic_title in enumerate(topics):
            # Evenly distribute tasks across the week (Mon-Sun)
            day_offset = int(i * 7 / max(1, num_topics))
            due_date = week_start + datetime.timedelta(days=day_offset)
            task = Task(
                user_id=user_id,
                title=topic_title,
                description='; '.join(week.get('learning_objectives', [])),
                due_date=due_date,
                priority='medium',
                status='pending',
                category='roadmap',
                estimated_hours=week.get('estimated_hours', 1)
            )
            db.add(task)
    db.commit()
    db.close()

def save_resource_recommendation(user_id, topic, difficulty_level, resources_json):
    db = SessionLocal()
    rec = ResourceRecommendation(
        user_id=user_id,
        topic=topic,
        difficulty_level=difficulty_level,
        resources_json=resources_json
    )
    db.add(rec)
    db.commit()
    db.close()

# New functions for Progress Tracker & Planner
def create_task(user_id, task_data):
    db = SessionLocal()
    task = Task(
        user_id=user_id,
        title=task_data['title'],
        description=task_data.get('description', ''),
        due_date=parse(task_data['due_date']).date() if task_data.get('due_date') else None,
        priority=task_data.get('priority', 'medium'),
        status=task_data.get('status', 'pending'),
        category=task_data.get('category', ''),
        estimated_hours=task_data.get('estimated_hours', 1)
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    db.close()
    return task

def get_user_tasks(user_id, status=None, category=None):
    db = SessionLocal()
    query = db.query(Task).filter(Task.user_id == user_id)
    
    if status:
        query = query.filter(Task.status == status)
    if category:
        query = query.filter(Task.category == category)
    
    tasks = query.order_by(Task.due_date.asc(), Task.priority.desc()).all()
    db.close()
    return tasks

def update_task(task_id, user_id, update_data):
    db = SessionLocal()
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        db.close()
        return None
    
    for key, value in update_data.items():
        if hasattr(task, key):
            if key == 'due_date' and value:
                setattr(task, key, parse(value).date())
            else:
                setattr(task, key, value)
    
    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)
    db.close()
    return task

def delete_task(task_id, user_id):
    db = SessionLocal()
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if task:
        db.delete(task)
        db.commit()
        db.close()
        return True
    db.close()
    return False

def update_progress(user_id, task_id, completion_percentage, notes=None):
    db = SessionLocal()
    progress = Progress(
        user_id=user_id,
        task_id=task_id,
        completion_percentage=completion_percentage,
        notes=notes
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    db.close()
    return progress

def get_task_progress(user_id, task_id):
    db = SessionLocal()
    progress_entries = db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.task_id == task_id
    ).order_by(Progress.date.desc()).all()
    db.close()
    return progress_entries

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({'message': 'Hello from backend!'})

def call_groq(messages, max_tokens=1024, temperature=0.2):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set in the environment. Please add it to your .env file.")
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': GROQ_MODEL,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': temperature
    }
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
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

def generate_weekly_plan(topic, current_level, duration_weeks, hours_per_week):
    prompt = f"""
Create a detailed weekly learning plan for {topic} with the following parameters:
- Current level: {current_level}
- Duration: {duration_weeks} weeks
- Available time: {hours_per_week} hours per week

Format the response as a JSON with the following structure:
{{
    "weekly_plans": [
        {{
            "week": 1,
            "topics": [],
            "estimated_hours": 0,
            "learning_objectives": [],
            "practice_tasks": []
        }}
    ]
}}
"""
    try:
        messages = [
            {"role": "system", "content": "You are an expert learning path generator."},
            {"role": "user", "content": prompt}
        ]
        response_text = call_groq(messages)
        return parse_json_from_response(response_text)
    except Exception as e:
        print(f"Error generating plan: {str(e)}")
        print(traceback.format_exc())
        return {"error": "Failed to generate plan", "details": str(e)}

def get_resource_recommendations(topic, difficulty_level):
    prompt = f"""
Recommend learning resources for {topic} at {difficulty_level} level.
Include a mix of free and paid resources.
Format the response as a JSON with the following structure:
{{
    "video_tutorials": [
        {{"title": "", "platform": "", "url": "", "is_free": true, "difficulty": ""}}
    ],
    "online_courses": [
        {{"title": "", "platform": "", "url": "", "price": "", "difficulty": ""}}
    ],
    "articles": [
        {{"title": "", "source": "", "url": "", "reading_time": ""}}
    ],
    "tools": [
        {{"name": "", "description": "", "url": "", "type": "free/paid"}}
    ]
}}
"""
    try:
        messages = [
            {"role": "system", "content": "You are an expert learning resource recommender."},
            {"role": "user", "content": prompt}
        ]
        response_text = call_groq(messages)
        return parse_json_from_response(response_text)
    except Exception as e:
        print(f"Error generating recommendations: {str(e)}")
        print(traceback.format_exc())
        return {"error": "Failed to generate recommendations", "details": str(e)}

@app.route('/api/generate-roadmap', methods=['POST'])
def generate_roadmap():
    try:
        data = request.json
        required_fields = ['topic', 'currentLevel', 'durationWeeks', 'hoursPerWeek']
        if not all(field in data for field in required_fields):
            missing_fields = [field for field in required_fields if field not in data]
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        roadmap = generate_weekly_plan(
            data['topic'],
            data['currentLevel'],
            int(data['durationWeeks']),
            int(data['hoursPerWeek'])
        )
        if "error" in roadmap:
            return jsonify(roadmap), 500
        user_id = data.get('user_id', 'demo_user')
        save_to_history(user_id, {"type": "roadmap", "input": data, "result": roadmap})
        save_roadmap(user_id, data['topic'], data['currentLevel'], int(data['durationWeeks']), int(data['hoursPerWeek']), roadmap)
        return jsonify(roadmap)
    except Exception as e:
        print(f"Error in generate_roadmap: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route('/api/get-resources', methods=['POST'])
def get_resources():
    try:
        data = request.json
        required_fields = ['topic', 'difficultyLevel']
        if not all(field in data for field in required_fields):
            missing_fields = [field for field in required_fields if field not in data]
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        resources = get_resource_recommendations(
            data['topic'],
            data['difficultyLevel']
        )
        # Ensure all keys are present and are lists
        default_resources = {
            'video_tutorials': [],
            'online_courses': [],
            'articles': [],
            'tools': []
        }
        if not isinstance(resources, dict):
            resources = default_resources
        else:
            for key in default_resources:
                if key not in resources or not isinstance(resources[key], list):
                    resources[key] = []
        if "error" in resources:
            return jsonify(resources), 500
        user_id = data.get('user_id', 'demo_user')
        save_resource_recommendation(user_id, data['topic'], data['difficultyLevel'], resources)
        return jsonify(resources)
    except Exception as e:
        print(f"Error in get_resources: {str(e)}")
        print(traceback.format_exc())
        # Always return the default structure on error
        return jsonify({
            'video_tutorials': [],
            'online_courses': [],
            'articles': [],
            'tools': [],
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/update-roadmap', methods=['POST'])
def update_roadmap():
    try:
        data = request.json
        required_fields = ['currentWeek', 'completedTasks', 'newHoursPerWeek', 'topic', 'currentLevel']
        if not all(field in data for field in required_fields):
            missing_fields = [field for field in required_fields if field not in data]
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        remaining_weeks = max(1, int(data.get('totalWeeks', 12)) - int(data['currentWeek']))
        updated_plan = generate_weekly_plan(
            data['topic'],
            data['currentLevel'],
            remaining_weeks,
            int(data['newHoursPerWeek'])
        )
        if "error" in updated_plan:
            return jsonify(updated_plan), 500
        if len(data['completedTasks']) < data.get('expectedTasks', 0):
            prompt = f"""
Generate catch-up suggestions for incomplete tasks in {data['topic']} learning.
Format the response as a JSON object with this structure:
{{
    "catch_up_suggestions": [
        "suggestion1",
        "suggestion2"
    ]
}}
"""
            try:
                messages = [
                    {"role": "system", "content": "You are an expert learning coach."},
                    {"role": "user", "content": prompt}
                ]
                response_text = call_groq(messages)
                suggestions_data = parse_json_from_response(response_text)
                updated_plan['catch_up_suggestions'] = suggestions_data.get('catch_up_suggestions', [])
            except Exception as e:
                print(f"Error generating catch-up suggestions: {str(e)}")
                updated_plan['catch_up_suggestions'] = []
        user_id = data.get('user_id', 'demo_user')
        save_to_history(user_id, {"type": "update", "input": data, "result": updated_plan})
        save_roadmap(user_id, data['topic'], data['currentLevel'], remaining_weeks, int(data['newHoursPerWeek']), updated_plan)
        return jsonify(updated_plan)
    except Exception as e:
        print(f"Error in update_roadmap: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_id = data.get('user_id', 'demo_user')
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "Message is required"}), 400
        # Example: call_groq or other chat logic
        response_text = call_groq([{"role": "user", "content": message}])
        save_chat(user_id, message, response_text)
        return jsonify({"response": response_text})
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))
    search = request.args.get('search', '').strip()
    db = SessionLocal()
    q = db.query(UserHistory).filter(UserHistory.user_id == user_id)
    if search:
        q = q.filter(UserHistory.type.ilike(f'%{search}%'))
    history = q.order_by(UserHistory.id.desc()).offset(offset).limit(limit).all()
    db.close()
    return jsonify([
        {
            'type': h.type,
            'input': h.input,
            'result': h.result
        } for h in history
    ])

@app.route('/api/history/export', methods=['GET'])
def export_history():
    user_id = request.args.get('user_id')
    export_format = request.args.get('format', 'json')
    db = SessionLocal()
    history = db.query(UserHistory).filter(UserHistory.user_id == user_id).order_by(UserHistory.id.desc()).all()
    db.close()
    data = [
        {
            'type': h.type,
            'input': h.input,
            'result': h.result
        } for h in history
    ]
    if export_format == 'csv':
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(['type', 'input', 'result'])
        for item in data:
            writer.writerow([
                item['type'],
                json.dumps(item['input'], ensure_ascii=False),
                json.dumps(item['result'], ensure_ascii=False)
            ])
        output = si.getvalue()
        return Response(output, mimetype='text/csv', headers={"Content-Disposition": "attachment;filename=history.csv"})
    else:
        return jsonify(data)

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    user_id = request.args.get('user_id')
    db = SessionLocal()
    db.query(UserHistory).filter(UserHistory.user_id == user_id).delete()
    db.commit()
    db.close()
    return jsonify({'status': 'deleted'})

# New API endpoints for Progress Tracker & Planner
@app.route('/api/tasks', methods=['POST'])
def create_task_endpoint():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        task = create_task(user_id, data)
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
            'status': task.status,
            'category': task.category,
            'estimated_hours': task.estimated_hours,
            'created_at': task.created_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<user_id>', methods=['GET'])
def get_tasks_endpoint(user_id):
    try:
        status = request.args.get('status')
        category = request.args.get('category')
        
        tasks = get_user_tasks(user_id, status, category)
        return jsonify([{
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
            'status': task.status,
            'category': task.category,
            'estimated_hours': task.estimated_hours,
            'created_at': task.created_at.isoformat(),
            'updated_at': task.updated_at.isoformat()
        } for task in tasks]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task_endpoint(task_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        task = update_task(task_id, user_id, data)
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
            'status': task.status,
            'category': task.category,
            'estimated_hours': task.estimated_hours,
            'updated_at': task.updated_at.isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task_endpoint(task_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        success = delete_task(task_id, user_id)
        if not success:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress', methods=['POST'])
def update_progress_endpoint():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        task_id = data.get('task_id')
        completion_percentage = data.get('completion_percentage', 0)
        notes = data.get('notes')
        
        if not user_id or not task_id:
            return jsonify({'error': 'user_id and task_id are required'}), 400
        
        progress = update_progress(user_id, task_id, completion_percentage, notes)
        return jsonify({
            'id': progress.id,
            'task_id': progress.task_id,
            'completion_percentage': progress.completion_percentage,
            'notes': progress.notes,
            'date': progress.date.isoformat(),
            'created_at': progress.created_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress/<user_id>/<int:task_id>', methods=['GET'])
def get_progress_endpoint(user_id, task_id):
    try:
        progress_entries = get_task_progress(user_id, task_id)
        return jsonify([{
            'id': progress.id,
            'task_id': progress.task_id,
            'completion_percentage': progress.completion_percentage,
            'notes': progress.notes,
            'date': progress.date.isoformat(),
            'created_at': progress.created_at.isoformat()
        } for progress in progress_entries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New functions for User Account & Dashboard
def create_skill_plan(user_id, skill_data):
    db = SessionLocal()
    skill_plan = SkillPlan(
        user_id=user_id,
        skill_name=skill_data['skill_name'],
        description=skill_data.get('description', ''),
        current_level=skill_data.get('current_level', 'beginner'),
        target_level=skill_data.get('target_level', 'intermediate'),
        total_hours_planned=skill_data.get('total_hours_planned', 0),
        target_completion_date=parse(skill_data['target_completion_date']).date() if skill_data.get('target_completion_date') else None,
        roadmap_json=skill_data.get('roadmap_json', {})
    )
    db.add(skill_plan)
    db.commit()
    db.refresh(skill_plan)
    db.close()
    return skill_plan

def get_user_skill_plans(user_id, status=None):
    db = SessionLocal()
    query = db.query(SkillPlan).filter(SkillPlan.user_id == user_id)
    
    if status:
        query = query.filter(SkillPlan.status == status)
    
    skill_plans = query.order_by(SkillPlan.created_at.desc()).all()
    db.close()
    return skill_plans

def update_skill_plan(plan_id, user_id, update_data):
    db = SessionLocal()
    skill_plan = db.query(SkillPlan).filter(SkillPlan.id == plan_id, SkillPlan.user_id == user_id).first()
    if not skill_plan:
        db.close()
        return None
    
    for key, value in update_data.items():
        if hasattr(skill_plan, key):
            if key == 'target_completion_date' and value:
                setattr(skill_plan, key, parse(value).date())
            else:
                setattr(skill_plan, key, value)
    
    skill_plan.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(skill_plan)
    db.close()
    return skill_plan

def delete_skill_plan(plan_id, user_id):
    db = SessionLocal()
    skill_plan = db.query(SkillPlan).filter(SkillPlan.id == plan_id, SkillPlan.user_id == user_id).first()
    if skill_plan:
        db.delete(skill_plan)
        db.commit()
        db.close()
        return True
    db.close()
    return False

def add_progress_entry(user_id, skill_plan_id, progress_data):
    db = SessionLocal()
    progress = UserProgress(
        user_id=user_id,
        skill_plan_id=skill_plan_id,
        hours_spent=progress_data.get('hours_spent', 0),
        topics_covered=progress_data.get('topics_covered', []),
        notes=progress_data.get('notes', ''),
        completion_percentage=progress_data.get('completion_percentage', 0)
    )
    db.add(progress)
    
    # Update total hours spent in skill plan
    skill_plan = db.query(SkillPlan).filter(SkillPlan.id == skill_plan_id).first()
    if skill_plan:
        skill_plan.total_hours_spent += progress_data.get('hours_spent', 0)
        skill_plan.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(progress)
    db.close()
    return progress

def get_skill_progress(user_id, skill_plan_id):
    db = SessionLocal()
    progress_entries = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.skill_plan_id == skill_plan_id
    ).order_by(UserProgress.date.desc()).all()
    db.close()
    return progress_entries

def start_time_tracking(user_id, skill_plan_id, activity_type, notes=''):
    db = SessionLocal()
    time_tracking = TimeTracking(
        user_id=user_id,
        skill_plan_id=skill_plan_id,
        session_start=datetime.datetime.utcnow(),
        activity_type=activity_type,
        notes=notes
    )
    db.add(time_tracking)
    db.commit()
    db.refresh(time_tracking)
    db.close()
    return time_tracking

def end_time_tracking(tracking_id, user_id):
    db = SessionLocal()
    time_tracking = db.query(TimeTracking).filter(
        TimeTracking.id == tracking_id,
        TimeTracking.user_id == user_id
    ).first()
    
    if time_tracking and not time_tracking.session_end:
        time_tracking.session_end = datetime.datetime.utcnow()
        time_tracking.duration_minutes = int((time_tracking.session_end - time_tracking.session_start).total_seconds() / 60)
        db.commit()
        db.refresh(time_tracking)
        db.close()
        return time_tracking
    
    db.close()
    return None

def get_time_tracking_summary(user_id, skill_plan_id=None):
    db = SessionLocal()
    query = db.query(TimeTracking).filter(TimeTracking.user_id == user_id)
    
    if skill_plan_id:
        query = query.filter(TimeTracking.skill_plan_id == skill_plan_id)
    
    time_entries = query.order_by(TimeTracking.session_start.desc()).all()
    db.close()
    return time_entries

def get_dashboard_stats(user_id):
    db = SessionLocal()
    
    # Get skill plans stats
    total_plans = db.query(SkillPlan).filter(SkillPlan.user_id == user_id).count()
    active_plans = db.query(SkillPlan).filter(SkillPlan.user_id == user_id, SkillPlan.status == 'active').count()
    completed_plans = db.query(SkillPlan).filter(SkillPlan.user_id == user_id, SkillPlan.status == 'completed').count()
    
    # Get total time spent
    total_time_entries = db.query(TimeTracking).filter(
        TimeTracking.user_id == user_id,
        TimeTracking.session_end.isnot(None)
    ).all()
    total_minutes = sum(entry.duration_minutes for entry in total_time_entries)
    total_hours = total_minutes / 60
    
    # Get recent progress
    recent_progress = db.query(UserProgress).filter(
        UserProgress.user_id == user_id
    ).order_by(UserProgress.date.desc()).limit(5).all()
    
    db.close()
    
    return {
        'total_plans': total_plans,
        'active_plans': active_plans,
        'completed_plans': completed_plans,
        'total_hours_spent': round(total_hours, 2),
        'recent_progress': recent_progress
    }

# New API endpoints for User Account & Dashboard
@app.route('/api/dashboard/<user_id>', methods=['GET'])
def get_dashboard_endpoint(user_id):
    try:
        stats = get_dashboard_stats(user_id)
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skill-plans', methods=['POST'])
def create_skill_plan_endpoint():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        skill_plan = create_skill_plan(user_id, data)
        return jsonify({
            'id': skill_plan.id,
            'skill_name': skill_plan.skill_name,
            'description': skill_plan.description,
            'current_level': skill_plan.current_level,
            'target_level': skill_plan.target_level,
            'total_hours_planned': skill_plan.total_hours_planned,
            'total_hours_spent': skill_plan.total_hours_spent,
            'status': skill_plan.status,
            'start_date': skill_plan.start_date.isoformat(),
            'target_completion_date': skill_plan.target_completion_date.isoformat() if skill_plan.target_completion_date else None,
            'roadmap_json': skill_plan.roadmap_json,
            'created_at': skill_plan.created_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skill-plans/<user_id>', methods=['GET'])
def get_skill_plans_endpoint(user_id):
    try:
        status = request.args.get('status')
        skill_plans = get_user_skill_plans(user_id, status)
        return jsonify([{
            'id': plan.id,
            'skill_name': plan.skill_name,
            'description': plan.description,
            'current_level': plan.current_level,
            'target_level': plan.target_level,
            'total_hours_planned': plan.total_hours_planned,
            'total_hours_spent': plan.total_hours_spent,
            'status': plan.status,
            'start_date': plan.start_date.isoformat(),
            'target_completion_date': plan.target_completion_date.isoformat() if plan.target_completion_date else None,
            'roadmap_json': plan.roadmap_json,
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat()
        } for plan in skill_plans]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skill-plans/<int:plan_id>', methods=['PUT'])
def update_skill_plan_endpoint(plan_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        skill_plan = update_skill_plan(plan_id, user_id, data)
        if not skill_plan:
            return jsonify({'error': 'Skill plan not found'}), 404
        
        return jsonify({
            'id': skill_plan.id,
            'skill_name': skill_plan.skill_name,
            'description': skill_plan.description,
            'current_level': skill_plan.current_level,
            'target_level': skill_plan.target_level,
            'total_hours_planned': skill_plan.total_hours_planned,
            'total_hours_spent': skill_plan.total_hours_spent,
            'status': skill_plan.status,
            'start_date': skill_plan.start_date.isoformat(),
            'target_completion_date': skill_plan.target_completion_date.isoformat() if skill_plan.target_completion_date else None,
            'roadmap_json': skill_plan.roadmap_json,
            'updated_at': skill_plan.updated_at.isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/skill-plans/<int:plan_id>', methods=['DELETE'])
def delete_skill_plan_endpoint(plan_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        success = delete_skill_plan(plan_id, user_id)
        if not success:
            return jsonify({'error': 'Skill plan not found'}), 404
        
        return jsonify({'message': 'Skill plan deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress-entry', methods=['POST'])
def add_progress_entry_endpoint():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        skill_plan_id = data.get('skill_plan_id')
        if not user_id or not skill_plan_id:
            return jsonify({'error': 'user_id and skill_plan_id are required'}), 400
        
        progress = add_progress_entry(user_id, skill_plan_id, data)
        return jsonify({
            'id': progress.id,
            'skill_plan_id': progress.skill_plan_id,
            'hours_spent': progress.hours_spent,
            'topics_covered': progress.topics_covered,
            'notes': progress.notes,
            'completion_percentage': progress.completion_percentage,
            'date': progress.date.isoformat(),
            'created_at': progress.created_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress/<user_id>/<int:skill_plan_id>', methods=['GET'])
def get_skill_progress_endpoint(user_id, skill_plan_id):
    try:
        progress_entries = get_skill_progress(user_id, skill_plan_id)
        return jsonify([{
            'id': progress.id,
            'skill_plan_id': progress.skill_plan_id,
            'hours_spent': progress.hours_spent,
            'topics_covered': progress.topics_covered,
            'notes': progress.notes,
            'completion_percentage': progress.completion_percentage,
            'date': progress.date.isoformat(),
            'created_at': progress.created_at.isoformat()
        } for progress in progress_entries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/time-tracking/start', methods=['POST'])
def start_time_tracking_endpoint():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        skill_plan_id = data.get('skill_plan_id')
        activity_type = data.get('activity_type', 'study')
        notes = data.get('notes', '')
        
        if not user_id or not skill_plan_id:
            return jsonify({'error': 'user_id and skill_plan_id are required'}), 400
        
        time_tracking = start_time_tracking(user_id, skill_plan_id, activity_type, notes)
        return jsonify({
            'id': time_tracking.id,
            'skill_plan_id': time_tracking.skill_plan_id,
            'session_start': time_tracking.session_start.isoformat(),
            'activity_type': time_tracking.activity_type,
            'notes': time_tracking.notes
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/time-tracking/<int:tracking_id>/end', methods=['PUT'])
def end_time_tracking_endpoint(tracking_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        time_tracking = end_time_tracking(tracking_id, user_id)
        if not time_tracking:
            return jsonify({'error': 'Time tracking session not found or already ended'}), 404
        
        return jsonify({
            'id': time_tracking.id,
            'skill_plan_id': time_tracking.skill_plan_id,
            'session_start': time_tracking.session_start.isoformat(),
            'session_end': time_tracking.session_end.isoformat(),
            'duration_minutes': time_tracking.duration_minutes,
            'activity_type': time_tracking.activity_type,
            'notes': time_tracking.notes
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/time-tracking/<user_id>', methods=['GET'])
def get_time_tracking_endpoint(user_id):
    try:
        skill_plan_id = request.args.get('skill_plan_id')
        time_entries = get_time_tracking_summary(user_id, skill_plan_id)
        return jsonify([{
            'id': entry.id,
            'skill_plan_id': entry.skill_plan_id,
            'session_start': entry.session_start.isoformat(),
            'session_end': entry.session_end.isoformat() if entry.session_end else None,
            'duration_minutes': entry.duration_minutes,
            'activity_type': entry.activity_type,
            'notes': entry.notes,
            'created_at': entry.created_at.isoformat()
        } for entry in time_entries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY is not set in your environment. Please add it to your .env file.")
        exit(1)
    app.run(debug=True)