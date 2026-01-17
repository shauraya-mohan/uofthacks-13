'use client';

import type { Report } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';

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

export default function PinDrawer({ report, isOpen, onClose }: PinDrawerProps) {
  if (!isOpen || !report) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1a1a1a] border-l border-[#333] shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Report Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Media Preview */}
          <div className="rounded-lg overflow-hidden bg-[#262626]">
            {report.mediaType === 'image' ? (
              <img
                src={report.mediaUrl}
                alt="Barrier"
                className="w-full h-56 object-contain"
              />
            ) : (
              <video
                src={report.mediaUrl}
                controls
                className="w-full h-56 object-contain"
              />
            )}
          </div>

          {/* Category and Severity badges */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#262626] border border-[#333] rounded-full text-sm font-medium text-gray-300">
              {CATEGORY_LABELS[report.analysis.category]}
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: SEVERITY_COLORS[report.analysis.severity] }}
            >
              {report.analysis.severity.charAt(0).toUpperCase() + report.analysis.severity.slice(1)} Severity
            </span>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">AI Summary</h3>
            <p className="text-gray-300">{report.analysis.summary}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Confidence</h4>
              <p className="text-gray-200 font-medium">
                {Math.round(report.analysis.confidence * 100)}%
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Location Method</h4>
              <p className="text-gray-200 font-medium capitalize">{report.geoMethod}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Coordinates</h4>
              <p className="text-gray-300 text-sm">
                {report.coordinates.lat.toFixed(6)}, {report.coordinates.lng.toFixed(6)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Reported</h4>
              <p className="text-gray-300 text-sm">{formatDate(report.createdAt)}</p>
            </div>
          </div>

          {/* File Info */}
          <div className="pt-4 border-t border-[#333]">
            <h3 className="text-sm font-medium text-gray-500 mb-2">File Details</h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
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
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#333] text-gray-100 rounded-lg font-medium hover:bg-[#404040] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
