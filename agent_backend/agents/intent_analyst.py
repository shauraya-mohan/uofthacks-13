from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from state import AgentState
import os
import json

def get_llm():
    api_key = os.getenv('GEMINI_API_KEY')
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0,
    )

def intent_analyst_node(state: AgentState):
    """
    Agent 1: Intent Analyst
    Analyzes the user's latest message to understand what they are looking for.
    Produces a 'search_plan' which is a structured description of the search.
    """
    messages = state['messages']
    last_message = messages[-1].content
    
    llm = get_llm()
    
    system_prompt = """You are an expert Accessibility Search Analyst.
Your goal is to understand the user's intent and create a clear, actionable SEARCH PLAN for the executor.

You DO NOT execute the search. You INITIALIZE the search by defining:
1. The Core Query: What is the semantic meaning? (e.g. "steep ramp" -> "issues related to ramp gradients")
2. Filters: Are there specific constraints? (severity, category, status)
3. Strategy: Should we prioritize keyword matches or semantic meaning?

Output your plan as a JSON object with these keys:
- "semantic_query": The best natural language query to find this.
- "filters": { "severity": "...", "category": "...", "status": "..." } (or null if none)
- "reasoning": A brief explanation of why you interpreted it this way.
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])
    
    chain = prompt | llm
    
    response = chain.invoke({"input": last_message})
    
    # Try to parse JSON, fallback to raw text if needed (though instruction ensures JSON)
    try:
        # Extract JSON from potential markdown blocks
        content = response.content.replace('```json', '').replace('```', '').strip()
        plan = json.loads(content)
        # Store as stringified JSON for the state
        search_plan = json.dumps(plan)
    except:
        # Fallback
        search_plan = json.dumps({
            "semantic_query": last_message,
            "filters": {},
            "reasoning": "Could not parse structured plan, passing raw query."
        })
    
    return {
        "search_plan": search_plan,
        "trace": ["intent_analyst"]
    }
