-- SQLite Database Schema for MapMyRoute

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid VARCHAR(128) UNIQUE, -- Firebase UID (nullable for email/password users)
    email VARCHAR(256) UNIQUE NOT NULL,
    password_hash TEXT, -- For email/password users
    name VARCHAR(256),
    picture TEXT
);

-- Skill Paths table
CREATE TABLE IF NOT EXISTS skill_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(256) NOT NULL,
    description TEXT,
    data TEXT, -- JSON string of roadmap weeks/goals
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'current',
    started_on DATE DEFAULT CURRENT_DATE
);

-- Planner table (weekly tasks)
CREATE TABLE IF NOT EXISTS planner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_path_id INTEGER REFERENCES skill_paths(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- pending, complete, deferred
    due_date DATE,
    rescheduled_to DATE -- new column for rescheduling
);

-- quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- questions table
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER REFERENCES quizzes(id),
    question_text TEXT,
    options TEXT, -- JSON string (SQLite doesn't have native JSON type)
    correct_option TEXT,
    correct_option_index INTEGER,
    skill_tag VARCHAR(100) -- for personalization
);

-- user_quiz_attempts table
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    quiz_id INTEGER REFERENCES quizzes(id),
    answers TEXT, -- JSON string (SQLite doesn't have native JSON type)
    score INTEGER,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_skills TEXT DEFAULT '[]', -- JSON string for array of skill tags
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
