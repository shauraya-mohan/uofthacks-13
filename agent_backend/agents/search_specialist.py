from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.prebuilt import ToolNode
from tools import ALL_TOOLS
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

def search_specialist_node(state: AgentState):
    """
    Agent 2: Search Specialist
    Takes the 'search_plan' from the Analyst and executes tools to find results.
    """
    search_plan_str = state.get("search_plan")
    if not search_plan_str:
        return {"matching_ids": []}
        
    search_plan = json.loads(search_plan_str)
    query = search_plan.get("semantic_query", "")
    filters = search_plan.get("filters", {})
    
    llm = get_llm()
    llm_with_tools = llm.bind_tools(ALL_TOOLS)
    
    system_prompt = f"""You are the Search Executor.
You have received a search plan from the Analyst:
QUERY: {query}
FILTERS: {filters}
REASONING: {search_plan.get("reasoning")}

Your job is to EXECUTE this plan using your tools.
1. Always start with `vector_search` using the semantic query.
2. If filters are provided, apply `filter_by_*` tools.
3. If the user asked for stats, use `get_report_stats`.

Execute the necessary tools. The results will be processed by the workflow.
"""

    response = llm_with_tools.invoke([SystemMessage(content=system_prompt)])
    
    # We return the "agent" message which might have tool_calls
    return {
        "messages": [response],
        "trace": ["search_specialist"]
    }
