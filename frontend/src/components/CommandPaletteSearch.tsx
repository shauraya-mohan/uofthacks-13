'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchResult {
    matchingIds: string[];
    summary: string;
    reasoning?: string;
    totalReports: number;
    matchCount: number;
}

interface CommandPaletteSearchProps {
    onSearchResults: (matchingIds: string[] | null) => void;
    totalReports: number;
}

export default function CommandPaletteSearch({ onSearchResults, totalReports }: CommandPaletteSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Keyboard shortcut: Cmd/Ctrl + K to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            // Try agent backend first, fallback to original search
            let response = await fetch('/api/agent-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
            });

            // Fallback to original search if agent is unavailable
            if (response.status === 503) {
                response = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query.trim() }),
                });
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Search failed');
            }

            const data: SearchResult = await response.json();
            setResult(data);
            onSearchResults(data.matchingIds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    }, [query, onSearchResults]);

    const handleClear = useCallback(() => {
        setQuery('');
        setResult(null);
        setError(null);
        onSearchResults(null);
        setIsOpen(false);
    }, [onSearchResults]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    }, [handleSearch]);

    const handleQuickSearch = useCallback((searchQuery: string) => {
        setQuery(searchQuery);
        setIsOpen(true);
        // Auto-search after setting query
        setTimeout(async () => {
            setIsSearching(true);
            try {
                let response = await fetch('/api/agent-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery }),
                });
                // Fallback to original search if agent is unavailable
                if (response.status === 503) {
                    response = await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: searchQuery }),
                    });
                }
                if (response.ok) {
                    const data: SearchResult = await response.json();
                    setResult(data);
                    onSearchResults(data.matchingIds);
                }
            } catch {
                // Ignore errors on quick search
            } finally {
                setIsSearching(false);
            }
        }, 100);
    }, [onSearchResults]);

    return (
        <>
            {/* Floating Trigger Button - Bottom Center */}
            {!isOpen && !result && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group flex items-center gap-3 px-5 py-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#333] rounded-2xl shadow-2xl shadow-black/50 hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all duration-300"
                    >
                        {/* Animated gradient orb */}
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full animate-pulse opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-gray-300 font-medium">AI Search</span>
                        <kbd className="hidden sm:inline-flex px-2 py-1 bg-[#262626] border border-[#404040] rounded text-xs text-gray-500 font-mono">
                            ⌘K
                        </kbd>
                    </button>
                </div>
            )}

            {/* Active Search Results Indicator */}
            {result && !isOpen && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="flex items-center gap-3 px-5 py-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#333] rounded-2xl shadow-2xl shadow-black/50">
                        {/* Subtle pulsing dot */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40" />
                            <div className="relative w-2.5 h-2.5 bg-blue-500 rounded-full" />
                        </div>

                        <span className="text-gray-200 font-medium">
                            <span className="text-blue-400">{result.matchCount}</span> of {result.totalReports} reports
                        </span>

                        <div className="w-px h-4 bg-[#404040]" />

                        <button
                            onClick={() => setIsOpen(true)}
                            className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] border border-[#404040] hover:border-[#555] rounded-lg text-gray-300 text-sm transition-colors"
                        >
                            Edit
                        </button>

                        <button
                            onClick={handleClear}
                            className="p-1.5 hover:bg-[#333] rounded-lg transition-colors text-gray-400 hover:text-gray-200"
                            title="Clear search"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Command Palette Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Command Palette */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="bg-[#1a1a1a]/98 backdrop-blur-xl border border-[#333] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                            {/* Search Input */}
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    {isSearching ? (
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                </div>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search reports with AI... (e.g. 'wheelchair accessibility issues')"
                                    className="w-full pl-12 pr-24 py-4 bg-transparent text-gray-100 text-lg placeholder-gray-500 focus:outline-none"
                                />

                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {query && (
                                        <button
                                            onClick={handleSearch}
                                            disabled={isSearching}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                                        >
                                            Search
                                        </button>
                                    )}
                                    <kbd className="px-2 py-1 bg-[#262626] border border-[#404040] rounded text-xs text-gray-500 font-mono">
                                        ESC
                                    </kbd>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-[#333] to-transparent" />

                            {/* Error */}
                            {error && (
                                <div className="px-4 py-3 bg-red-900/20 border-b border-red-800/50">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Results */}
                            {result && (
                                <div className="px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        {/* AI Agent Icon */}
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>

                                        <div className="flex-1">
                                            {/* Stats */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded text-xs font-semibold">
                                                    🤖 Agent Found {result.matchCount} matches
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    of {result.totalReports} total reports
                                                </span>
                                            </div>

                                            {/* Summary */}
                                            <p className="text-gray-300 text-sm leading-relaxed">
                                                {result.summary}
                                            </p>

                                            {/* Agent Reasoning (collapsible) */}
                                            {result.reasoning && (
                                                <details className="mt-3">
                                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                                                        💭 View agent reasoning
                                                    </summary>
                                                    <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#333] rounded-lg">
                                                        <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">
                                                            {result.reasoning}
                                                        </p>
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick Searches */}
                            {!result && !error && (
                                <div className="px-4 py-4">
                                    <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider font-medium">Quick Searches</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: '♿ Wheelchair Issues', query: 'wheelchair accessibility barriers' },
                                            { label: '🚧 Missing Ramps', query: 'missing curb ramps' },
                                            { label: '⚠️ High Severity', query: 'high severity dangerous barriers' },
                                            { label: '🚶 Blocked Paths', query: 'blocked or obstructed pathways' },
                                        ].map((item) => (
                                            <button
                                                key={item.query}
                                                onClick={() => handleQuickSearch(item.query)}
                                                className="flex items-center gap-2 px-3 py-2 bg-[#262626] hover:bg-[#333] border border-[#404040] hover:border-[#555] rounded-xl text-left transition-all duration-200"
                                            >
                                                <span className="text-sm">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-gray-600 text-xs mt-4 text-center">
                                        {totalReports} reports available • Powered by AI
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* CSS for pulse animation on map markers (inject global styles) */}
            <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 1));
            transform: scale(1.15);
          }
        }
        
        .search-highlight {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        
        .search-ripple::after {
          content: '';
          position: absolute;
          inset: -10px;
          border: 2px solid rgba(59, 130, 246, 0.6);
          border-radius: 50%;
          animation: ripple 2s ease-out infinite;
        }
      `}</style>
        </>
    );
}
