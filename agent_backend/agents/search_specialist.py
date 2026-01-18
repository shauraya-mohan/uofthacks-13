from langchain_core.messages import ToolMessage
from tools import vector_search, filter_by_severity, filter_by_category, filter_by_status
from db import get_all_reports
from state import AgentState
import json

async def search_specialist_node(state: AgentState):
    """
    Agent 2: Search Specialist
    Uses SEMANTIC SIMILARITY to find related reports.
    """
    search_plan_str = state.get("search_plan")
    
    # Get the original user query from messages
    messages = state.get("messages", [])
    original_query = messages[0].content if messages else ""
    
    # Parse search plan for filters
    filters = {}
    if search_plan_str:
        try:
            search_plan = json.loads(search_plan_str)
            filters = search_plan.get("filters", {})
        except:
            pass
    
    # USE THE ORIGINAL QUERY - not the transformed one
    # This preserves the semantic meaning better
    query = original_query
    
    print(f"[SEARCH_SPECIALIST] Using ORIGINAL query: {query}")
    print(f"[SEARCH_SPECIALIST] Filters: {filters}")
    
    # Vector search for semantic similarity
    vector_result = await vector_search.ainvoke({"query": query, "top_k": 15})
    matching_ids = vector_result.get("matching_ids", [])
    scores = vector_result.get("scores", {})
    
    print(f"[SEARCH_SPECIALIST] Found {len(matching_ids)} semantically similar matches")
    
    # Get category info for results
    all_reports = get_all_reports()
    report_map = {r['_id']: r for r in all_reports}
    
    categories_found = {}
    for report_id in matching_ids:
        if report_id in report_map:
            cat = report_map[report_id].get('content', {}).get('category', 'other')
            categories_found[report_id] = cat
    
    # Apply filters if provided
    if filters:
        if filters.get("severity"):
            severity_result = filter_by_severity.invoke({"severity": filters["severity"]})
            filter_ids = set(severity_result.get("matching_ids", []))
            matching_ids = [id for id in matching_ids if id in filter_ids]
            
        if filters.get("category"):
            category_result = filter_by_category.invoke({"category": filters["category"]})
            filter_ids = set(category_result.get("matching_ids", []))
            matching_ids = [id for id in matching_ids if id in filter_ids]
    
    # Log what categories we found
    cat_counts = {}
    for cat in categories_found.values():
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print(f"[SEARCH_SPECIALIST] Categories in results: {cat_counts}")
    
    tool_message = ToolMessage(
        content=json.dumps({
            "matching_ids": matching_ids,
            "match_count": len(matching_ids),
            "query": query,
            "scores": scores,
            "categories": categories_found,
        }),
        tool_call_id="semantic_search"
    )
    
    return {
        "messages": [tool_message],
        "matching_ids": matching_ids,
        "trace": state.get("trace", []) + ["search_specialist"]
    }
