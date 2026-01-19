"""
Search Agent - Finds accessibility reports using natural language queries.

This is a consolidated agent that combines:
- Intent analysis (understanding what the user wants)
- Semantic vector search (finding similar reports)
- Result filtering and aggregation

Replaces the previous 3-agent system (Intent Analyst + Search Specialist + Supervisor).
"""

import os
import json
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from db import get_all_reports
from embeddings import search_similar, build_index
from tools import filter_by_severity, filter_by_category


def get_llm():
    """Get the Gemini LLM instance."""
    api_key = os.getenv('GEMINI_API_KEY')
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0,
    )


async def search_agent_query(query: str) -> Dict[str, Any]:
    """
    Search for accessibility reports using natural language.
    
    This agent:
    1. Analyzes the query to understand intent and extract filters
    2. Performs semantic vector search
    3. Applies any extracted filters
    4. Returns matching reports with a summary
    
    Args:
        query: Natural language search query (e.g., "missing ramps near campus")
        
    Returns:
        Dictionary with:
        - matchingIds: List of matching report IDs
        - summary: Human-readable summary of results
        - reasoning: Explanation of how the search was interpreted
        - matchCount: Number of matches
    """
    
    # Step 1: Analyze intent and extract filters
    llm = get_llm()
    
    intent_prompt = """You are an accessibility search analyst.
Analyze the user's search query and extract:
1. The core semantic meaning for vector search
2. Any explicit filters (severity, category, status)

Respond with ONLY valid JSON:
{
    "semantic_query": "the best natural language query for finding this",
    "filters": {
        "severity": null or "low" or "medium" or "high",
        "category": null or category name
    },
    "reasoning": "brief explanation of interpretation"
}

Categories: no_ramp, cracked_sidewalk, obstacle_on_path, overgrown_vegetation, 
parking_violation, poor_lighting, pothole, slippery_surface, steep_grade, uneven_surface, other"""

    try:
        intent_response = llm.invoke([
            SystemMessage(content=intent_prompt),
            HumanMessage(content=query)
        ])
        
        content = intent_response.content.replace('```json', '').replace('```', '').strip()
        search_plan = json.loads(content)
        print(f"[SEARCH_AGENT] Parsed intent: {search_plan}")
        
    except Exception as e:
        print(f"[SEARCH_AGENT] Intent parsing failed: {e}")
        search_plan = {
            "semantic_query": query,
            "filters": {},
            "reasoning": "Direct search - could not parse structured intent"
        }
    
    # Step 2: Perform vector search
    reports = get_all_reports()
    await build_index(reports)
    
    # Use original query for better semantic matching
    search_results = await search_similar(query, top_k=15)
    matching_ids = [r[0] for r in search_results]
    scores = {r[0]: round(r[1], 3) for r in search_results}
    
    print(f"[SEARCH_AGENT] Vector search found {len(matching_ids)} candidates")
    
    # Step 3: Apply filters if specified
    filters = search_plan.get("filters", {})
    
    if filters.get("severity"):
        severity_result = filter_by_severity.invoke({"severity": filters["severity"]})
        filter_ids = set(severity_result.get("matching_ids", []))
        matching_ids = [id for id in matching_ids if id in filter_ids]
        print(f"[SEARCH_AGENT] After severity filter: {len(matching_ids)}")
    
    if filters.get("category"):
        category_result = filter_by_category.invoke({"category": filters["category"]})
        filter_ids = set(category_result.get("matching_ids", []))
        matching_ids = [id for id in matching_ids if id in filter_ids]
        print(f"[SEARCH_AGENT] After category filter: {len(matching_ids)}")
    
    # Step 4: Generate summary
    if matching_ids:
        summary = f"Found {len(matching_ids)} reports matching your search."
    else:
        summary = f"No reports found matching '{query}'."
    
    return {
        "matchingIds": matching_ids,
        "summary": summary,
        "reasoning": search_plan.get("reasoning", ""),
        "totalReports": len(reports),
        "matchCount": len(matching_ids),
        "scores": scores,
        "agent": "search_agent"
    }
