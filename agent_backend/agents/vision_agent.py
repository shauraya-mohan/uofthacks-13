"""
Vision Agent - Analyzes photos and videos for accessibility barriers.

This agent wraps the existing AI analysis functionality (Gemini/TwelveLabs)
to provide a unified interface for the multi-agent system.
"""

import os
import aiohttp
from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

# Frontend API URL for analyze endpoint
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def get_llm():
    """Get the Gemini LLM instance."""
    api_key = os.getenv('GEMINI_API_KEY')
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0,
    )


async def vision_agent_analyze(
    image_base64: str,
    mime_type: str = "image/jpeg",
    filename: str = "image.jpg"
) -> Dict[str, Any]:
    """
    Analyze an image or video for accessibility barriers.
    
    This agent uses Gemini's vision capabilities to:
    1. Identify the type of accessibility barrier
    2. Assess the severity (low/medium/high)
    3. Generate a description of the issue
    4. Suggest potential fixes
    
    Args:
        image_base64: Base64-encoded image/video data
        mime_type: MIME type of the file
        filename: Original filename
        
    Returns:
        Dictionary with analysis results:
        - category: Type of barrier (e.g., 'no_ramp', 'cracked_sidewalk')
        - severity: 'low', 'medium', or 'high'
        - title: Short title for the issue
        - description: Detailed description
        - suggestedFix: Recommended solution
        - confidence: Confidence score (0-1)
    """
    llm = get_llm()
    
    system_prompt = """You are an accessibility barrier analysis expert. 
Analyze the provided image and identify any accessibility barriers for people with mobility challenges.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:
{
    "category": "one of: no_ramp, cracked_sidewalk, obstacle_on_path, overgrown_vegetation, parking_violation, poor_lighting, pothole, slippery_surface, steep_grade, uneven_surface, other",
    "severity": "one of: low, medium, high",
    "title": "short descriptive title (max 50 chars)",
    "description": "detailed description of the barrier and its impact on accessibility",
    "suggestedFix": "specific recommendation for fixing this barrier",
    "confidence": 0.0 to 1.0
}

Consider:
- Impact on wheelchair users
- Impact on people with walkers/canes
- Visibility and safety concerns
- Compliance with accessibility standards"""

    try:
        # Use Gemini's vision capability directly
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=[
                {"type": "text", "text": "Analyze this image for accessibility barriers:"},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                }
            ])
        ])
        
        import json
        content = response.content.replace('```json', '').replace('```', '').strip()
        result = json.loads(content)
        
        # Ensure all required fields
        return {
            "category": result.get("category", "other"),
            "severity": result.get("severity", "medium"),
            "title": result.get("title", "Accessibility Barrier"),
            "description": result.get("description", "An accessibility barrier was detected."),
            "suggestedFix": result.get("suggestedFix", "Please review and address this barrier."),
            "confidence": result.get("confidence", 0.7),
            "agent": "vision_agent"
        }
        
    except Exception as e:
        print(f"[VISION_AGENT] Error: {e}")
        # Fallback response
        return {
            "category": "other",
            "severity": "medium",
            "title": "Potential Accessibility Barrier",
            "description": "An image was submitted but could not be fully analyzed.",
            "suggestedFix": "Manual review recommended.",
            "confidence": 0.3,
            "agent": "vision_agent",
            "error": str(e)
        }
