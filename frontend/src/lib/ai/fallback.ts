/**
 * Fallback AI Provider
 * Generates deterministic mock analysis when no AI API is available
 * Used for development and testing
 */

import type { AIProvider, AnalysisInput, AnalysisResult } from './types';
import type { Category, Severity } from '../types';

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

/**
 * Content templates for each category
 */
const CONTENT: Record<Category, {
  titles: string[];
  descriptions: string[];
  fixes: string[];
}> = {
  broken_sidewalk: {
    titles: ['Cracked Sidewalk Section', 'Damaged Pavement', 'Broken Concrete Path'],
    descriptions: [
      'Cracked concrete sidewalk creating an uneven surface. This poses a tripping hazard and makes wheelchair navigation difficult.',
      'Damaged pavement with visible cracks and raised sections. The uneven surface can cause mobility devices to tip or get stuck.',
    ],
    fixes: [
      'Replace damaged concrete sections with new ADA-compliant sidewalk material.',
      'Repair cracks and level the surface to meet accessibility standards.',
    ],
  },
  missing_ramp: {
    titles: ['Missing Curb Ramp', 'No Wheelchair Access', 'Absent Accessibility Ramp'],
    descriptions: [
      'Curb without accessibility ramp blocks wheelchair users from crossing. Users must find alternative routes or risk using the roadway.',
      'No ramp available at this transition point. This prevents independent access for wheelchair users and those with mobility aids.',
    ],
    fixes: [
      'Install a compliant curb ramp with proper slope ratio and detectable warning surface.',
      'Add accessibility ramp meeting ADA specifications with appropriate handrails.',
    ],
  },
  blocked_path: {
    titles: ['Obstructed Pathway', 'Blocked Accessible Route', 'Path Obstruction'],
    descriptions: [
      'Pathway blocked by obstacles preventing passage. No accessible detour is provided for mobility device users.',
      'Accessible route obstructed, forcing users to find alternative paths or navigate around obstacles unsafely.',
    ],
    fixes: [
      'Remove obstructions and ensure minimum 36-inch clear passage width.',
      'Clear the pathway and establish proper accessible routing.',
    ],
  },
  steep_grade: {
    titles: ['Steep Slope Hazard', 'Excessive Incline', 'Non-Compliant Grade'],
    descriptions: [
      'Slope exceeds ADA maximum grade requirements. This makes independent wheelchair navigation dangerous or impossible.',
      'Steep incline that does not meet accessibility standards. Users may lose control or be unable to ascend independently.',
    ],
    fixes: [
      'Regrade pathway to meet ADA slope requirements (max 1:12 ratio).',
      'Install switchback ramp design or provide alternative accessible route.',
    ],
  },
  poor_lighting: {
    titles: ['Inadequate Lighting', 'Dark Pathway Area', 'Poor Visibility Zone'],
    descriptions: [
      'Insufficient lighting creates safety concerns. Users cannot see surface hazards or obstacles clearly.',
      'Poorly lit area making it difficult to identify barriers or changes in surface level.',
    ],
    fixes: [
      'Install adequate pedestrian-scale lighting meeting safety standards.',
      'Add lighting fixtures to ensure proper illumination of the accessible route.',
    ],
  },
  narrow_passage: {
    titles: ['Narrow Passageway', 'Restricted Width Path', 'Tight Corridor'],
    descriptions: [
      'Pathway width is below the required minimum for wheelchair access. Users cannot pass through independently.',
      'Passage too narrow for mobility devices. The restricted width prevents accessible navigation.',
    ],
    fixes: [
      'Widen pathway to minimum 36-inch clear width (48 inches preferred).',
      'Remove obstacles or relocate fixtures to achieve required passage width.',
    ],
  },
  uneven_surface: {
    titles: ['Uneven Surface', 'Irregular Pavement', 'Bumpy Pathway'],
    descriptions: [
      'Uneven surface creates difficulty for wheelchair navigation. The irregular terrain causes jarring and potential tipping.',
      'Surface irregularities make mobility device use challenging and create tripping hazards for all pedestrians.',
    ],
    fixes: [
      'Resurface the area to create a smooth, level pathway.',
      'Repair surface irregularities to meet accessibility surface requirements.',
    ],
  },
  other: {
    titles: ['Accessibility Concern', 'Potential Barrier', 'Access Issue'],
    descriptions: [
      'Potential accessibility barrier identified requiring further assessment.',
      'Area may present accessibility challenges for mobility device users.',
    ],
    fixes: [
      'Conduct detailed accessibility assessment to determine appropriate remediation.',
      'Evaluate the area for compliance with accessibility standards.',
    ],
  },
};

/**
 * Simple hash function for deterministic selection
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Fallback provider implementation
 */
export const fallbackProvider: AIProvider = {
  name: 'fallback',

  isConfigured(): boolean {
    return true; // Always available
  },

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate deterministic but varied results based on input
    const seed = hash(`${input.fileName}-${input.mimeType}-${input.buffer.length}`);

    const categoryIndex = seed % CATEGORIES.length;
    const severityIndex = (seed >> 3) % SEVERITIES.length;
    const variantIndex = (seed >> 6) % 2;

    const category = CATEGORIES[categoryIndex];
    const severity = SEVERITIES[severityIndex];
    const content = CONTENT[category];

    const titleIndex = seed % content.titles.length;
    const descIndex = variantIndex % content.descriptions.length;
    const fixIndex = variantIndex % content.fixes.length;

    return {
      title: content.titles[titleIndex],
      description: content.descriptions[descIndex],
      suggestedFix: content.fixes[fixIndex],
      category,
      severity,
      confidence: 0.7 + (seed % 20) / 100, // 0.70 - 0.89
    };
  },
};
