"""
FastAPI backend for the Communify AI Agent System.

Provides REST API endpoints for:
- Vision Agent: Analyze photos/videos for accessibility barriers
- Search Agent: Find reports using natural language
- Solution Agent: Generate fix recommendations
"""

import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from agent import run_vision_agent, run_search_agent, run_solution_agent, run_search
from db import get_all_reports
from embeddings import build_index, get_index_size


# === Request/Response Models ===

class SearchRequest(BaseModel):
    """Request body for search endpoint."""
    query: str


class SearchResponse(BaseModel):
    """Response body for search endpoint."""
    matchingIds: list[str]
    summary: str
    reasoning: str
    totalReports: int
    matchCount: int


class VisionRequest(BaseModel):
    """Request body for vision agent endpoint."""
    imageBase64: str
    mimeType: str = "image/jpeg"
    filename: str = "image.jpg"


class VisionResponse(BaseModel):
    """Response body for vision agent endpoint."""
    category: str
    severity: str
    title: str
    description: str
    suggestedFix: str
    confidence: float
    agent: str


class SolutionRequest(BaseModel):
    """Request body for solution agent endpoint."""
    description: str
    category: str
    severity: str
    imageBase64: Optional[str] = None
    mimeType: str = "image/jpeg"


class SolutionResponse(BaseModel):
    """Response body for solution agent endpoint."""
    suggestedFix: str
    estimatedCost: str
    estimatedTime: str
    priority: int
    steps: list[str]
    accessibility_impact: str
    standards_reference: str
    agent: str


# === App Setup ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("[INFO] Starting Communify Agent Backend...")
    print("[INFO] Agents: Vision, Search, Solution")
    try:
        reports = get_all_reports()
        count = await build_index(reports)
        print(f"[OK] Indexed {count} reports for semantic search")
    except Exception as e:
        print(f"[WARN] Index build failed (will retry on first search): {e}")
    
    yield
    
    print("[INFO] Shutting down agent backend...")


app = FastAPI(
    title="Communify AI Agents",
    description="AI-powered accessibility barrier analysis and search",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://uofthacks-13-nine.vercel.app",  # Production Vercel deployment
        "https://*.vercel.app",  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Health Check ===

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "agents": ["vision", "search", "solution"],
        "index_size": get_index_size(),
    }


# === Vision Agent Endpoint ===

@app.post("/agent/vision", response_model=VisionResponse)
async def vision_analyze(request: VisionRequest):
    """
    Analyze an image or video for accessibility barriers.
    
    The Vision Agent uses Gemini's vision capabilities to:
    - Identify the type of accessibility barrier
    - Assess severity (low/medium/high)
    - Generate a description and suggested fix
    """
    if not request.imageBase64:
        raise HTTPException(status_code=400, detail="Image data is required")
    
    try:
        result = await run_vision_agent(
            image_base64=request.imageBase64,
            mime_type=request.mimeType,
            filename=request.filename
        )
        return VisionResponse(**result)
    except Exception as e:
        print(f"Vision agent error: {e}")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {str(e)}")


# === Search Agent Endpoint ===

@app.post("/agent/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search for accessibility reports using natural language.
    
    The Search Agent uses semantic search combined with intelligent
    filtering to find the most relevant reports.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        result = await run_search(request.query.strip())
        return SearchResponse(**result)
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


# === Solution Agent Endpoint ===

@app.post("/agent/solution", response_model=SolutionResponse)
async def solution_generate(request: SolutionRequest):
    """
    Generate fix recommendations for an accessibility barrier.
    
    The Solution Agent analyzes the barrier and provides:
    - Detailed fix recommendations
    - Cost and time estimates
    - Implementation steps
    - Accessibility impact assessment
    """
    if not request.description:
        raise HTTPException(status_code=400, detail="Description is required")
    
    try:
        result = await run_solution_agent(
            description=request.description,
            category=request.category,
            severity=request.severity,
            image_base64=request.imageBase64,
            mime_type=request.mimeType
        )
        return SolutionResponse(**result)
    except Exception as e:
        print(f"Solution agent error: {e}")
        raise HTTPException(status_code=500, detail=f"Solution generation failed: {str(e)}")


# === Stats Endpoint ===

@app.get("/agent/stats")
async def get_stats():
    """Get statistics about the search index and reports."""
    from tools import get_report_stats
    
    stats = get_report_stats.invoke({})
    return {
        "index_size": get_index_size(),
        "report_stats": stats,
        "agents": {
            "vision": "Analyzes photos/videos for accessibility barriers",
            "search": "Finds reports using natural language queries",
            "solution": "Generates fix recommendations"
        }
    }


# === Debug Endpoint ===

@app.get("/agent/debug/reports")
async def debug_reports():
    """Debug endpoint: view all reports and their search text."""
    from embeddings import build_report_text
    
    reports = get_all_reports()
    debug_data = []
    for report in reports:
        content = report.get('content', {})
        debug_data.append({
            "id": report['_id'],
            "title": content.get('title', 'Untitled'),
            "category": content.get('category', 'unknown'),
            "severity": content.get('severity', 'unknown'),
            "description": content.get('description', '')[:150],
            "search_text": build_report_text(report)[:200],
        })
    return {"total": len(debug_data), "reports": debug_data}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
