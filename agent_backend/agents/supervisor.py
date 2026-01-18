from langchain_core.messages import AIMessage
from state import AgentState
import json

def supervisor_node(state: AgentState):
    """
    Agent 3: Supervisor (Synthesizer)
    Aggregates the results from the search_specialist and provides final response.
    """
    # The search_specialist already populated matching_ids in state
    matching_ids = state.get("matching_ids", [])
    
    search_plan_str = state.get("search_plan")
    search_plan = json.loads(search_plan_str) if search_plan_str else {}
    
    print(f"[SUPERVISOR] Received {len(matching_ids)} matching IDs from search_specialist")
    
    summary = f"Found {len(matching_ids)} reports."
    if not matching_ids:
        summary = f"No reports matched your criteria ({search_plan.get('semantic_query')})."
        
    return {
        "matching_ids": matching_ids,
        "final_response": summary,
        "reasoning": search_plan.get("reasoning", ""),
        "trace": state.get("trace", []) + ["supervisor"]
    }

