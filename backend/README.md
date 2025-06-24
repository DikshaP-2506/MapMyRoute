# MapMyRoute Backend

A Flask-based backend API for MapMyRoute, an AI-powered skill roadmap generator and learning resource recommender.

## Features

1. **AI-Powered Skill Roadmap Generator**
   - Generates customized weekly learning plans
   - Takes into account user's current level and time availability
   - Provides structured learning objectives and practice tasks

2. **Curated Resource Recommendations**
   - AI-curated learning resources (videos, articles, courses, tools)
   - Mix of free and paid options
   - Filtered by relevance and difficulty level

3. **Adaptive Roadmap Updates**
   - Recalculates roadmap based on progress and changes in availability
   - Provides catch-up suggestions for missed tasks

## Setup

1. Go to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Groq API key:
   ```
   GROQ_API_KEY=your-groq-api-key-here
   ```

4. Run the application:
   ```bash
   python app.py
   ```

## API Endpoints

### 1. Generate Roadmap
```
POST /api/generate-roadmap
```
Request body:
```json
{
    "topic": "Python Programming",
    "currentLevel": "beginner",
    "durationWeeks": 12,
    "hoursPerWeek": 10
}
```

### 2. Get Resource Recommendations
```
POST /api/get-resources
```
Request body:
```json
{
    "topic": "Python Programming",
    "difficultyLevel": "beginner"
}
```

### 3. Update Roadmap
```
POST /api/update-roadmap
```
Request body:
```json
{
    "currentWeek": 3,
    "completedTasks": ["task1", "task2"],
    "newHoursPerWeek": 8,
    "topic": "Python Programming",
    "currentLevel": "beginner",
    "totalWeeks": 12,
    "expectedTasks": 5
}
```

## Response Formats

### Roadmap Response
```json
{
    "weekly_plans": [
        {
            "week": 1,
            "topics": ["Introduction to Variables", "Basic Data Types"],
            "estimated_hours": 10,
            "learning_objectives": ["Understand variables", "Learn basic data types"],
            "practice_tasks": ["Create simple programs using variables"]
        }
    ]
}
```

### Resources Response
```json
{
    "video_tutorials": [
        {
            "title": "Python Basics",
            "platform": "YouTube",
            "url": "https://example.com",
            "is_free": true,
            "difficulty": "beginner"
        }
    ],
    "online_courses": [...],
    "articles": [...],
    "tools": [...]
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages in case of failures:
- 400: Bad Request (Missing or invalid parameters)
- 500: Internal Server Error (Processing errors)

## Notes

- Uses Groq's Llama 3 model through the Groq API
- The API uses CORS to allow cross-origin requests
- All responses are in JSON format