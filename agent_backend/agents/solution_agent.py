"""
Solution Agent - Generates fix recommendations for accessibility barriers.

This agent analyzes a reported barrier and provides:
1. Detailed fix recommendations
2. Estimated complexity/cost
3. Priority assessment
"""

import os
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json


def get_llm():
    """Get the Gemini LLM instance."""
    api_key = os.getenv('GEMINI_API_KEY')
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
        temperature=0.3,
    )


async def solution_agent_generate(
    description: str,
    category: str,
    severity: str,
    image_base64: str = None,
    mime_type: str = "image/jpeg"
) -> Dict[str, Any]:
    """
    Generate fix recommendations for an accessibility barrier.
    
    Args:
        description: Description of the accessibility barrier
        category: Category of barrier (e.g., 'no_ramp', 'cracked_sidewalk')
        severity: Severity level ('low', 'medium', 'high')
        image_base64: Optional base64-encoded image
        mime_type: MIME type of the image
        
    Returns:
        Dictionary with:
        - suggestedFix: Detailed fix recommendation
        - estimatedCost: Cost estimate ('low', 'medium', 'high')
        - estimatedTime: Time estimate (e.g., '1-2 days', '1-2 weeks')
        - priority: Priority score (1-10)
        - steps: List of implementation steps
        - accessibility_impact: Description of impact once fixed
    """
    llm = get_llm()
    
    system_prompt = """You are an urban accessibility infrastructure expert.
Given an accessibility barrier report, provide detailed recommendations for fixing it.

You MUST respond with ONLY a valid JSON object (no markdown) with these fields:
{
    "suggestedFix": "detailed description of the recommended fix",
    "estimatedCost": "low / medium / high",
    "estimatedTime": "time estimate like '1-2 days' or '2-4 weeks'",
    "priority": 1-10 score based on severity and impact,
    "steps": ["step 1", "step 2", "step 3"],
    "accessibility_impact": "description of how this fix improves accessibility",
    "standards_reference": "relevant accessibility standards (e.g., ADA, AODA)"
}

Consider:
- Local building codes and accessibility regulations
- Cost-effective solutions
- Temporary vs permanent fixes
- Impact on various disability types"""

    user_message = f"""Accessibility Barrier Report:
- Category: {category}
- Severity: {severity}
- Description: {description}

Please provide fix recommendations."""

    try:
        messages = [
            SystemMessage(content=system_prompt),
        ]
        
        # Include image if provided
        if image_base64:
            messages.append(HumanMessage(content=[
                {"type": "text", "text": user_message},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                }
            ]))
        else:
            messages.append(HumanMessage(content=user_message))
        
        response = llm.invoke(messages)
        
        content = response.content.replace('```json', '').replace('```', '').strip()
        result = json.loads(content)
        
        return {
            "suggestedFix": result.get("suggestedFix", "Review and address the barrier."),
            "estimatedCost": result.get("estimatedCost", "medium"),
            "estimatedTime": result.get("estimatedTime", "1-2 weeks"),
            "priority": result.get("priority", 5),
            "steps": result.get("steps", ["Assess the barrier", "Plan the fix", "Implement solution"]),
            "accessibility_impact": result.get("accessibility_impact", "Improved accessibility for mobility-impaired users."),
            "standards_reference": result.get("standards_reference", "ADA/AODA guidelines"),
            "agent": "solution_agent"
        }
        
    except Exception as e:
        print(f"[SOLUTION_AGENT] Error: {e}")
        return {
            "suggestedFix": "Manual assessment required. Please consult an accessibility specialist.",
            "estimatedCost": "unknown",
            "estimatedTime": "unknown",
            "priority": 5,
            "steps": ["Contact accessibility specialist", "Conduct site assessment", "Develop remediation plan"],
            "accessibility_impact": "To be determined after assessment.",
            "standards_reference": "ADA/AODA guidelines",
            "agent": "solution_agent",
            "error": str(e)
        }
