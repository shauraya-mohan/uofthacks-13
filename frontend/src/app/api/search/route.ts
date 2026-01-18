/**
 * POST /api/search
 * Fast vector-based semantic search using Gemini embeddings (FREE!)
 * 
 * Strategy:
 * 1. Generate query embedding using Gemini's free text-embedding-004
 * 2. Generate/cache report embeddings
 * 3. Cosine similarity search - returns ranked results
 * 
 * Performance: ~200-400ms (mostly embedding API call for query)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, DbReport } from '@/lib/mongodb';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';

interface SearchResult {
    matchingIds: string[];
    summary: string;
    totalReports: number;
    matchCount: number;
}

// In-memory cache for report embeddings (persists across requests in dev/prod)
// Key: report ID, Value: { text: string, embedding: number[] }
const embeddingCache = new Map<string, { text: string; embedding: number[] }>();

/**
 * Build searchable text for a report (used for embedding)
 */
function buildReportText(report: DbReport): string {
    const title = report.content?.title || report.aiDraft?.title || '';
    const description = report.content?.description || report.aiDraft?.description || '';
    const category = (report.content?.category || report.aiDraft?.category || '').replace(/_/g, ' ');
    const severity = report.content?.severity || report.aiDraft?.severity || '';
    const fix = report.content?.suggestedFix || report.aiDraft?.suggestedFix || '';

    return `${title}. ${category}. ${severity} severity. ${description} ${fix}`.trim();
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Search not configured (missing GEMINI_API_KEY)' },
                { status: 503 }
            );
        }

        // Fetch reports from MongoDB
        let reports: DbReport[];
        try {
            const db = await getDatabase();
            reports = await db
                .collection<DbReport>('reports')
                .find({})
                .sort({ createdAt: -1 })
                .limit(100)
                .toArray();
        } catch (dbError) {
            console.error('MongoDB error:', dbError);
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 503 }
            );
        }

        if (reports.length === 0) {
            return NextResponse.json({
                matchingIds: [],
                summary: 'No reports in database.',
                totalReports: 0,
                matchCount: 0,
            } as SearchResult);
        }

        // Step 1: Generate query embedding
        const queryEmbedding = await generateEmbedding(query, apiKey);
        if (!queryEmbedding) {
            return NextResponse.json(
                { error: 'Failed to process search query' },
                { status: 500 }
            );
        }

        // Step 2: Get/generate report embeddings (with caching)
        const reportEmbeddings: { id: string; embedding: number[] }[] = [];
        const uncachedReports: { id: string; text: string }[] = [];

        for (const report of reports) {
            const id = report._id?.toString() || '';
            const text = buildReportText(report);

            // Check cache
            const cached = embeddingCache.get(id);
            if (cached && cached.text === text) {
                reportEmbeddings.push({ id, embedding: cached.embedding });
            } else {
                uncachedReports.push({ id, text });
            }
        }

        // Generate embeddings for uncached reports (in parallel, batched)
        if (uncachedReports.length > 0) {
            console.log(`Generating embeddings for ${uncachedReports.length} uncached reports...`);

            // Process in parallel with small batches to avoid rate limits
            const BATCH_SIZE = 5;
            for (let i = 0; i < uncachedReports.length; i += BATCH_SIZE) {
                const batch = uncachedReports.slice(i, i + BATCH_SIZE);
                const embeddings = await Promise.all(
                    batch.map(async (item) => {
                        const embedding = await generateEmbedding(item.text, apiKey);
                        return { ...item, embedding };
                    })
                );

                for (const item of embeddings) {
                    if (item.embedding) {
                        embeddingCache.set(item.id, { text: item.text, embedding: item.embedding });
                        reportEmbeddings.push({ id: item.id, embedding: item.embedding });
                    }
                }
            }
        }

        // Step 3: Cosine similarity search
        const SIMILARITY_THRESHOLD = 0.35; // Lower = more results, higher = stricter matching

        const scored = reportEmbeddings
            .map(item => ({
                id: item.id,
                score: cosineSimilarity(queryEmbedding, item.embedding),
            }))
            .filter(item => item.score >= SIMILARITY_THRESHOLD)
            .sort((a, b) => b.score - a.score);

        const matchingIds = scored.map(r => r.id);

        // Generate summary
        let summary: string;
        if (matchingIds.length === 0) {
            summary = `No reports found matching "${query}". Try different terms.`;
        } else {
            const topScore = scored[0]?.score || 0;
            const confidence = topScore > 0.6 ? 'highly relevant' : topScore > 0.45 ? 'relevant' : 'possibly related';
            summary = `Found ${matchingIds.length} ${confidence} reports for "${query}".`;
        }

        const result: SearchResult = {
            matchingIds,
            summary,
            totalReports: reports.length,
            matchCount: matchingIds.length,
        };

        console.log(`Vector search completed in ${Date.now() - startTime}ms, found ${matchingIds.length} matches`);
        return NextResponse.json(result);

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json(
            { error: 'Search failed unexpectedly' },
            { status: 500 }
        );
    }
}
