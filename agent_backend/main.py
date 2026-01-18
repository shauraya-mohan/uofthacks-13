"""
FastAPI backend for the LangGraph semantic search agent.
Provides REST API endpoint for the Next.js frontend.
"""

import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from local .env file
load_dotenv()

from agent import run_search
from db import get_all_reports
from embeddings import build_index, get_index_size


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Pre-build the embedding index
    print("[INFO] Starting agent backend...")
    try:
        reports = get_all_reports()
        count = await build_index(reports)
        print(f"[OK] Indexed {count} reports")
    except Exception as e:
        print(f"[WARN] Index build failed (will retry on first search): {e}")
    
    yield
    
    # Shutdown
    print("[INFO] Shutting down agent backend...")


app = FastAPI(
    title="Accessibility Report Search Agent",
    description="LangGraph-powered semantic search for accessibility reports",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "index_size": get_index_size(),
    }


@app.post("/agent/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search for accessibility reports using the LangGraph agent.
    
    The agent uses semantic search combined with intelligent filtering
    to find the most relevant reports.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        result = await run_search(request.query.strip())
        return SearchResponse(**result)
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/agent/stats")
async def get_stats():
    """Get statistics about the search index and reports."""
    from tools import get_report_stats
    
    stats = get_report_stats.invoke({})
    return {
        "index_size": get_index_size(),
        "report_stats": stats,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
