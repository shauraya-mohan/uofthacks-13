/**
 * POST /api/generate-fix
 * Generate a "fixed" version of an accessibility barrier image using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateFixedImage, isImageGenConfigured } from '@/lib/ai/imagen';

export async function POST(request: NextRequest) {
  try {
    // Check if image generation is available
    if (!isImageGenConfigured()) {
      return NextResponse.json(
        { error: 'Image generation not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { imageBase64, mimeType, description, suggestedFix, category } = body;

    // Validate required fields
    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!description || !suggestedFix) {
      return NextResponse.json(
        { error: 'Description and suggested fix are required' },
        { status: 400 }
      );
    }

    console.log('Generating fixed image visualization...');

    // Generate the fixed image
    const result = await generateFixedImage({
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
      description,
      suggestedFix,
      category: category || 'other',
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate fixed image' },
        { status: 500 }
      );
    }

    console.log('Fixed image generated successfully');

    return NextResponse.json({
      fixedImageUrl: `data:${result.fixedImageMimeType};base64,${result.fixedImageBase64}`,
    });
  } catch (error) {
    console.error('Generate fix endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate fixed image' },
      { status: 500 }
    );
  }
}
