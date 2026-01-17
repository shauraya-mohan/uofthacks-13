import { NextRequest, NextResponse } from 'next/server';

// Cloudinary upload configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Upload media to Cloudinary
 * Falls back to base64 data URL if Cloudinary is not configured
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'File must be an image or video' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be under ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // If Cloudinary is configured, upload there
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      try {
        const uploadUrl = await uploadToCloudinary(file, isVideo);
        return NextResponse.json({
          url: uploadUrl,
          provider: 'cloudinary',
          fileName: file.name,
          fileSize: file.size,
          mediaType: isImage ? 'image' : 'video',
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to base64:', cloudinaryError);
        // Fall through to base64 fallback
      }
    }

    // Fallback: Convert to base64 data URL (not recommended for production)
    console.warn('Cloudinary not configured, using base64 fallback');
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      provider: 'base64',
      fileName: file.name,
      fileSize: file.size,
      mediaType: isImage ? 'image' : 'video',
      warning: 'Using base64 storage - configure Cloudinary for production',
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Upload file to Cloudinary
 */
async function uploadToCloudinary(file: File, isVideo: boolean): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64File = buffer.toString('base64');
  const dataUri = `data:${file.type};base64,${base64File}`;

  // Generate signature for authenticated upload
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'mobilitycursor';
  const resourceType = isVideo ? 'video' : 'image';

  // Create signature string
  const crypto = await import('crypto');
  const signatureString = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto
    .createHash('sha256')
    .update(signatureString)
    .digest('hex');

  // Upload to Cloudinary
  const uploadFormData = new FormData();
  uploadFormData.append('file', dataUri);
  uploadFormData.append('api_key', CLOUDINARY_API_KEY!);
  uploadFormData.append('timestamp', timestamp.toString());
  uploadFormData.append('signature', signature);
  uploadFormData.append('folder', folder);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  
  const response = await fetch(cloudinaryUrl, {
    method: 'POST',
    body: uploadFormData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.secure_url;
}

