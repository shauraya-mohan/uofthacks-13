"""
LangGraph agent for semantic search with tool use.
Uses ReAct pattern: Reason → Act → Observe → Repeat until done.
"""

import os
from typing import List, Dict, Any, Annotated, TypedDict, Sequence
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

from tools import ALL_TOOLS

# Load environment variables
load_dotenv()


class AgentState(TypedDict):
    """State that persists across agent steps."""
    messages: Annotated[Sequence[BaseMessage], "The conversation history"]
    matching_ids: List[str]  # Accumulated matching report IDs
    reasoning: str  # Agent's reasoning explanation


def get_llm() -> ChatGoogleGenerativeAI:
    """Get the Gemini LLM for agent reasoning."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0.1,  # Low temperature for consistent tool use
    )


def create_agent():
    """Create the LangGraph agent with tools."""
    
    llm = get_llm()
    llm_with_tools = llm.bind_tools(ALL_TOOLS)
    
    # System prompt for the agent
    system_prompt = """You are an accessibility report search assistant. Your job is to help users find relevant accessibility barrier reports.

You have access to these tools:
1. vector_search - Semantic search using natural language. Use this as your PRIMARY search method.
2. filter_by_category - Filter by barrier type (broken_sidewalk, missing_ramp, blocked_path, etc.)
3. filter_by_severity - Filter by severity level (low, medium, high)
4. filter_by_status - Filter by resolution status (draft, open, acknowledged, in_progress, resolved)
5. filter_by_location - Filter by geographic location (requires lat, lng, radius)
6. get_report_stats - Get aggregate statistics about all reports

STRATEGY:
1. Start with vector_search for semantic understanding of the query
2. Apply additional filters ONLY if the user explicitly mentions category, severity, status, or location
3. When combining results from multiple tools, take the INTERSECTION (reports that match ALL criteria)

IMPORTANT:
- Always use vector_search first for any content-based query
- Be concise in your reasoning
- Return results quickly - accuracy and speed are both important"""

    def should_continue(state: AgentState) -> str:
        """Determine if we should continue or end."""
        messages = state["messages"]
        last_message = messages[-1]
        
        # If the LLM made tool calls, continue to tools
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        
        # Otherwise, end
        return END
    
    def call_model(state: AgentState) -> Dict[str, Any]:
        """Call the LLM to decide next action."""
        messages = state["messages"]
        
        # Add system prompt to first message if not present
        if not any(getattr(m, 'type', '') == 'system' for m in messages):
            from langchain_core.messages import SystemMessage
            messages = [SystemMessage(content=system_prompt)] + list(messages)
        
        response = llm_with_tools.invoke(messages)
        
        return {"messages": [response]}
    
    def process_tool_results(state: AgentState) -> Dict[str, Any]:
        """Process tool results and update matching_ids."""
        messages = state["messages"]
        matching_ids = state.get("matching_ids", [])
        
        # Find the last tool message
        for msg in reversed(messages):
            if isinstance(msg, ToolMessage):
                try:
                    import json
                    result = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                    
                    if isinstance(result, dict) and "matching_ids" in result:
                        new_ids = result["matching_ids"]
                        
                        if not matching_ids:
                            # First tool result - use as base
                            matching_ids = new_ids
                        else:
                            # Intersection with previous results
                            matching_ids = [id for id in matching_ids if id in new_ids]
                except:
                    pass
                break
        
        return {"matching_ids": matching_ids}
    
    # Build the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", ToolNode(ALL_TOOLS))
    workflow.add_node("process", process_tool_results)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add edges
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    workflow.add_edge("tools", "process")
    workflow.add_edge("process", "agent")
    
    return workflow.compile()


# Singleton agent instance
_agent = None


def get_agent():
    """Get or create the agent (singleton)."""
    global _agent
    if _agent is None:
        _agent = create_agent()
    return _agent


async def run_search(query: str) -> Dict[str, Any]:
    """
    Run a search query through the agent.
    
    Args:
        query: Natural language search query
    
    Returns:
        Dictionary with matchingIds, summary, reasoning, etc.
    """
    agent = get_agent()
    
    # Create initial state
    initial_state = {
        "messages": [HumanMessage(content=query)],
        "matching_ids": [],
        "reasoning": "",
    }
    
    # Run the agent
    final_state = await agent.ainvoke(initial_state)
    
    # Extract results
    matching_ids = final_state.get("matching_ids", [])
    
    # Get the agent's final message for reasoning
    messages = final_state.get("messages", [])
    reasoning = ""
    summary = ""
    
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            reasoning = msg.content
            break
    
    # Generate summary
    if not matching_ids:
        summary = f"No reports found matching \"{query}\". Try different search terms."
    else:
        summary = f"Found {len(matching_ids)} reports matching your search."
    
    return {
        "matchingIds": matching_ids,
        "summary": summary,
        "reasoning": reasoning,
        "totalReports": len(matching_ids),
        "matchCount": len(matching_ids),
    }
