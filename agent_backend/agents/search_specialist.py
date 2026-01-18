from langchain_core.messages import ToolMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from tools import vector_search, filter_by_severity, filter_by_category, filter_by_status
from db import get_all_reports
from state import AgentState
import json
import os

def get_llm():
    api_key = os.getenv('GEMINI_API_KEY')
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0,
    )

async def search_specialist_node(state: AgentState):
    """
    Agent 2: Search Specialist
    TWO-STAGE SEARCH:
    1. Vector search finds candidates
    2. LLM filters for true relevance
    """
    search_plan_str = state.get("search_plan")
    if not search_plan_str:
        return {"matching_ids": []}
        
    search_plan = json.loads(search_plan_str)
    query = search_plan.get("semantic_query", "")
    filters = search_plan.get("filters", {})
    
    print(f"[SEARCH_SPECIALIST] Query: {query}")
    print(f"[SEARCH_SPECIALIST] Filters: {filters}")
    
    # STAGE 1: Vector search gets candidates (lowered threshold to 0.4 to get more candidates)
    vector_result = await vector_search.ainvoke({"query": query, "top_k": 20})
    candidate_ids = vector_result.get("matching_ids", [])
    scores = vector_result.get("scores", {})
    
    print(f"[SEARCH_SPECIALIST] Stage 1: Vector search found {len(candidate_ids)} candidates")
    
    if not candidate_ids:
        return {
            "messages": [],
            "matching_ids": [],
            "trace": state.get("trace", []) + ["search_specialist"]
        }
    
    # STAGE 2: LLM filters for true relevance
    all_reports = get_all_reports()
    report_map = {r['_id']: r for r in all_reports}
    
    # Build candidate summaries for LLM review
    candidate_summaries = []
    for report_id in candidate_ids[:10]:  # Only review top 10 to save API costs
        if report_id in report_map:
            report = report_map[report_id]
            content = report.get('content', {})
            title = content.get('title', 'Untitled')
            description = content.get('description', '')[:200]  # First 200 chars
            category = content.get('category', 'other').replace('_', ' ')
            candidate_summaries.append(f"ID: {report_id}\nTitle: {title}\nCategory: {category}\nDescription: {description}\n")
    
    # Ask LLM to filter
    llm = get_llm()
    filter_prompt = f"""You are reviewing search results for the query: "{query}"

Here are the candidate reports:

{chr(10).join(candidate_summaries)}

Your task: Return ONLY the IDs of reports that are TRULY relevant to the query.
- Be strict: only include reports that directly match what the user is looking for
- If a report is only tangentially related, exclude it
- If NONE match well, return an empty list

Respond with ONLY a JSON array of matching IDs, nothing else.
Example: ["696c5deb08aa365a8dec4e8d", "696c3ecc57189c8b98c03fa3"]
"""
    
    try:
        response = llm.invoke(filter_prompt)
        filtered_ids = json.loads(response.content.replace('```json', '').replace('```', '').strip())
        print(f"[SEARCH_SPECIALIST] Stage 2: LLM filtered to {len(filtered_ids)} truly relevant matches")
    except Exception as e:
        print(f"[SEARCH_SPECIALIST] LLM filtering failed: {e}, using all candidates")
        filtered_ids = candidate_ids
    
    matching_ids = filtered_ids
    
    # Apply additional filters if provided
    if filters:
        if filters.get("severity"):
            severity_result = filter_by_severity.invoke({"severity": filters["severity"]})
            filter_ids = set(severity_result.get("matching_ids", []))
            matching_ids = [id for id in matching_ids if id in filter_ids]
            print(f"[SEARCH_SPECIALIST] After severity filter: {len(matching_ids)} matches")
            
        if filters.get("category"):
            category_result = filter_by_category.invoke({"category": filters["category"]})
            filter_ids = set(category_result.get("matching_ids", []))
            matching_ids = [id for id in matching_ids if id in filter_ids]
            print(f"[SEARCH_SPECIALIST] After category filter: {len(matching_ids)} matches")
            
        if filters.get("status"):
            status_result = filter_by_status.invoke({"status": filters["status"]})
            filter_ids = set(status_result.get("matching_ids", []))
            matching_ids = [id for id in matching_ids if id in filter_ids]
            print(f"[SEARCH_SPECIALIST] After status filter: {len(matching_ids)} matches")
    
    # Create a tool message to simulate tool execution for the workflow
    tool_message = ToolMessage(
        content=json.dumps({
            "matching_ids": matching_ids,
            "match_count": len(matching_ids),
            "query": query,
            "filters": filters,
        }),
        tool_call_id="llm_filtered_search"
    )
    
    return {
        "messages": [tool_message],
        "matching_ids": matching_ids,
        "trace": state.get("trace", []) + ["search_specialist"]
    }
