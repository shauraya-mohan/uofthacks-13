from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
print(f"Key present: {bool(api_key)}")

models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]

for model in models:
    print(f"\n--- Testing {model} ---")
    try:
        llm = ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
        res = llm.invoke([HumanMessage(content="Hello")])
        print(f"Success! Content: {res.content}")
    except Exception as e:
        print(f"Failed: {e}")
