import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'mobilitycursor';

/**
 * GET /api/cloudinary/signature
 * Returns signed upload parameters for client-side direct upload to Cloudinary.
 * Does NOT expose the API secret.
 */
export async function GET() {
  // Check if Cloudinary is configured
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      {
        error: 'Cloudinary not configured',
        message: 'Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
      },
      { status: 503 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Parameters to sign (must be in alphabetical order)
  const paramsToSign = {
    folder: CLOUDINARY_FOLDER,
    timestamp: timestamp,
  };

  // Create signature string
  // Parameters must be in alphabetical order for signature
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
    .join('&');

  const signatureString = `${sortedParams}${CLOUDINARY_API_SECRET}`;
  const signature = crypto
    .createHash('sha1')
    .update(signatureString)
    .digest('hex');

  // Return signed params (without exposing the secret)
  return NextResponse.json({
    timestamp,
    signature,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: CLOUDINARY_FOLDER,
  });
}
