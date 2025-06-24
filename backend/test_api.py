import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_generate_roadmap():
    print("\n1. Testing Initial Roadmap Generation:")
    print("-------------------------------------")
    data = {
        "topic": "Python Programming",
        "currentLevel": "beginner",
        "durationWeeks": 4,
        "hoursPerWeek": 10
    }
    response = requests.post(f"{BASE_URL}/api/generate-roadmap", json=data)
    print("Response:", json.dumps(response.json(), indent=2))

def test_get_resources():
    print("\n2. Testing Resource Recommendations:")
    print("----------------------------------")
    data = {
        "topic": "Python Programming",
        "difficultyLevel": "beginner"
    }
    response = requests.post(f"{BASE_URL}/api/get-resources", json=data)
    print("Response:", json.dumps(response.json(), indent=2))

def test_update_roadmap():
    print("\n3. Testing Roadmap Update (with missed tasks):")
    print("-------------------------------------------")
    data = {
        "currentWeek": 2,
        "completedTasks": ["Learn variables", "Basic data types"],
        "newHoursPerWeek": 8,
        "topic": "Python Programming",
        "currentLevel": "beginner",
        "totalWeeks": 4,
        "expectedTasks": 5
    }
    response = requests.post(f"{BASE_URL}/api/update-roadmap", json=data)
    print("Response:", json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Testing MapMyRoute API...")
    test_generate_roadmap()
    test_get_resources()
    test_update_roadmap() 