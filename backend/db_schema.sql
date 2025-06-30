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