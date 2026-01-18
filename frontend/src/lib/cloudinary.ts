/**
 * Cloudinary utility functions for image URL transformations and management
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

// Transformation presets for different use cases
export const CLOUDINARY_TRANSFORMATIONS = {
  thumbnail: 'w_400,q_auto,f_auto',  // Fast feed rendering
  full: 'w_1600,q_auto,f_auto',       // Full detail view
  preview: 'w_800,q_auto,f_auto',     // Medium preview
} as const;

/**
 * Check if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}

/**
 * Extract public_id from a Cloudinary URL
 * Example: https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
 * Returns: folder/image
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!isCloudinaryUrl(url)) return null;

  try {
    // Match the path after /upload/ and remove version if present
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;

    // Remove file extension
    const pathWithExtension = match[1];
    const publicId = pathWithExtension.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
}

/**
 * Generate a transformed Cloudinary URL from a public_id or existing URL
 * @param publicIdOrUrl - Either a public_id or a full Cloudinary URL
 * @param transformation - Cloudinary transformation string (e.g., 'w_400,q_auto,f_auto')
 * @param cloudName - Optional cloud name (uses env var if not provided)
 */
export function generateTransformedUrl(
  publicIdOrUrl: string,
  transformation: string,
  cloudName?: string
): string {
  const cloud = cloudName || CLOUDINARY_CLOUD_NAME;

  if (!cloud) {
    // Return original URL if cloudinary not configured
    return publicIdOrUrl;
  }

  // If it's already a Cloudinary URL, extract the public_id
  let publicId = publicIdOrUrl;
  if (isCloudinaryUrl(publicIdOrUrl)) {
    const extracted = extractPublicIdFromUrl(publicIdOrUrl);
    if (!extracted) return publicIdOrUrl; // Return original if extraction fails
    publicId = extracted;
  }

  // Generate transformed URL
  return `https://res.cloudinary.com/${cloud}/image/upload/${transformation}/${publicId}`;
}

/**
 * Generate a thumbnail URL (400px width, auto quality/format)
 */
export function generateThumbnailUrl(publicIdOrUrl: string, cloudName?: string): string {
  return generateTransformedUrl(publicIdOrUrl, CLOUDINARY_TRANSFORMATIONS.thumbnail, cloudName);
}

/**
 * Generate a full-size optimized URL (1600px width, auto quality/format)
 */
export function generateFullUrl(publicIdOrUrl: string, cloudName?: string): string {
  return generateTransformedUrl(publicIdOrUrl, CLOUDINARY_TRANSFORMATIONS.full, cloudName);
}

/**
 * Generate a preview URL (800px width, auto quality/format)
 */
export function generatePreviewUrl(publicIdOrUrl: string, cloudName?: string): string {
  return generateTransformedUrl(publicIdOrUrl, CLOUDINARY_TRANSFORMATIONS.preview, cloudName);
}

/**
 * Response type from Cloudinary upload
 */
export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  resource_type: string;
}

/**
 * Signed upload params from our signature endpoint
 */
export interface CloudinarySignedParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Upload a file directly to Cloudinary from the client
 * @param file - File to upload
 * @param signedParams - Signed parameters from /api/cloudinary/signature
 * @param onProgress - Optional progress callback (0-100)
 */
export async function uploadToCloudinary(
  file: File,
  signedParams: CloudinarySignedParams,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  const { timestamp, signature, apiKey, cloudName, folder } = signedParams;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error?.message || 'Cloudinary upload failed'));
        } catch {
          reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Delete an image from Cloudinary (server-side only)
 * This requires the API secret, so it must be called from an API route
 */
export async function deleteFromCloudinary(
  publicId: string,
  apiKey: string,
  apiSecret: string,
  cloudName: string
): Promise<{ result: string }> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Create signature for deletion
  const crypto = await import('crypto');
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto
    .createHash('sha1')
    .update(signatureString)
    .digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete from Cloudinary');
  }

  return response.json();
}
