"""
Communify AI Agent System

This module provides the main entry points for the 3-agent architecture:
1. Vision Agent - Analyzes photos/videos for accessibility barriers
2. Search Agent - Finds reports using natural language queries
3. Solution Agent - Generates fix recommendations

Each agent is independent and can be called directly via API endpoints.
"""

from typing import Dict, Any

# Import individual agents
from agents.vision_agent import vision_agent_analyze
from agents.search_agent import search_agent_query
from agents.solution_agent import solution_agent_generate


async def run_vision_agent(
    image_base64: str,
    mime_type: str = "image/jpeg",
    filename: str = "image.jpg"
) -> Dict[str, Any]:
    """
    Run the Vision Agent to analyze an image/video for accessibility barriers.
    
    Args:
        image_base64: Base64-encoded image data
        mime_type: MIME type of the file
        filename: Original filename
        
    Returns:
        Analysis results with category, severity, description, etc.
    """
    return await vision_agent_analyze(image_base64, mime_type, filename)


async def run_search_agent(query: str) -> Dict[str, Any]:
    """
    Run the Search Agent to find reports matching a natural language query.
    
    Args:
        query: Natural language search query
        
    Returns:
        Matching report IDs and summary
    """
    return await search_agent_query(query)


async def run_solution_agent(
    description: str,
    category: str,
    severity: str,
    image_base64: str = None,
    mime_type: str = "image/jpeg"
) -> Dict[str, Any]:
    """
    Run the Solution Agent to generate fix recommendations.
    
    Args:
        description: Description of the barrier
        category: Category of the barrier
        severity: Severity level
        image_base64: Optional image for context
        mime_type: MIME type of the image
        
    Returns:
        Fix recommendations with steps, cost estimates, etc.
    """
    return await solution_agent_generate(
        description=description,
        category=category,
        severity=severity,
        image_base64=image_base64,
        mime_type=mime_type
    )


# Legacy function for backward compatibility with existing /agent/search endpoint
async def run_search(query: str) -> Dict[str, Any]:
    """
    Legacy wrapper for backward compatibility.
    Maps to the new Search Agent.
    """
    return await run_search_agent(query)
