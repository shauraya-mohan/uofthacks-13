/**
 * POST /api/analyze
 * Analyze an image or video for accessibility barriers using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeBarrier, getActiveProvider } from '@/lib/ai';

// File size limits
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
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

    // Validate file size
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be under ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Convert to buffer for AI analysis
    const buffer = Buffer.from(await file.arrayBuffer());

    // Log which provider is being used
    const provider = getActiveProvider();
    console.log(`Using AI provider: ${provider.name}`);

    // Analyze the barrier
    const result = await analyzeBarrier(buffer, file.type, file.name);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
