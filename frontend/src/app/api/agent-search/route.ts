/**
 * POST /api/agent-search
 * Proxy to the Python LangGraph agent backend for semantic search.
 * Falls back to local search if agent backend is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';

interface AgentSearchResponse {
    matchingIds: string[];
    summary: string;
    reasoning: string;
    totalReports: number;
    matchCount: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        const agentUrl = process.env.NEXT_PUBLIC_AGENT_BACKEND_URL || 'http://localhost:8000';

        try {
            // Call the Python agent backend
            const response = await fetch(`${agentUrl}/agent/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
                // 30 second timeout for agent processing
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Agent returned ${response.status}`);
            }

            const data: AgentSearchResponse = await response.json();

            return NextResponse.json({
                matchingIds: data.matchingIds,
                summary: data.summary,
                reasoning: data.reasoning,
                totalReports: data.totalReports,
                matchCount: data.matchCount,
            });
        } catch (fetchError) {
            // If agent backend is unavailable, return a helpful error
            console.error('Agent backend error:', fetchError);

            return NextResponse.json(
                {
                    error: 'Agent search unavailable. Make sure the Python backend is running on port 8000.',
                    hint: 'Run: cd agent_backend && pip install -r requirements.txt && uvicorn main:app --reload',
                },
                { status: 503 }
            );
        }
    } catch (error) {
        console.error('Agent search endpoint error:', error);
        return NextResponse.json(
            { error: 'Search failed unexpectedly' },
            { status: 500 }
        );
    }
}
