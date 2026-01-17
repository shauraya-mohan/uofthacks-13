'use client';

import { useState, useRef, useCallback } from 'react';
import type { Coordinates, AnalyzeResponse, Report } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import { getCurrentPosition } from '@/lib/geo';
import { analytics } from '@/lib/analytics';
import Map from './Map';

type UploadStep = 'select' | 'converting' | 'location' | 'analyzing' | 'review';

// Check if file is HEIC format
function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif'
  );
}

// Convert HEIC to JPEG (dynamically imports heic2any to avoid SSR issues)
async function convertHeicToJpeg(file: File): Promise<{ blob: Blob; file: File }> {
  const heic2any = (await import('heic2any')).default;

  const convertedBlob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  // heic2any can return Blob or Blob[]
  const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

  // Create a new File object with .jpg extension
  const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  const convertedFile = new File([blob], newFileName, { type: 'image/jpeg' });

  return { blob, file: convertedFile };
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<Report, 'id' | 'createdAt'>) => void;
}

export default function UploadModal({ isOpen, onClose, onSubmit }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [geoMethod, setGeoMethod] = useState<'auto' | 'manual'>('auto');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setFile(null);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null);
    setCoordinates(null);
    setGeoMethod('auto');
    setGeoError(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    setError(null);
  }, [mediaUrl]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check if HEIC - these need special handling
    const isHeic = isHeicFile(selectedFile);
    const isImage = selectedFile.type.startsWith('image/') || isHeic;
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File must be under 20MB');
      return;
    }

    setError(null);

    // Convert HEIC to JPEG for browser compatibility
    let processedFile = selectedFile;
    let processedUrl: string;

    if (isHeic) {
      try {
        setStep('converting');
        const { blob, file: convertedFile } = await convertHeicToJpeg(selectedFile);
        processedFile = convertedFile;
        processedUrl = URL.createObjectURL(blob);
      } catch {
        setError('Failed to convert HEIC image. Please try a different format.');
        setStep('select');
        return;
      }
    } else {
      processedUrl = URL.createObjectURL(selectedFile);
    }

    setFile(processedFile);
    setMediaUrl(processedUrl);

    analytics.mediaSelected(isImage ? 'image' : 'video');

    setStep('location');
    try {
      const pos = await getCurrentPosition();
      setCoordinates(pos);
      setGeoMethod('auto');
      setGeoError(null);
    } catch {
      setGeoError('Could not get your location. Please select on the map.');
      setGeoMethod('manual');
    }
  };

  const handleCenterChange = (coords: Coordinates) => {
    setCoordinates(coords);
    if (geoMethod === 'auto' && geoError === null) {
      // Keep auto if this is the initial position from geolocation
    } else {
      setGeoMethod('manual');
    }
    setGeoError(null);
  };

  const handleAnalyze = async () => {
    if (!file || !coordinates) return;

    setStep('analyzing');
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result: AnalyzeResponse = await response.json();
      setAnalysis(result);
      setStep('review');

      analytics.aiResultShown(result.category, result.severity, result.confidence, geoMethod);
    } catch {
      setError('Failed to analyze media. Please try again.');
      setStep('location');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!file || !mediaUrl || !coordinates || !analysis) return;

    const report: Omit<Report, 'id' | 'createdAt'> = {
      coordinates,
      mediaUrl,
      mediaType: file.type.startsWith('image/') ? 'image' : 'video',
      fileName: file.name,
      fileSize: file.size,
      analysis,
      geoMethod,
    };

    onSubmit(report);
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">Report Accessibility Barrier</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: File Selection */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-400">
                Upload a photo or short video of the accessibility barrier you&apos;ve encountered.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#404040] rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-300 font-medium">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm mt-1">Image or video up to 20MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Step 1.5: Converting HEIC */}
          {step === 'converting' && (
            <div className="py-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-300 font-medium">Converting image...</p>
              <p className="text-gray-500 text-sm mt-1">Converting HEIC to a web-compatible format</p>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 'location' && (
            <div className="space-y-4">
              {mediaUrl && file && (
                <div className="rounded-lg overflow-hidden bg-[#262626] max-h-48">
                  {file.type.startsWith('image/') ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-48 object-contain" />
                  ) : (
                    <video src={mediaUrl} controls className="w-full h-48 object-contain" />
                  )}
                </div>
              )}

              {geoError && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg text-yellow-400 text-sm">
                  {geoError}
                </div>
              )}

              <div>
                <p className="text-gray-400 mb-2">
                  Move the map to position the pin at the barrier location.
                </p>
                <div className="h-64 rounded-lg overflow-hidden border border-[#333]">
                  <Map
                    reports={[]}
                    centerSelectMode={true}
                    onCenterChange={handleCenterChange}
                    initialCenter={coordinates}
                  />
                </div>
                {coordinates && (
                  <p className="text-sm text-gray-500 mt-2">
                    Location: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    {geoMethod === 'auto' && ' (auto-detected)'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-300 font-medium">Analyzing your media...</p>
              <p className="text-gray-500 text-sm mt-1">AI is identifying the barrier type and severity</p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && analysis && (
            <div className="space-y-4">
              {mediaUrl && file && (
                <div className="rounded-lg overflow-hidden bg-[#262626]">
                  {file.type.startsWith('image/') ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-48 object-contain" />
                  ) : (
                    <video src={mediaUrl} controls className="w-full h-48 object-contain" />
                  )}
                </div>
              )}

              {/* AI Analysis Results */}
              <div className="bg-[#262626] border border-[#333] rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-100">AI Analysis</h3>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Category:</span>
                  <span className="font-medium text-gray-200">{CATEGORY_LABELS[analysis.category]}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Severity:</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: SEVERITY_COLORS[analysis.severity] }}
                  >
                    {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Confidence:</span>
                  <span className="font-medium text-gray-200">{Math.round(analysis.confidence * 100)}%</span>
                </div>

                <div>
                  <span className="text-gray-500 text-sm block mb-1">Summary:</span>
                  <p className="text-gray-300">{analysis.summary}</p>
                </div>
              </div>

              {coordinates && (
                <p className="text-sm text-gray-500">
                  Location: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#141414] flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>

          {step === 'location' && (
            <button
              onClick={handleAnalyze}
              disabled={!coordinates || isAnalyzing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyze
            </button>
          )}

          {step === 'review' && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors"
            >
              Submit Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
