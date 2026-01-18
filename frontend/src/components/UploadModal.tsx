'use client';

import { useState, useRef, useCallback } from 'react';
import type { Coordinates, AnalyzeResponse, Report, Category, Severity, ReportContent } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/types';
import { getCurrentPosition } from '@/lib/geo';
import Map from './Map';
import {
  uploadToCloudinary,
  generateThumbnailUrl,
  type CloudinarySignedParams,
  type CloudinaryUploadResponse,
} from '@/lib/cloudinary';

type UploadStep = 'select' | 'converting' | 'location' | 'analyzing' | 'uploading' | 'edit';

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const CATEGORIES: Category[] = [
  'broken_sidewalk',
  'missing_ramp',
  'blocked_path',
  'steep_grade',
  'poor_lighting',
  'narrow_passage',
  'uneven_surface',
  'other',
];

const SEVERITIES: Severity[] = ['low', 'medium', 'high'];

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
  onSubmit: (report: Omit<Report, 'id' | 'createdAt'>) => void | Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onSubmit }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<Coordinates | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<Coordinates | null>(null);
  const [geoMethod, setGeoMethod] = useState<'auto' | 'manual'>('auto');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cloudinaryData, setCloudinaryData] = useState<CloudinaryUploadResponse | null>(null);

  // User-editable content (initialized from AI analysis)
  const [editedContent, setEditedContent] = useState<ReportContent>({
    title: '',
    description: '',
    suggestedFix: '',
    category: 'other',
    severity: 'medium',
    isEdited: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setFile(null);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null);
    setCoordinates(null);
    setGpsCoordinates(null);
    setFlyToPosition(null);
    setGeoMethod('auto');
    setGeoError(null);
    setIsLoadingGps(false);
    setAnalysis(null);
    setError(null);
    setIsSubmitting(false);
    setUploadProgress(0);
    setCloudinaryData(null);
    setEditedContent({
      title: '',
      description: '',
      suggestedFix: '',
      category: 'other',
      severity: 'medium',
      isEdited: false,
    });
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

    // Validate file type
    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    // More specific type validation for images
    if (isImage && !isHeic && !ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // More specific type validation for videos
    if (isVideo && !ALLOWED_VIDEO_TYPES.includes(selectedFile.type)) {
      setError('Please select an MP4 or WebM video');
      return;
    }

    // Validate file size
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (selectedFile.size > maxSize) {
      setError(`File must be under ${maxSize / (1024 * 1024)}MB`);
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

    setStep('location');
    try {
      const pos = await getCurrentPosition();
      setCoordinates(pos);
      setGpsCoordinates(pos);
      setGeoMethod('auto');
      setGeoError(null);
    } catch {
      setGeoError('Could not get your location. Pan the map to set location.');
      setGeoMethod('manual');
    }
  };

  const handleCenterChange = (coords: Coordinates) => {
    // Only update coordinates if we're in location step (not during analyzing/review)
    if (step !== 'location') return;

    setCoordinates(coords);
    // Once user moves the map, mark as manual
    if (gpsCoordinates) {
      const distance = Math.abs(coords.lat - gpsCoordinates.lat) + Math.abs(coords.lng - gpsCoordinates.lng);
      if (distance > 0.0001) {
        setGeoMethod('manual');
      }
    }
  };

  const handleRecenterToGps = async () => {
    setIsLoadingGps(true);
    try {
      const pos = await getCurrentPosition();
      setGpsCoordinates(pos);
      setCoordinates(pos);
      setGeoMethod('auto');
      setGeoError(null);
      // Trigger map to fly to this position
      setFlyToPosition({ ...pos });
    } catch {
      setGeoError('Could not get your location.');
    } finally {
      setIsLoadingGps(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !coordinates) return;

    setStep('analyzing');
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

      // Initialize editable content from AI analysis
      setEditedContent({
        title: result.title,
        description: result.description,
        suggestedFix: result.suggestedFix,
        category: result.category,
        severity: result.severity,
        isEdited: false,
      });

      setStep('edit'); // Go to edit step instead of review
    } catch {
      setError('Failed to analyze media. Please try again.');
      setStep('location');
    }
  };

  const handleSubmit = async () => {
    if (!file || !mediaUrl || !coordinates || !analysis || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    const isImage = file.type.startsWith('image/');

    try {
      let uploadedMediaUrl = mediaUrl;
      let thumbnailUrl: string | null = null;
      let cloudinaryPublicId: string | null = null;
      let imageWidth: number | null = null;
      let imageHeight: number | null = null;
      let imageBytes: number | null = null;

      // Only use Cloudinary for images (videos still use server-side upload)
      if (isImage) {
        try {
          setStep('uploading');

          // Step 1: Get signed upload params from our backend
          const signatureResponse = await fetch('/api/cloudinary/signature');
          if (!signatureResponse.ok) {
            const errorData = await signatureResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to get upload signature');
          }
          const signedParams: CloudinarySignedParams = await signatureResponse.json();

          // Step 2: Upload directly to Cloudinary with progress tracking
          const cloudinaryResponse = await uploadToCloudinary(
            file,
            signedParams,
            (progress) => setUploadProgress(progress)
          );

          // Step 3: Extract Cloudinary data
          uploadedMediaUrl = cloudinaryResponse.secure_url;
          cloudinaryPublicId = cloudinaryResponse.public_id;
          imageWidth = cloudinaryResponse.width;
          imageHeight = cloudinaryResponse.height;
          imageBytes = cloudinaryResponse.bytes;

          // Step 4: Generate thumbnail URL using Cloudinary transformations
          thumbnailUrl = generateThumbnailUrl(cloudinaryPublicId, signedParams.cloudName);

          setCloudinaryData(cloudinaryResponse);
          console.log('Cloudinary upload successful:', {
            publicId: cloudinaryPublicId,
            url: uploadedMediaUrl,
            thumbnail: thumbnailUrl,
          });
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed, falling back to server upload:', cloudinaryError);
          // Fall back to server-side upload if Cloudinary fails
        }
      }

      // Fallback: Use server-side upload if Cloudinary wasn't used or failed
      if (uploadedMediaUrl === mediaUrl) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedMediaUrl = uploadData.url;
            if (uploadData.warning) {
              console.warn(uploadData.warning);
            }
          } else {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('Failed to upload media:', uploadError);
          setError('Failed to upload media. Please try again.');
          setIsSubmitting(false);
          setStep('edit');
          return;
        }
      }

      const report: Omit<Report, 'id' | 'createdAt'> = {
        coordinates,
        mediaUrl: uploadedMediaUrl,
        mediaType: isImage ? 'image' : 'video',
        fileName: file.name,
        fileSize: file.size,
        // New Cloudinary fields
        thumbnailUrl,
        cloudinaryPublicId,
        imageWidth,
        imageHeight,
        imageBytes,
        aiDraft: {
          title: analysis.title,
          description: analysis.description,
          suggestedFix: analysis.suggestedFix,
          category: analysis.category,
          severity: analysis.severity,
          confidence: analysis.confidence,
          generatedAt: new Date().toISOString(),
          estimatedCost: analysis.estimatedCost,
        },
        content: editedContent,
        geoMethod,
        status: 'open',
      };

      await onSubmit(report);
      resetState();
      onClose();
    } catch (submitError) {
      console.error('Failed to submit report:', submitError);
      setError('Failed to submit report. Please try again.');
      setIsSubmitting(false);
      setStep('edit');
    }
  };

  const handleBackFromLocation = () => {
    setStep('select');
    setFile(null);
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(null);
    setCoordinates(null);
    setGpsCoordinates(null);
    setFlyToPosition(null);
    setGeoError(null);
    setAnalysis(null);
  };

  const handleBackToLocation = () => {
    setStep('location');
    setAnalysis(null);
    setError(null);
  };

  if (!isOpen) return null;

  // Full-screen map view for location, analyzing, and uploading steps
  const isMapStep = step === 'location' || step === 'analyzing' || step === 'uploading';

  // Full-screen form for edit step
  const isFormStep = step === 'edit';

  if (isMapStep) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f0f]">
        {/* Full-screen map with centered pin */}
        <div className="absolute inset-0">
          <Map
            reports={[]}
            centerSelectMode={true}
            onCenterChange={handleCenterChange}
            initialCenter={coordinates}
            flyToPosition={flyToPosition}
            disablePan={step === 'analyzing' || step === 'uploading'}
          />
        </div>

        {/* Top controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          {/* Back button */}
          <button
            onClick={handleBackFromLocation}
            disabled={step === 'analyzing' || step === 'uploading'}
            className="w-10 h-10 bg-[#1a1a1a]/90 backdrop-blur border border-[#333] rounded-full flex items-center justify-center shadow-lg hover:bg-[#262626] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* GPS recenter button - only show during location step */}
        {step === 'location' && (
          <button
            onClick={handleRecenterToGps}
            disabled={isLoadingGps}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-[#1a1a1a]/90 backdrop-blur border border-[#333] rounded-full flex items-center justify-center shadow-lg hover:bg-[#262626] transition-colors disabled:opacity-50"
            title="Recenter to GPS"
          >
            {isLoadingGps ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}

        {/* Bottom sheet - content changes based on step */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-[#1a1a1a] rounded-t-3xl border-t border-[#333] shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#404040] rounded-full" />
            </div>

            {/* Content area */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              {/* Error message */}
              {(geoError || error) && (
                <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded-lg text-yellow-400 text-xs sm:text-sm">
                  {geoError || error}
                </div>
              )}

              {/* LOCATION STEP */}
              {step === 'location' && (
                <>
                  <div className="flex gap-3 sm:gap-4 items-start">
                    {/* Thumbnail */}
                    {mediaUrl && file && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#262626] flex-shrink-0">
                        {file.type.startsWith('image/') ? (
                          <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <video src={mediaUrl} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-100 font-semibold text-sm sm:text-base">Confirm barrier location</h3>
                      <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        Pan the map to position the pin
                      </p>
                      {coordinates && (
                        <p className="text-gray-600 text-xs mt-1 truncate">
                          {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                          {geoMethod === 'auto' && ' (GPS)'}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={!coordinates}
                    className="w-full mt-4 py-3 sm:py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirm Location
                  </button>
                </>
              )}

              {/* ANALYZING STEP */}
              {step === 'analyzing' && (
                <div className="flex gap-3 sm:gap-4 items-center">
                  {/* Thumbnail */}
                  {mediaUrl && file && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#262626] flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {/* Loading state */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-100 font-semibold text-sm sm:text-base">Analyzing barrier...</h3>
                      <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                        AI is identifying the issue
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* UPLOADING STEP */}
              {step === 'uploading' && (
                <div className="flex gap-3 sm:gap-4 items-center">
                  {/* Thumbnail */}
                  {mediaUrl && file && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#262626] flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {/* Upload progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full flex-shrink-0" />
                      <div>
                        <h3 className="text-gray-100 font-semibold text-sm sm:text-base">Uploading image...</h3>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          {uploadProgress}% complete
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#333] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-safe-area-inset-bottom bg-[#1a1a1a]" />
          </div>
        </div>
      </div>
    );
  }

  // Full-screen form for edit and review steps
  if (isFormStep && analysis) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f0f] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#333]">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBackToLocation}
              className="w-10 h-10 bg-[#1a1a1a] border border-[#333] rounded-full flex items-center justify-center hover:bg-[#262626] transition-colors"
            >
              <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-gray-100 font-semibold">Edit Report Details</h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-32">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Media preview */}
          <div className="mb-6">
            {mediaUrl && file && (
              <div className="rounded-xl overflow-hidden bg-[#1a1a1a] aspect-video">
                {file.type.startsWith('image/') ? (
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <video src={mediaUrl} controls className="w-full h-full object-contain" />
                )}
              </div>
            )}
            {coordinates && (
              <p className="text-gray-600 text-xs mt-2 text-center">
                Location: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                {geoMethod === 'auto' && ' (GPS)'}
              </p>
            )}
          </div>

          {/* EDIT STEP - Editable form */}
          {step === 'edit' && (
            <div className="space-y-5">
              {/* AI confidence indicator */}
              <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI Analysis ({Math.round(analysis.confidence * 100)}% confidence)</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Review and edit the AI-generated content below
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={editedContent.title}
                  onChange={(e) => setEditedContent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Enter a title for this report"
                />
              </div>

              {/* Category & Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={editedContent.category}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, category: e.target.value as Category }))}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                  <select
                    value={editedContent.severity}
                    onChange={(e) => setEditedContent(prev => ({ ...prev, severity: e.target.value as Severity }))}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  >
                    {SEVERITIES.map(sev => (
                      <option key={sev} value={sev}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editedContent.description}
                  onChange={(e) => setEditedContent(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                  placeholder="Describe the accessibility barrier..."
                />
              </div>

              {/* Suggested Fix */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Suggested Fix</label>
                <textarea
                  value={editedContent.suggestedFix}
                  onChange={(e) => setEditedContent(prev => ({ ...prev, suggestedFix: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                  placeholder="Recommend how to fix this issue..."
                />
              </div>
            </div>
          )}

        </div>

        {/* Bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f]/95 backdrop-blur border-t border-[#333] p-4">
          <div className="flex gap-3">
            <button
              onClick={handleBackToLocation}
              disabled={isSubmitting}
              className="flex-1 py-3.5 text-gray-400 hover:text-gray-200 border border-[#333] rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!editedContent.title.trim() || !editedContent.description.trim() || isSubmitting}
              className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
          {/* Safe area padding for mobile */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </div>
    );
  }

  // Floating modal for select and converting steps
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-[#262626] hover:bg-[#333] rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* File Selection */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="pr-8">
                <h2 className="text-xl font-semibold text-gray-100 mb-1">Report Barrier</h2>
                <p className="text-gray-500 text-sm">
                  Upload a photo or video of the accessibility barrier.
                </p>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#404040] rounded-xl p-8 sm:p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-500 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-300 font-medium text-sm sm:text-base">Tap to upload</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Image or video up to 20MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleClose}
                className="w-full py-2.5 text-gray-400 hover:text-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Converting HEIC */}
          {step === 'converting' && (
            <div className="py-8 sm:py-12 text-center">
              <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-300 font-medium text-sm sm:text-base">Converting image...</p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Please wait</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
