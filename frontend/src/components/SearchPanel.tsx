'use client';

import { useState, useCallback } from 'react';

interface SearchResult {
    matchingIds: string[];
    summary: string;
    totalReports: number;
    matchCount: number;
}

interface SearchPanelProps {
    onSearchResults: (matchingIds: string[] | null) => void;
}

export default function SearchPanel({ onSearchResults }: SearchPanelProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Search failed');
            }

            const data: SearchResult = await response.json();
            setResult(data);
            onSearchResults(data.matchingIds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            onSearchResults(null);
        } finally {
            setIsSearching(false);
        }
    }, [query, onSearchResults]);

    const handleClear = useCallback(() => {
        setQuery('');
        setResult(null);
        setError(null);
        onSearchResults(null);
    }, [onSearchResults]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    }, [handleSearch]);

    return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-[#333]">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-gray-100 font-semibold">AI Search</h3>
                </div>
                <p className="text-gray-500 text-xs">
                    Search reports using natural language
                </p>
            </div>

            {/* Search Input */}
            <div className="p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., wheelchair accessibility issues"
                        disabled={isSearching}
                        className="flex-1 px-3 py-2 bg-[#262626] border border-[#404040] rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !query.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSearching ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Searching...</span>
                            </>
                        ) : (
                            <span>Search</span>
                        )}
                    </button>
                </div>

                {/* Clear button */}
                {(result || error) && (
                    <button
                        onClick={handleClear}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Clear search
                    </button>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="px-4 pb-4">
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="px-4 pb-4">
                    <div className="p-3 bg-[#262626] border border-[#404040] rounded-lg">
                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-medium">
                                {result.matchCount} of {result.totalReports} reports
                            </span>
                        </div>

                        {/* AI Summary */}
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {result.summary}
                        </p>

                        {result.matchCount === 0 && (
                            <p className="text-gray-500 text-xs mt-2">
                                Try a different search query or clear to see all reports.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Example Queries */}
            {!result && !error && !isSearching && (
                <div className="px-4 pb-4">
                    <p className="text-gray-500 text-xs mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-2">
                        {[
                            'wheelchair issues',
                            'missing ramps',
                            'high severity',
                            'blocked paths',
                        ].map((example) => (
                            <button
                                key={example}
                                onClick={() => setQuery(example)}
                                className="px-2 py-1 bg-[#262626] border border-[#404040] rounded text-gray-400 text-xs hover:border-[#555] hover:text-gray-300 transition-colors"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
