"""
LangGraph Multi-Agent System for Accessibility Search.
Agents:
1. Intent Analyst: Understands user query and defines a plan.
2. Search Specialist: Executes search tools based on the plan.
3. Supervisor: Aggregates results and provides final response.
"""

import os
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

# Import the shared state
from state import AgentState

# Import tool definitions
from tools import ALL_TOOLS

# Import agent nodes
from agents.intent_analyst import intent_analyst_node
from agents.search_specialist import search_specialist_node
from agents.supervisor import supervisor_node

# Load environment variables
load_dotenv()


def create_multi_agent_graph():
    """Create the multi-agent workflow graph."""
    
    workflow = StateGraph(AgentState)
    
    # 1. Add Nodes
    workflow.add_node("intent_analyst", intent_analyst_node)
    workflow.add_node("search_specialist", search_specialist_node)
    workflow.add_node("tools", ToolNode(ALL_TOOLS))
    workflow.add_node("supervisor", supervisor_node)
    
    # 2. Add Edges
    
    # Entry -> Intent Analyst
    workflow.set_entry_point("intent_analyst")
    
    # Intent Analyst -> Search Specialist
    workflow.add_edge("intent_analyst", "search_specialist")
    
    # Search Specialist -> Tools (conditional) or Supervisor
    def route_search_specialist(state: AgentState):
        messages = state['messages']
        last_message = messages[-1]
        
        # If the specialist made tool calls, go to tools
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        
        # Otherwise, if no tools needed (e.g. conversational), go straight to supervisor
        return "supervisor"
    
    workflow.add_conditional_edges(
        "search_specialist", 
        route_search_specialist, 
        {
            "tools": "tools",
            "supervisor": "supervisor"
        }
    )
    
    # Tools -> Supervisor
    # (We assume single-turn tool execution for simplicity in this architecture, 
    # but could loop back to specialist if needed for multi-hop)
    workflow.add_edge("tools", "supervisor")
    
    # Supervisor -> End
    workflow.add_edge("supervisor", END)
    
    return workflow.compile()


# Singleton agent instance
_agent = None


def get_agent():
    """Get or create the agent (singleton)."""
    global _agent
    if _agent is None:
        _agent = create_multi_agent_graph()
    return _agent


async def run_search(query: str) -> Dict[str, Any]:
    """
    Run a search query through the multi-agent system.
    """
    agent = get_agent()
    
    # Create initial state
    initial_state = {
        "messages": [HumanMessage(content=query)],
        "matching_ids": [],
        "search_plan": None,
        "reasoning": "",
        "trace": []
    }
    
    # Run the graph
    final_state = await agent.ainvoke(initial_state)
    
    # Extract results
    matching_ids = final_state.get("matching_ids", [])
    summary = final_state.get("final_response", "")
    reasoning = final_state.get("reasoning", "")
    trace = final_state.get("trace", [])
    
    print(f"[TRACE] Execution path: {trace}")
    
    return {
        "matchingIds": matching_ids,
        "summary": summary,
        "reasoning": reasoning,
        "totalReports": len(matching_ids),
        "matchCount": len(matching_ids),
        "trace": trace
    }

