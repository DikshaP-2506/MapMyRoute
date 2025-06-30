-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(128) UNIQUE, -- Firebase UID (nullable for email/password users)
    email VARCHAR(256) UNIQUE NOT NULL,
    password_hash TEXT, -- For email/password users
    name VARCHAR(256),
    picture TEXT
);

-- Skill Paths table
CREATE TABLE IF NOT EXISTS skill_paths (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    skill_path_id INTEGER REFERENCES skill_paths(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- pending, complete, deferred
    due_date DATE,
    rescheduled_to DATE -- new column for rescheduling
);

-- quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id),
    question_text TEXT,
    options JSONB, -- e.g. ["A", "B", "C", "D"]
    correct_option VARCHAR(10),
    skill_tag VARCHAR(100) -- for personalization
);

-- user_quiz_attempts table
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    quiz_id INTEGER REFERENCES quizzes(id),
    answers JSONB, -- e.g. {"1": "A", "2": "C"}
    score INTEGER,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);