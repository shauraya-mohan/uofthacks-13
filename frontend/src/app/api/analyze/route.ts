import { NextRequest, NextResponse } from 'next/server';
import type { Category, Severity, AnalyzeResponse } from '@/lib/types';

// Categories for deterministic mock
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

const SUMMARIES: Record<Category, string[]> = {
  broken_sidewalk: [
    'Cracked concrete sidewalk with uneven surface creating a tripping hazard for wheelchair users.',
    'Large section of broken sidewalk with exposed aggregate and raised edges.',
    'Deteriorated sidewalk with multiple cracks and displaced slabs.',
  ],
  missing_ramp: [
    'Curb without a ramp at pedestrian crossing, blocking wheelchair and mobility device access.',
    'Missing curb cut at intersection corner, forcing users onto the street.',
    'No accessible ramp present at building entrance.',
  ],
  blocked_path: [
    'Sidewalk obstructed by construction equipment without accessible detour.',
    'Parked vehicles blocking the accessible pathway.',
    'Overgrown vegetation narrowing the accessible route.',
  ],
  steep_grade: [
    'Steep incline exceeding ADA slope requirements for wheelchair access.',
    'Sharp grade change at pathway transition without proper leveling.',
    'Excessive cross-slope making wheelchair navigation difficult.',
  ],
  poor_lighting: [
    'Insufficient lighting along accessible pathway creating safety concerns.',
    'Broken street light leaving dark section of sidewalk.',
    'No illumination at crosswalk reducing visibility for all users.',
  ],
  narrow_passage: [
    'Pathway width insufficient for wheelchair passage between obstacles.',
    'Narrow doorway not meeting accessibility width requirements.',
    'Constricted passageway due to permanent fixtures.',
  ],
  uneven_surface: [
    'Bumpy or uneven pavement surface causing mobility challenges.',
    'Loose gravel surface not suitable for wheelchair navigation.',
    'Tree root damage causing raised sections in pathway.',
  ],
  other: [
    'Accessibility barrier requiring further investigation.',
    'Potential obstacle affecting mobility device users.',
    'Reported barrier with unusual characteristics.',
  ],
};

/**
 * Simple hash function for deterministic mock results
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic mock analysis based on file metadata
 */
function generateMockAnalysis(
  fileName: string,
  fileType: string,
  fileSize: number
): AnalyzeResponse {
  // Create a deterministic seed from file properties
  const seed = simpleHash(`${fileName}-${fileType}-${fileSize}`);

  const categoryIndex = seed % CATEGORIES.length;
  const severityIndex = (seed >> 3) % SEVERITIES.length;
  const summaryIndex = (seed >> 6) % 3;

  const category = CATEGORIES[categoryIndex];
  const severity = SEVERITIES[severityIndex];
  const summary = SUMMARIES[category][summaryIndex];

  // Confidence between 0.65 and 0.95, deterministic
  const confidence = 0.65 + ((seed % 30) / 100);

  return {
    category,
    severity,
    summary,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Call OpenAI Vision API for real analysis (optional)
 */
async function analyzeWithOpenAI(
  fileBuffer: Buffer,
  fileType: string
): Promise<AnalyzeResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const base64 = fileBuffer.toString('base64');
    const mediaType = fileType.startsWith('image/') ? fileType : 'image/jpeg';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image of a potential accessibility barrier. Respond with JSON only:
{
  "category": one of ["broken_sidewalk", "missing_ramp", "blocked_path", "steep_grade", "poor_lighting", "narrow_passage", "uneven_surface", "other"],
  "severity": one of ["low", "medium", "high"],
  "summary": "1-2 sentence description of the barrier and its impact on mobility device users",
  "confidence": number between 0 and 1
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize response
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'other',
      severity: SEVERITIES.includes(parsed.severity) ? parsed.severity : 'medium',
      summary: String(parsed.summary || 'Accessibility barrier detected.'),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
    };
  } catch (error) {
    console.error('OpenAI analysis failed:', error);
    return null;
  }
}

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

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be under 20MB' },
        { status: 400 }
      );
    }

    // Try real AI analysis first (only for images currently)
    let result: AnalyzeResponse | null = null;

    if (isImage && process.env.OPENAI_API_KEY) {
      const buffer = Buffer.from(await file.arrayBuffer());
      result = await analyzeWithOpenAI(buffer, file.type);
    }

    // Fall back to mock analysis
    if (!result) {
      // Simulate processing delay for demo effect
      await new Promise((resolve) => setTimeout(resolve, 800));
      result = generateMockAnalysis(file.name, file.type, file.size);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
