// TwelveLabs API client for video analysis

import type { AnalyzeResponse, Category, Severity } from './types';

const TWELVELABS_API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_URL = 'https://api.twelvelabs.io/v1.2';

interface TwelveLabsAnalysisResult {
  category: Category;
  severity: Severity;
  summary: string;
  confidence: number;
}

/**
 * Check if TwelveLabs is configured
 */
export function isTwelveLabsConfigured(): boolean {
  return !!TWELVELABS_API_KEY;
}

/**
 * Analyze video using TwelveLabs API
 */
export async function analyzeVideoWithTwelveLabs(
  videoBuffer: Buffer,
  fileName: string
): Promise<AnalyzeResponse | null> {
  if (!TWELVELABS_API_KEY) {
    console.warn('TwelveLabs API key not configured');
    return null;
  }

  try {
    // Step 1: Create an index (or use existing one)
    const indexId = await getOrCreateIndex();

    // Step 2: Upload video to TwelveLabs
    const videoId = await uploadVideo(indexId, videoBuffer, fileName);

    // Step 3: Wait for video to be indexed
    await waitForVideoIndexing(videoId);

    // Step 4: Generate analysis using text-to-video search
    const analysis = await generateAccessibilityAnalysis(indexId, videoId);

    return analysis;
  } catch (error) {
    console.error('TwelveLabs analysis failed:', error);
    return null;
  }
}

/**
 * Get or create an index for accessibility videos
 */
async function getOrCreateIndex(): Promise<string> {
  // Check if index exists
  const listResponse = await fetch(`${TWELVELABS_API_URL}/indexes`, {
    headers: {
      'x-api-key': TWELVELABS_API_KEY!,
    },
  });

  if (listResponse.ok) {
    const data = await listResponse.json();
    const existingIndex = data.data?.find(
      (idx: any) => idx.index_name === 'accessibility-barriers'
    );
    
    if (existingIndex) {
      return existingIndex._id;
    }
  }

  // Create new index
  const createResponse = await fetch(`${TWELVELABS_API_URL}/indexes`, {
    method: 'POST',
    headers: {
      'x-api-key': TWELVELABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      index_name: 'accessibility-barriers',
      engines: [
        {
          engine_name: 'marengo2.6',
          engine_options: ['visual', 'conversation'],
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    throw new Error('Failed to create TwelveLabs index');
  }

  const data = await createResponse.json();
  return data._id;
}

/**
 * Upload video to TwelveLabs
 */
async function uploadVideo(
  indexId: string,
  videoBuffer: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([videoBuffer], { type: 'video/mp4' });
  formData.append('video_file', blob, fileName);
  formData.append('index_id', indexId);

  const response = await fetch(`${TWELVELABS_API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'x-api-key': TWELVELABS_API_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload video to TwelveLabs');
  }

  const data = await response.json();
  return data._id;
}

/**
 * Wait for video to be indexed
 */
async function waitForVideoIndexing(taskId: string): Promise<void> {
  const maxAttempts = 60; // 5 minutes max
  const delayMs = 5000; // Check every 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${TWELVELABS_API_URL}/tasks/${taskId}`, {
      headers: {
        'x-api-key': TWELVELABS_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check indexing status');
    }

    const data = await response.json();
    
    if (data.status === 'ready') {
      return;
    }
    
    if (data.status === 'failed') {
      throw new Error('Video indexing failed');
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Video indexing timed out');
}

/**
 * Generate accessibility analysis using TwelveLabs search
 */
async function generateAccessibilityAnalysis(
  indexId: string,
  videoId: string
): Promise<AnalyzeResponse> {
  // Use semantic search to identify accessibility barriers
  const queries = [
    'accessibility barrier',
    'broken sidewalk or pavement',
    'missing wheelchair ramp',
    'blocked pathway or obstruction',
    'steep slope or incline',
    'poor lighting or visibility',
    'narrow passage or doorway',
  ];

  // Search for each type of barrier
  const searchPromises = queries.map((query) =>
    fetch(`${TWELVELABS_API_URL}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': TWELVELABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        index_id: indexId,
        search_options: ['visual', 'conversation'],
        filter: {
          video_id: videoId,
        },
      }),
    }).then((r) => (r.ok ? r.json() : null))
  );

  const results = await Promise.all(searchPromises);

  // Analyze results to determine category and severity
  let bestMatch = { category: 'other' as Category, confidence: 0, description: '' };

  results.forEach((result, index) => {
    if (result && result.data && result.data.length > 0) {
      const match = result.data[0];
      if (match.confidence > bestMatch.confidence) {
        bestMatch = {
          confidence: match.confidence,
          description: match.metadata?.text || queries[index],
          category: categorizFromQuery(queries[index]),
        };
      }
    }
  });

  // Determine severity based on confidence and category
  const severity = determineSeverity(bestMatch.category, bestMatch.confidence);

  return {
    category: bestMatch.category,
    severity,
    summary: generateSummary(bestMatch.category, bestMatch.description),
    confidence: Math.min(0.95, bestMatch.confidence),
  };
}

/**
 * Map search query to barrier category
 */
function categorizFromQuery(query: string): Category {
  if (query.includes('broken sidewalk') || query.includes('pavement')) {
    return 'broken_sidewalk';
  }
  if (query.includes('ramp')) {
    return 'missing_ramp';
  }
  if (query.includes('blocked') || query.includes('obstruction')) {
    return 'blocked_path';
  }
  if (query.includes('steep') || query.includes('slope')) {
    return 'steep_grade';
  }
  if (query.includes('lighting') || query.includes('visibility')) {
    return 'poor_lighting';
  }
  if (query.includes('narrow')) {
    return 'narrow_passage';
  }
  return 'other';
}

/**
 * Determine severity based on category and confidence
 */
function determineSeverity(category: Category, confidence: number): Severity {
  // High priority categories
  const highPriorityCategories: Category[] = ['missing_ramp', 'blocked_path', 'steep_grade'];
  
  if (highPriorityCategories.includes(category) && confidence > 0.7) {
    return 'high';
  }
  
  if (confidence > 0.8) {
    return 'high';
  }
  
  if (confidence > 0.6) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Generate human-readable summary
 */
function generateSummary(category: Category, description: string): string {
  const summaries: Record<Category, string> = {
    broken_sidewalk: 'Video shows damaged or broken sidewalk surface that could impede wheelchair access and pose tripping hazards.',
    missing_ramp: 'Video identifies a location missing an accessibility ramp, blocking wheelchair and mobility device users from accessing the area.',
    blocked_path: 'Video shows an obstructed pathway that prevents safe passage for mobility device users.',
    steep_grade: 'Video captures a steep incline or slope that exceeds ADA guidelines for wheelchair accessibility.',
    poor_lighting: 'Video demonstrates inadequate lighting conditions that create safety concerns for all users, especially those with mobility challenges.',
    narrow_passage: 'Video shows a narrow passage or doorway that does not meet accessibility width requirements.',
    uneven_surface: 'Video reveals an uneven surface that could cause difficulty for wheelchair navigation.',
    other: 'Video identifies an accessibility concern that requires further investigation.',
  };

  return summaries[category] || summaries.other;
}

