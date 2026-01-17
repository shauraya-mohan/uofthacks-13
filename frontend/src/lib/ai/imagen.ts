/**
 * Imagen AI Provider
 * Generates "fixed" versions of accessibility barrier images using Gemini's image generation
 */

// Gemini 2.0 Flash Experimental with native image generation
const GEMINI_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface GenerateFixInput {
  imageBase64: string;
  mimeType: string;
  description: string;
  suggestedFix: string;
  category: string;
}

export interface GenerateFixResult {
  fixedImageBase64: string;
  fixedImageMimeType: string;
}

/**
 * Build the prompt for generating a fixed version of the accessibility barrier
 */
function buildFixPrompt(input: GenerateFixInput): string {
  return `You are an urban planning and accessibility visualization expert. Given an image showing an accessibility barrier, generate a photorealistic visualization of how this location would look AFTER the suggested fix has been implemented.

CURRENT BARRIER:
- Category: ${input.category}
- Description: ${input.description}
- Suggested Fix: ${input.suggestedFix}

IMPORTANT INSTRUCTIONS:
1. Keep the same camera angle, lighting, and overall scene composition
2. Only modify the specific area that needs fixing - keep everything else identical
3. The fix should look realistic and professionally done, as if it was actually constructed
4. Maintain the same weather conditions, shadows, and time of day
5. The result should be photorealistic, not an illustration

Generate a single image showing the FIXED version of this accessibility barrier.`;
}

/**
 * Generate a "fixed" version of an accessibility barrier image using Gemini
 */
export async function generateFixedImage(input: GenerateFixInput): Promise<GenerateFixResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API key not configured for image generation');
    return null;
  }

  try {
    const prompt = buildFixPrompt(input);

    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini Image Generation API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    // Find the image part in the response
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) {
      console.error('No parts in Gemini image generation response. Full response:', JSON.stringify(data, null, 2));
      return null;
    }

    // Look for inline_data with image
    for (const part of parts) {
      console.log('Checking part:', Object.keys(part));
      if (part.inline_data?.mime_type?.startsWith('image/')) {
        return {
          fixedImageBase64: part.inline_data.data,
          fixedImageMimeType: part.inline_data.mime_type,
        };
      }
      // Also check for inlineData (camelCase)
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          fixedImageBase64: part.inlineData.data,
          fixedImageMimeType: part.inlineData.mimeType,
        };
      }
    }

    console.error('No image found in Gemini response parts:', JSON.stringify(parts, null, 2));
    return null;
  } catch (error) {
    console.error('Gemini image generation failed:', error);
    return null;
  }
}

/**
 * Check if Gemini image generation is available
 */
export function isImageGenConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
