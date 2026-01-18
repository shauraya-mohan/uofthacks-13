'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Report } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import ImageCompareSlider from './ImageCompareSlider';

interface PinDrawerProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (reportId: string) => Promise<void>;
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

export default function PinDrawer({ report, isOpen, onClose, onDelete }: PinDrawerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fixedImageUrl, setFixedImageUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<Report | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep a ref to the latest report for use in async callbacks
  const reportRef = useRef(report);
  reportRef.current = report;

  // Use fullReport if available, otherwise use the passed report
  const displayReport = fullReport || report;

  // Fetch full report data (including media URL) when drawer opens
  useEffect(() => {
    // Reset when drawer closes or report changes
    if (!isOpen || !report?.id) {
      setFullReport(null);
      setIsLoadingReport(false);
      return;
    }

    const reportId = report.id;

    // Always fetch the full report to ensure we have the media URL
    // The list API excludes media URL to save bandwidth
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    async function fetchFullReport() {
      setIsLoadingReport(true);
      setFullReport(null); // Clear previous report while loading

      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setFullReport(data);
        } else {
          console.error('Failed to fetch full report:', response.status);
          // Fall back to the passed report (may not have media URL)
          setFullReport(reportRef.current);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Don't log or set state if aborted - component probably unmounted or report changed
          return;
        }
        console.error('Failed to fetch full report:', error);
        setFullReport(reportRef.current);
      } finally {
        setIsLoadingReport(false);
      }
    }

    fetchFullReport();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, report?.id]); // Use report?.id instead of report to avoid unnecessary re-fetches

  // Reset state when drawer closes or report changes
  const handleClose = useCallback(() => {
    setFixedImageUrl(null);
    setGenerateError(null);
    setIsGenerating(false);
    setFullReport(null);
    setImageLoadError(false);
    setIsDeleting(false);
    onClose();
  }, [onClose]);

  // Handle delete report
  const handleDelete = useCallback(async () => {
    if (!displayReport || !onDelete) return;

    const confirmed = confirm(`Are you sure you want to delete this report?\n\n"${displayReport.content.title}"\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(displayReport.id);
      handleClose();
    } catch (error) {
      console.error('Failed to delete report:', error);
      setIsDeleting(false);
    }
  }, [displayReport, onDelete, handleClose]);

  // Reset image error when report changes
  useEffect(() => {
    setImageLoadError(false);
  }, [report?.id]);

  // Resize image to reduce payload size for API calls
  const resizeImageForApi = useCallback(async (imageUrl: string, maxWidth = 1024, maxHeight = 1024): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for smaller size
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Failed to load image for resizing'));
      img.src = imageUrl;
    });
  }, []);

  // Generate fixed image visualization
  const handleGenerateFix = useCallback(async () => {
    if (!displayReport || displayReport.mediaType !== 'image') return;

    setIsGenerating(true);
    setGenerateError(null);
    setFixedImageUrl(null); // Clear previous result to show loading preview

    try {
      // Resize image to reduce payload size (prevents "Request Entity Too Large" errors)
      let imageBase64: string;
      let mimeType: string;

      try {
        const resized = await resizeImageForApi(displayReport.mediaUrl);
        imageBase64 = resized.base64;
        mimeType = resized.mimeType;
      } catch (resizeError) {
        console.warn('Failed to resize image, trying original:', resizeError);
        // Fallback to original approach if resizing fails
        if (displayReport.mediaUrl.startsWith('data:')) {
          const matches = displayReport.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            imageBase64 = matches[2];
          } else {
            throw new Error('Invalid data URL format');
          }
        } else {
          const response = await fetch(displayReport.mediaUrl);
          const blob = await response.blob();
          mimeType = blob.type || 'image/jpeg';
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }

      const apiResponse = await fetch('/api/generate-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          description: displayReport.content.description,
          suggestedFix: displayReport.content.suggestedFix,
          category: displayReport.content.category,
        }),
      });

      if (!apiResponse.ok) {
        // Handle non-JSON error responses (e.g., "Request Entity Too Large")
        let errorMessage = 'Failed to generate fix visualization';
        try {
          const error = await apiResponse.json();
          errorMessage = error.error || errorMessage;
        } catch {
          // Response is not JSON, try to get text
          const errorText = await apiResponse.text().catch(() => '');
          if (apiResponse.status === 413 || errorText.includes('Request Entity Too Large')) {
            errorMessage = 'Image is too large. Please try with a smaller image.';
          } else if (apiResponse.status === 503) {
            errorMessage = 'Image generation service is not configured.';
          } else {
            errorMessage = `Server error (${apiResponse.status}): ${errorText.slice(0, 100) || 'Unknown error'}`;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await apiResponse.json();
      setFixedImageUrl(result.fixedImageUrl);
    } catch (error) {
      console.error('Failed to generate fix:', error);
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate fix');
    } finally {
      setIsGenerating(false);
    }
  }, [displayReport, resizeImageForApi]);

  if (!isOpen || !displayReport) return null;

  const statusInfo = STATUS_LABELS[displayReport.status] || STATUS_LABELS.open;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-gray-100">{displayReport.content.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border border-current"
                style={{ backgroundColor: statusInfo.color + '15', color: statusInfo.color, borderColor: statusInfo.color + '30' }}
              >
                {statusInfo.label}
              </span>
              {displayReport.content.isEdited && (
                <span className="text-xs text-gray-400 italic">Edited</span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
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
            {isLoadingReport ? (
              /* Loading state for media */
              <div className="relative rounded-lg overflow-hidden bg-[#262626] h-56 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading media...</p>
                </div>
              </div>
            ) : !displayReport.mediaUrl || imageLoadError ? (
              /* No media available or failed to load */
              <div className="relative rounded-lg overflow-hidden bg-[#262626] h-56 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">{imageLoadError ? 'Failed to load media' : 'Media not available'}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {imageLoadError ? 'The image URL may be invalid or expired' : 'Media data not found'}
                  </p>
                </div>
              </div>
            ) : fixedImageUrl ? (
              /* Before/After Comparison Slider */
              <ImageCompareSlider
                beforeImage={displayReport.mediaUrl}
                afterImage={fixedImageUrl}
                beforeLabel="Current"
                afterLabel="Fixed"
              />
            ) : (
              /* Original Image/Video with Loading Overlay */
              <div className="relative rounded-lg overflow-hidden bg-[#262626]">
                {displayReport.mediaType === 'image' ? (
                  <img
                    src={displayReport.mediaUrl}
                    alt="Barrier"
                    className={`w-full h-56 object-contain transition-all duration-300 ${isGenerating ? 'blur-sm scale-105' : ''}`}
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <video
                    src={displayReport.mediaUrl}
                    controls={!isGenerating}
                    className="w-full h-56 object-contain"
                    onError={() => setImageLoadError(true)}
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
            {displayReport.mediaType === 'image' && displayReport.mediaUrl && !imageLoadError && (
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
              {CATEGORY_LABELS[displayReport.content.category]}
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: SEVERITY_COLORS[displayReport.content.severity] }}
            >
              {displayReport.content.severity.charAt(0).toUpperCase() + displayReport.content.severity.slice(1)} Severity
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed">{displayReport.content.description}</p>
          </div>

          {/* Suggested Fix */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Suggested Fix</h3>
            <p className="text-gray-300 leading-relaxed">{displayReport.content.suggestedFix}</p>
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
              <p>Confidence: {Math.round(displayReport.aiDraft.confidence * 100)}%</p>
              {displayReport.content.isEdited && (
                <p className="text-blue-400 mt-1">Content was edited by user</p>
              )}
            </div>
          </div>

          {/* Estimated Cost (Admin Only) */}
          {displayReport.aiDraft.estimatedCost && (
            <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-emerald-400">Estimated Repair Cost</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-400 text-sm">Unit Cost</span>
                  <span className="text-emerald-300 font-semibold">
                    ${displayReport.aiDraft.estimatedCost.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-400 text-sm">Unit</span>
                  <span className="text-gray-300 text-sm">{displayReport.aiDraft.estimatedCost.unit}</span>
                </div>
                {displayReport.aiDraft.estimatedCost.quantity && displayReport.aiDraft.estimatedCost.quantity > 1 && (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-gray-400 text-sm">Quantity</span>
                      <span className="text-gray-300 text-sm">{displayReport.aiDraft.estimatedCost.quantity}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-emerald-700/50 flex items-baseline justify-between">
                      <span className="text-gray-300 text-sm font-medium">Total Estimate</span>
                      <span className="text-emerald-200 font-bold text-lg">
                        ${(displayReport.aiDraft.estimatedCost.amount * displayReport.aiDraft.estimatedCost.quantity).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Location Method</h4>
              <p className="text-gray-200 font-medium capitalize">{displayReport.geoMethod}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Reported</h4>
              <p className="text-gray-300 text-sm">{formatDate(displayReport.createdAt)}</p>
            </div>
            <div className="col-span-2">
              <h4 className="text-sm font-medium text-gray-500">Coordinates</h4>
              <p className="text-gray-300 text-sm">
                {displayReport.coordinates.lat.toFixed(6)}, {displayReport.coordinates.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* File Info */}
          <div className="pt-4 border-t border-[#333]">
            <h3 className="text-sm font-medium text-gray-500 mb-2">File Details</h3>
            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
              <span>{displayReport.fileName}</span>
              <span className="text-gray-600">|</span>
              <span>{formatFileSize(displayReport.fileSize)}</span>
              <span className="text-gray-600">|</span>
              <span className="capitalize">{displayReport.mediaType}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#141414] flex gap-3">
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          )}
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-[#333] text-gray-100 rounded-lg font-medium hover:bg-[#404040] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
