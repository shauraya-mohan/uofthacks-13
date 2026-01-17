'use client';

import { useState, useCallback } from 'react';
import type { Report } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import ImageCompareSlider from './ImageCompareSlider';

interface PinDrawerProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  open: { label: 'Open', color: '#3b82f6' },
  acknowledged: { label: 'Acknowledged', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#8b5cf6' },
  resolved: { label: 'Resolved', color: '#22c55e' },
};

export default function PinDrawer({ report, isOpen, onClose }: PinDrawerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fixedImageUrl, setFixedImageUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Reset state when drawer closes or report changes
  const handleClose = useCallback(() => {
    setFixedImageUrl(null);
    setGenerateError(null);
    setIsGenerating(false);
    onClose();
  }, [onClose]);

  // Generate fixed image visualization
  const handleGenerateFix = useCallback(async () => {
    if (!report || report.mediaType !== 'image') return;

    setIsGenerating(true);
    setGenerateError(null);
    setFixedImageUrl(null); // Clear previous result to show loading preview

    try {
      // Extract base64 data from data URL or fetch from URL
      let imageBase64 = '';
      let mimeType = 'image/jpeg';

      if (report.mediaUrl.startsWith('data:')) {
        const matches = report.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBase64 = matches[2];
        }
      } else {
        // Fetch image and convert to base64
        const response = await fetch(report.mediaUrl);
        const blob = await response.blob();
        mimeType = blob.type;
        const buffer = await blob.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      const apiResponse = await fetch('/api/generate-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          description: report.content.description,
          suggestedFix: report.content.suggestedFix,
          category: report.content.category,
        }),
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error || 'Failed to generate fix visualization');
      }

      const result = await apiResponse.json();
      setFixedImageUrl(result.fixedImageUrl);
    } catch (error) {
      console.error('Failed to generate fix:', error);
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate fix');
    } finally {
      setIsGenerating(false);
    }
  }, [report]);

  if (!isOpen || !report) return null;

  const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.open;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1a1a1a] border-l border-[#333] shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{report.content.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
              >
                {statusInfo.label}
              </span>
              {report.content.isEdited && (
                <span className="text-xs text-gray-500">Edited</span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Media Preview with AI Fix Visualization */}
          <div className="space-y-3">
            {/* Image/Video Display */}
            {fixedImageUrl ? (
              /* Before/After Comparison Slider */
              <ImageCompareSlider
                beforeImage={report.mediaUrl}
                afterImage={fixedImageUrl}
                beforeLabel="Current"
                afterLabel="Fixed"
              />
            ) : (
              /* Original Image/Video with Loading Overlay */
              <div className="relative rounded-lg overflow-hidden bg-[#262626]">
                {report.mediaType === 'image' ? (
                  <img
                    src={report.mediaUrl}
                    alt="Barrier"
                    className={`w-full h-56 object-contain transition-all duration-300 ${isGenerating ? 'blur-sm scale-105' : ''}`}
                  />
                ) : (
                  <video
                    src={report.mediaUrl}
                    controls={!isGenerating}
                    className="w-full h-56 object-contain"
                  />
                )}

                {/* Loading Overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    {/* Animated rings */}
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-pulse-ring" />
                      <div className="absolute inset-2 rounded-full border-2 border-blue-400/40 animate-pulse-ring" style={{ animationDelay: '0.3s' }} />
                      <div className="absolute inset-4 rounded-full border-2 border-blue-300/50 animate-pulse-ring" style={{ animationDelay: '0.6s' }} />

                      {/* Center icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Text */}
                    <div className="mt-4 text-center">
                      <p className="text-white font-medium">Generating Fix Preview</p>
                      <p className="text-gray-400 text-sm mt-1">AI is visualizing the solution...</p>
                    </div>

                    {/* Shimmer bar */}
                    <div className="mt-4 w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full w-full animate-shimmer" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generate Fix Button / Reset Button */}
            {report.mediaType === 'image' && (
              <div className="flex gap-2">
                {fixedImageUrl ? (
                  <>
                    <button
                      onClick={() => setFixedImageUrl(null)}
                      className="flex-1 py-2 px-4 bg-[#262626] border border-[#333] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Show Original
                    </button>
                    <button
                      onClick={handleGenerateFix}
                      disabled={isGenerating}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGenerateFix}
                    disabled={isGenerating}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {isGenerating ? 'Generating...' : 'Visualize Fix with AI'}
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {generateError && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                {generateError}
              </div>
            )}
          </div>

          {/* Category and Severity badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-[#262626] border border-[#333] rounded-full text-sm font-medium text-gray-300">
              {CATEGORY_LABELS[report.content.category]}
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: SEVERITY_COLORS[report.content.severity] }}
            >
              {report.content.severity.charAt(0).toUpperCase() + report.content.severity.slice(1)} Severity
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed">{report.content.description}</p>
          </div>

          {/* Suggested Fix */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Suggested Fix</h3>
            <p className="text-gray-300 leading-relaxed">{report.content.suggestedFix}</p>
          </div>

          {/* AI Analysis Info */}
          <div className="bg-[#262626] border border-[#333] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-sm font-medium text-gray-400">AI Analysis</h3>
            </div>
            <div className="text-sm text-gray-500">
              <p>Confidence: {Math.round(report.aiDraft.confidence * 100)}%</p>
              {report.content.isEdited && (
                <p className="text-blue-400 mt-1">Content was edited by user</p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Location Method</h4>
              <p className="text-gray-200 font-medium capitalize">{report.geoMethod}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Reported</h4>
              <p className="text-gray-300 text-sm">{formatDate(report.createdAt)}</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500">Coordinates</h4>
              <p className="text-gray-300 text-sm">
                {report.coordinates.lat.toFixed(6)}, {report.coordinates.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* File Info */}
          <div className="pt-4 border-t border-[#333]">
            <h3 className="text-sm font-medium text-gray-500 mb-2">File Details</h3>
            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
              <span>{report.fileName}</span>
              <span className="text-gray-600">|</span>
              <span>{formatFileSize(report.fileSize)}</span>
              <span className="text-gray-600">|</span>
              <span className="capitalize">{report.mediaType}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#141414]">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-[#333] text-gray-100 rounded-lg font-medium hover:bg-[#404040] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
