"""
Agent tools for the LangGraph semantic search agent.
Each tool is a function that the agent can invoke to perform specific operations.
"""

import math
from typing import List, Dict, Any, Optional
from langchain_core.tools import tool

from db import get_all_reports, filter_reports as db_filter_reports
from embeddings import search_similar, build_index, get_index_size


@tool
async def vector_search(query: str, top_k: int = 20) -> Dict[str, Any]:
    """
    Search for reports using semantic similarity.
    Use this tool when the user wants to find reports by meaning, not exact keywords.
    
    Args:
        query: Natural language search query (e.g., "wheelchair accessibility issues")
        top_k: Maximum number of results to return (default: 20)
    
    Returns:
        Dictionary with matching report IDs and their similarity scores
    """
    # Ensure index is built
    reports = get_all_reports()
    await build_index(reports)
    
    # Search
    results = await search_similar(query, top_k=top_k)
    
    # Log similarity scores for debugging
    if results:
        print(f"[VECTOR_SEARCH] Top results for '{query}':")
        for report_id, score in results[:5]:
            print(f"  - {report_id}: {score:.3f}")
    
    return {
        "matching_ids": [r[0] for r in results],
        "scores": {r[0]: round(r[1], 3) for r in results},
        "total_indexed": get_index_size(),
        "match_count": len(results),
    }



@tool
def filter_by_category(category: str) -> Dict[str, Any]:
    """
    Filter reports by accessibility barrier category.
    Use this when the user specifies a type of barrier.
    
    Args:
        category: One of: broken_sidewalk, missing_ramp, blocked_path, 
                  steep_grade, poor_lighting, narrow_passage, uneven_surface, other
    
    Returns:
        Dictionary with matching report IDs
    """
    valid_categories = [
        'broken_sidewalk', 'missing_ramp', 'blocked_path', 'steep_grade',
        'poor_lighting', 'narrow_passage', 'uneven_surface', 'other'
    ]
    
    # Normalize input
    normalized = category.lower().replace(' ', '_').replace('-', '_')
    if normalized not in valid_categories:
        return {
            "error": f"Invalid category. Must be one of: {', '.join(valid_categories)}",
            "matching_ids": [],
        }
    
    reports = db_filter_reports(category=normalized)
    return {
        "matching_ids": [r['_id'] for r in reports],
        "match_count": len(reports),
        "category": normalized,
    }


@tool
def filter_by_severity(severity: str) -> Dict[str, Any]:
    """
    Filter reports by severity level.
    Use this when the user wants to see issues of a specific severity.
    
    Args:
        severity: One of: low, medium, high
    
    Returns:
        Dictionary with matching report IDs
    """
    valid_severities = ['low', 'medium', 'high']
    normalized = severity.lower().strip()
    
    if normalized not in valid_severities:
        return {
            "error": f"Invalid severity. Must be one of: {', '.join(valid_severities)}",
            "matching_ids": [],
        }
    
    reports = db_filter_reports(severity=normalized)
    return {
        "matching_ids": [r['_id'] for r in reports],
        "match_count": len(reports),
        "severity": normalized,
    }


@tool
def filter_by_status(status: str) -> Dict[str, Any]:
    """
    Filter reports by resolution status.
    Use this when the user wants to see issues with a specific status.
    
    Args:
        status: One of: draft, open, acknowledged, in_progress, resolved
    
    Returns:
        Dictionary with matching report IDs
    """
    valid_statuses = ['draft', 'open', 'acknowledged', 'in_progress', 'resolved']
    normalized = status.lower().strip().replace(' ', '_').replace('-', '_')
    
    if normalized not in valid_statuses:
        return {
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            "matching_ids": [],
        }
    
    reports = db_filter_reports(status=normalized)
    return {
        "matching_ids": [r['_id'] for r in reports],
        "match_count": len(reports),
        "status": normalized,
    }


@tool
def filter_by_location(lat: float, lng: float, radius_km: float = 1.0) -> Dict[str, Any]:
    """
    Filter reports by geographic location.
    Use this when the user specifies a location or wants nearby reports.
    
    Args:
        lat: Latitude of the center point
        lng: Longitude of the center point
        radius_km: Search radius in kilometers (default: 1.0)
    
    Returns:
        Dictionary with matching report IDs and their distances
    """
    reports = get_all_reports()
    
    # Haversine formula for distance calculation
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371  # Earth's radius in kilometers
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    results = []
    for report in reports:
        location = report.get('location', {})
        coords = location.get('coordinates', [])
        if len(coords) == 2:
            report_lng, report_lat = coords
            distance = haversine(lat, lng, report_lat, report_lng)
            if distance <= radius_km:
                results.append({
                    "id": report['_id'],
                    "distance_km": round(distance, 3),
                })
    
    # Sort by distance
    results.sort(key=lambda x: x['distance_km'])
    
    return {
        "matching_ids": [r['id'] for r in results],
        "distances": {r['id']: r['distance_km'] for r in results},
        "match_count": len(results),
        "center": {"lat": lat, "lng": lng},
        "radius_km": radius_km,
    }


@tool
def get_report_stats() -> Dict[str, Any]:
    """
    Get aggregate statistics about all reports.
    Use this when the user asks about overall trends or totals.
    
    Returns:
        Dictionary with counts by category, severity, and status
    """
    reports = get_all_reports()
    
    stats = {
        "total": len(reports),
        "by_category": {},
        "by_severity": {},
        "by_status": {},
    }
    
    for report in reports:
        content = report.get('content', {})
        
        category = content.get('category', 'other')
        stats["by_category"][category] = stats["by_category"].get(category, 0) + 1
        
        severity = content.get('severity', 'medium')
        stats["by_severity"][severity] = stats["by_severity"].get(severity, 0) + 1
        
        status = report.get('status', 'open')
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
    
    return stats


# Export all tools for use in the agent
ALL_TOOLS = [
    vector_search,
    filter_by_category,
    filter_by_severity,
    filter_by_status,
    filter_by_location,
    get_report_stats,
]
