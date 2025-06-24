from sqlalchemy import Column, Integer, String, JSON, Text, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime
import os
from dotenv import load_dotenv
import urllib.parse

Base = declarative_base()

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

# Example raw SQL for PostgreSQL (for reference/documentation)
POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR,
    type VARCHAR,
    input JSON,
    result JSON
);
CREATE TABLE IF NOT EXISTS user_chat (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR,
    message TEXT,
    response TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS roadmap (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR,
    topic VARCHAR,
    current_level VARCHAR,
    duration_weeks INTEGER,
    hours_per_week INTEGER,
    roadmap_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS resource_recommendation (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR,
    topic VARCHAR,
    difficulty_level VARCHAR,
    resources_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

if __name__ == "__main__":
    load_dotenv()
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
            raise RuntimeError("Database configuration is incomplete.")
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for stmt in POSTGRES_SCHEMA.strip().split(';'):
            if stmt.strip():
                conn.execute(stmt)
        conn.commit()
    print("All tables created (SQLAlchemy + PostgreSQL schema).")
