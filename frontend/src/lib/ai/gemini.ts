/**
 * Gemini AI Provider
 * Analyzes accessibility barriers using Google's Gemini Vision API
 */

import type { AIProvider, AnalysisInput, AnalysisResult, EstimatedCost } from './types';
import type { Category, Severity } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Valid categories and severities for validation (alphabetical)
const VALID_CATEGORIES: Category[] = [
  'blocked_path',
  'broken_sidewalk',
  'construction_barrier',
  'drainage_issue',
  'missing_ramp',
  'missing_signage',
  'missing_tactile',
  'narrow_passage',
  'no_crossing_signal',
  'no_curb_cut',
  'no_ramp',
  'obstacle_on_path',
  'overgrown_vegetation',
  'parking_violation',
  'poor_lighting',
  'pothole',
  'slippery_surface',
  'steep_grade',
  'uneven_surface',
  'other', // Keep 'other' at the end
];

const VALID_SEVERITIES: Severity[] = ['low', 'medium', 'high'];

/**
 * System prompt for consistent, structured analysis
 */
const ANALYSIS_PROMPT = `You are an accessibility barrier analyzer and cost estimator for Canadian municipalities. Analyze this image and identify any accessibility barriers that would affect wheelchair users, people with mobility aids, or those with visual impairments.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "title": "Short title (3-6 words describing the barrier)",
  "description": "Clear description of the barrier and its impact on accessibility (2-3 sentences)",
  "suggestedFix": "Practical recommendation to fix this issue (1-2 sentences)",
  "category": "one of: blocked_path, broken_sidewalk, construction_barrier, drainage_issue, missing_ramp, missing_signage, missing_tactile, narrow_passage, no_crossing_signal, no_curb_cut, no_ramp, obstacle_on_path, overgrown_vegetation, parking_violation, poor_lighting, pothole, slippery_surface, steep_grade, uneven_surface, other",
  "severity": "low, medium, or high based on safety risk and accessibility impact",
  "confidence": 0.0 to 1.0,
  "estimatedCost": {
    "amount": estimated repair cost in CAD dollars (number, e.g., 500.00),
    "unit": "total" or "per square meter" or "per linear meter" depending on the repair type,
    "quantity": estimated quantity needed (number, optional - use 1 for "total" unit)
  }
}

Category meanings:
- blocked_path: Path obstructed by temporary or permanent objects
- broken_sidewalk: Cracked, damaged, or deteriorated sidewalk
- construction_barrier: Construction site blocking accessible route without detour
- drainage_issue: Water pooling on walkway
- missing_ramp: Missing curb ramp at crossing
- missing_signage: No accessible wayfinding signs
- missing_tactile: Missing tactile warning/guiding strips for visually impaired
- narrow_passage: Pathway too narrow for wheelchairs
- no_crossing_signal: Missing audio/visual pedestrian crossing signal
- no_curb_cut: No curb cut where needed
- no_ramp: Entrance with only stairs, no ramp alternative
- obstacle_on_path: Permanent obstacle (pole, sign, furniture) on walkway
- overgrown_vegetation: Plants blocking or narrowing pathway
- parking_violation: Accessible parking blocked or misused
- poor_lighting: Inadequate lighting for safe navigation
- pothole: Dangerous hole in pavement
- slippery_surface: Wet, icy, or slick surface
- steep_grade: Grade too steep for wheelchair users
- uneven_surface: Uneven or buckled pavement

Guidelines:
- "title" should be descriptive but concise (e.g., "Cracked Sidewalk Section", "Missing Curb Ramp")
- "description" should explain what the barrier is and how it affects mobility
- "suggestedFix" should be actionable and specific
- "severity" should be "high" if it completely blocks access or poses safety risk, "medium" if it creates difficulty, "low" if minor inconvenience
- "confidence" should reflect how certain you are about the analysis
- "estimatedCost" should be a realistic estimate in Canadian dollars based on typical municipal repair costs:
  - Sidewalk repairs: $50-200 CAD per square meter
  - Curb ramp installation: $2,000-5,000 CAD per ramp
  - Lighting installation: $1,500-4,000 CAD per fixture
  - Path clearing/widening: $100-300 CAD per linear meter
  - Surface leveling: $75-150 CAD per square meter
  - Tactile paving: $100-200 CAD per square meter
  - Signage installation: $200-500 CAD per sign
  - Pothole repair: $50-150 CAD per pothole

If no accessibility barrier is visible, use category "other" with a description of what you see.`;

/**
 * Parse and validate the Gemini response
 */
function parseResponse(content: string): AnalysisResult | null {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize fields
    const category: Category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other';

    const severity: Severity = VALID_SEVERITIES.includes(parsed.severity)
      ? parsed.severity
      : 'medium';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.7;

    // Parse estimated cost
    let estimatedCost: EstimatedCost | undefined;
    if (parsed.estimatedCost && typeof parsed.estimatedCost === 'object') {
      const cost = parsed.estimatedCost;
      if (typeof cost.amount === 'number' && cost.amount >= 0) {
        estimatedCost = {
          amount: Math.round(cost.amount * 100) / 100, // Round to 2 decimal places
          unit: String(cost.unit || 'total'),
          quantity: typeof cost.quantity === 'number' && cost.quantity > 0
            ? cost.quantity
            : 1,
        };
      }
    }

    return {
      title: String(parsed.title || 'Accessibility Barrier').slice(0, 100),
      description: String(parsed.description || 'Barrier detected requiring assessment.').slice(0, 500),
      suggestedFix: String(parsed.suggestedFix || 'Professional assessment recommended.').slice(0, 500),
      category,
      severity,
      confidence: Math.round(confidence * 100) / 100,
      estimatedCost,
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return null;
  }
}

/**
 * Gemini AI Provider implementation
 */
export const geminiProvider: AIProvider = {
  name: 'gemini',

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  },

  async analyze(input: AnalysisInput): Promise<AnalysisResult | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured');
      return null;
    }

    try {
      const base64Data = input.buffer.toString('base64');

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: base64Data,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent output
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error('No content in Gemini response');
        return null;
      }

      return parseResponse(content);
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      return null;
    }
  },
};
