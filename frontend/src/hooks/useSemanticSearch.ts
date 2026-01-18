import { useMemo, useCallback } from 'react';
import type { Report } from '@/lib/types';

/**
 * Accessibility-domain synonym map for semantic matching
 * Maps common search terms to related categories and keywords
 */
const SYNONYM_MAP: Record<string, string[]> = {
    // Mobility-related
    wheelchair: ['missing_ramp', 'narrow_passage', 'steep_grade', 'blocked_path', 'uneven_surface', 'ramp', 'accessibility'],
    mobility: ['missing_ramp', 'steep_grade', 'blocked_path', 'uneven_surface', 'wheelchair'],
    ramp: ['missing_ramp', 'steep_grade', 'curb'],
    curb: ['missing_ramp', 'curb cut'],
    walker: ['uneven_surface', 'steep_grade', 'blocked_path'],
    cane: ['uneven_surface', 'poor_lighting'],

    // Visual impairment
    blind: ['poor_lighting', 'unclear', 'signage'],
    visual: ['poor_lighting', 'lighting', 'visibility'],
    lighting: ['poor_lighting', 'dark', 'dim'],
    dark: ['poor_lighting'],

    // Surface issues
    sidewalk: ['broken_sidewalk', 'uneven_surface', 'cracked', 'pavement'],
    crack: ['broken_sidewalk', 'cracked'],
    broken: ['broken_sidewalk', 'damaged'],
    uneven: ['uneven_surface', 'bumpy', 'rough'],
    hole: ['broken_sidewalk', 'pothole'],

    // Obstruction issues
    blocked: ['blocked_path', 'obstruction', 'obstacle'],
    obstruction: ['blocked_path'],
    obstacle: ['blocked_path'],
    narrow: ['narrow_passage', 'tight', 'cramped'],

    // Severity-related
    dangerous: ['high'],
    hazard: ['high'],
    urgent: ['high'],
    severe: ['high'],
    minor: ['low'],

    // General
    access: ['accessibility', 'barrier'],
    barrier: ['blocked_path', 'obstacle'],
    stairs: ['missing_ramp', 'step'],
    step: ['missing_ramp', 'uneven_surface'],
};

/**
 * Normalize text for matching
 */
function normalize(text: string): string {
    return text.toLowerCase().replace(/[_-]/g, ' ').trim();
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
    return normalize(text).split(/\s+/).filter(w => w.length > 1);
}

/**
 * Expand query with synonyms
 */
function expandQuery(query: string): string[] {
    const words = tokenize(query);
    const expanded = new Set<string>(words);

    for (const word of words) {
        // Check for synonyms
        for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
            if (word.includes(key) || key.includes(word)) {
                synonyms.forEach(s => expanded.add(normalize(s)));
            }
        }
    }

    return Array.from(expanded);
}

/**
 * Calculate match score for a report against search terms
 */
function calculateScore(report: Report, searchTerms: string[]): number {
    const title = normalize(report.content.title);
    const description = normalize(report.content.description);
    const category = normalize(report.content.category);
    const severity = report.content.severity;
    const suggestedFix = normalize(report.content.suggestedFix);

    // Combined searchable text
    const fullText = `${title} ${description} ${category} ${suggestedFix}`;

    let score = 0;

    for (const term of searchTerms) {
        // Exact match in title (highest weight)
        if (title.includes(term)) {
            score += 10;
        }

        // Category match (high weight)
        if (category.includes(term)) {
            score += 8;
        }

        // Severity match
        if (severity === term) {
            score += 6;
        }

        // Description match
        if (description.includes(term)) {
            score += 4;
        }

        // Suggested fix match
        if (suggestedFix.includes(term)) {
            score += 2;
        }

        // Partial word match anywhere
        if (fullText.includes(term)) {
            score += 1;
        }
    }

    return score;
}

export interface SearchResult {
    matchingIds: string[];
    matchCount: number;
    totalReports: number;
    summary: string;
}

/**
 * Hook for fast, client-side semantic search with synonym expansion
 */
export function useSemanticSearch(reports: Report[]) {
    /**
     * Search function - returns matching report IDs with scores
     */
    const search = useCallback((query: string): SearchResult => {
        if (!query.trim()) {
            return {
                matchingIds: [],
                matchCount: 0,
                totalReports: reports.length,
                summary: 'Enter a search query',
            };
        }

        // Expand query with synonyms
        const searchTerms = expandQuery(query);

        // Score all reports
        const scored = reports
            .map(report => ({
                id: report.id,
                score: calculateScore(report, searchTerms),
            }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score);

        const matchingIds = scored.map(r => r.id);

        // Generate summary based on results
        let summary: string;
        if (matchingIds.length === 0) {
            summary = `No reports found matching "${query}". Try different keywords.`;
        } else if (matchingIds.length === 1) {
            summary = `Found 1 matching report.`;
        } else {
            // Find common categories in results
            const matchedReports = reports.filter(r => matchingIds.includes(r.id));
            const categories = [...new Set(matchedReports.map(r => r.content.category))];
            const topCategories = categories.slice(0, 2).map(c => c.replace(/_/g, ' ')).join(', ');

            summary = `Found ${matchingIds.length} reports related to ${topCategories || 'your query'}.`;
        }

        return {
            matchingIds,
            matchCount: matchingIds.length,
            totalReports: reports.length,
            summary,
        };
    }, [reports]);

    return { search };
}
