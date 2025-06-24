from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime, timedelta
from dateutil.parser import parse
import os
from dotenv import load_dotenv
import requests
import json
import traceback
from sqlalchemy import create_engine, Column, Integer, String, JSON, Text, DateTime
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
        raise RuntimeError("Database configuration is incomplete. Please set DATABASE_URL or all individual DB vars.")

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

if __name__ == '__main__':
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY is not set in your environment. Please add it to your .env file.")
        exit(1)
    app.run(debug=True)