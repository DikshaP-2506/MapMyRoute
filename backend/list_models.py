import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_AI_STUDIO_KEY'))

models = genai.list_models()
for m in models:
    print(f"Model: {m.name}") 