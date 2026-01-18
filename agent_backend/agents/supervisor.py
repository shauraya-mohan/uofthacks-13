from langchain_core.messages import AIMessage
from state import AgentState
import json

def supervisor_node(state: AgentState):
    """
    Agent 3: Supervisor (Synthesizer)
    Aggregates the results from the tools and the original intent to provide the final answer.
    """
    messages = state['messages']
    
    # Check for tool outputs in history
    # In LangGraph, tool outputs are appended to messages
    
    # We need to extract the matching IDs from the tool outputs
    tool_outputs = []
    matching_ids = []
    
    for msg in reversed(messages):
        if msg.type == 'tool':
            try:
                content = json.loads(msg.content)
                if isinstance(content, dict):
                    if "matching_ids" in content:
                        # Prioritize intersection if we have multiple filters, 
                        # but for now let's just union or take the latest for simplicity
                        # or better, let's accumulate them.
                        # The single-agent logic took the intersection.
                        # Let's try to find the intersection of all non-empty lists provided by tools
                        pass
                    
                    tool_outputs.append(content)
            except:
                pass
    
    # Intersection logic for matching_ids
    # We look at all tool outputs that returned 'matching_ids'
    candidate_lists = []
    for output in tool_outputs:
        if "matching_ids" in output and output["matching_ids"]:
            candidate_lists.append(set(output["matching_ids"]))
            
    if candidate_lists:
        # Intersection of all sets
        final_set = set.intersection(*candidate_lists)
        matching_ids = list(final_set)
    else:
        matching_ids = []
        
    search_plan_str = state.get("search_plan")
    search_plan = json.loads(search_plan_str) if search_plan_str else {}
    
    summary = f"Found {len(matching_ids)} reports."
    if not matching_ids:
        summary = f"No reports matched your criteria ({search_plan.get('semantic_query')})."
        
    return {
        "matching_ids": matching_ids,
        "final_response": summary,
        "reasoning": search_plan.get("reasoning", ""),
        "trace": ["supervisor"]
    }
