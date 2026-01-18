/**
 * Gemini Embeddings Helper
 * Uses Gemini's free text-embedding-004 model for semantic search
 * Free tier: 1,500 RPM, includes in Gemini API quota
 */

const GEMINI_EMBEDDING_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

export interface EmbeddingResult {
    embedding: number[];
}

/**
 * Generate embedding for a single text using Gemini's free embedding model
 */
export async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
    try {
        const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: {
                    parts: [{ text }],
                },
            }),
        });

        if (!response.ok) {
            console.error('Embedding API error:', response.status, await response.text());
            return null;
        }

        const data = await response.json();
        return data.embedding?.values || null;
    } catch (error) {
        console.error('Embedding generation failed:', error);
        return null;
    }
}

/**
 * Generate embeddings for multiple texts in batch (more efficient)
 */
export async function generateBatchEmbeddings(
    texts: string[],
    apiKey: string
): Promise<(number[] | null)[]> {
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 5;
    const results: (number[] | null)[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(text => generateEmbedding(text, apiKey))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find top-k most similar items from a list of embeddings
 */
export function findMostSimilar(
    queryEmbedding: number[],
    itemEmbeddings: { id: string; embedding: number[] }[],
    topK: number = 10,
    threshold: number = 0.3
): { id: string; score: number }[] {
    const scored = itemEmbeddings
        .map(item => ({
            id: item.id,
            score: cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .filter(item => item.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored;
}
