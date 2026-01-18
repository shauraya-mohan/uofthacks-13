from typing import TypedDict, Annotated, Sequence, List, Optional, Any, Dict
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    """
    Shared state that persists across the multi-agent workflow.
    """
    # Chat history
    messages: Annotated[Sequence[BaseMessage], operator.add]
    
    # Structured intent extracted by the Analyst
    # This acts as the "handover" document from Analyst to Specialist
    search_plan: Optional[str] 
    
    # Results found by the Specialist
    matching_ids: List[str]
    
    # Final response
    final_response: str
    
    # Trace of which agents have run
    trace: List[str]
