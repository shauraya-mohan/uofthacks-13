/**
 * Fallback AI Provider
 * Generates deterministic mock analysis when no AI API is available
 * Used for development and testing
 */

import type { AIProvider, AnalysisInput, AnalysisResult } from './types';
import type { Category, Severity } from '../types';

const CATEGORIES: Category[] = [
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
  construction_barrier: {
    titles: ['Construction Zone Barrier', 'Inaccessible Construction Area', 'Blocked by Construction'],
    descriptions: [
      'Construction site blocking the accessible route without providing an accessible detour.',
      'Construction barrier prevents wheelchair users from using this path. No alternative accessible route is provided.',
    ],
    fixes: [
      'Install accessible temporary pathway around construction zone.',
      'Provide clearly marked accessible detour with appropriate signage.',
    ],
  },
  drainage_issue: {
    titles: ['Water Pooling on Path', 'Drainage Problem', 'Flooded Walkway'],
    descriptions: [
      'Water accumulation on the pathway creates a barrier for wheelchair users and a slip hazard.',
      'Poor drainage causes standing water that blocks accessible passage and creates unsafe conditions.',
    ],
    fixes: [
      'Install proper drainage system to prevent water accumulation.',
      'Regrade the surface to direct water away from the accessible route.',
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
  missing_signage: {
    titles: ['No Accessible Wayfinding', 'Missing Accessibility Signs', 'Inadequate Signage'],
    descriptions: [
      'Lack of accessible wayfinding signage makes navigation difficult for users with disabilities.',
      'Missing or inadequate signage prevents users from identifying accessible routes and facilities.',
    ],
    fixes: [
      'Install accessible wayfinding signs with high contrast and tactile elements.',
      'Add directional signage indicating accessible routes and facilities.',
    ],
  },
  missing_tactile: {
    titles: ['No Tactile Paving', 'Missing Warning Strips', 'Absent Tactile Indicators'],
    descriptions: [
      'Missing tactile warning strips at crossing or hazard area. Visually impaired users cannot detect the transition.',
      'No tactile guiding strips to help visually impaired users navigate safely.',
    ],
    fixes: [
      'Install detectable warning surfaces (tactile paving) at transitions and hazards.',
      'Add tactile guiding strips along the accessible route.',
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
  no_crossing_signal: {
    titles: ['No Accessible Crossing Signal', 'Missing Pedestrian Signal', 'No Audio Crossing Alert'],
    descriptions: [
      'Intersection lacks accessible pedestrian signals. Visually impaired users cannot safely determine when to cross.',
      'Missing audible or tactile crossing signals prevent safe independent crossing for users with visual impairments.',
    ],
    fixes: [
      'Install accessible pedestrian signals (APS) with audible and tactile indicators.',
      'Add countdown timers and audible alerts to existing crossing signals.',
    ],
  },
  no_curb_cut: {
    titles: ['No Curb Cut', 'Missing Curb Depression', 'Inaccessible Curb'],
    descriptions: [
      'Curb lacks a cut or depression for wheelchair access. Users cannot transition from street to sidewalk.',
      'No curb cut at this location forces wheelchair users to travel in the roadway or find alternative routes.',
    ],
    fixes: [
      'Install a curb cut with proper slope and detectable warning surface.',
      'Add a flush transition between street and sidewalk levels.',
    ],
  },
  no_ramp: {
    titles: ['Stairs Only - No Ramp', 'Inaccessible Entrance', 'No Wheelchair Ramp'],
    descriptions: [
      'Entrance accessible only by stairs with no ramp alternative. Wheelchair users cannot access this location.',
      'Building or area entry requires climbing stairs. No accessible ramp is provided for mobility device users.',
    ],
    fixes: [
      'Install an accessible ramp alongside stairs with proper slope ratio.',
      'Add a permanent or portable ramp to provide wheelchair access.',
    ],
  },
  obstacle_on_path: {
    titles: ['Permanent Obstacle', 'Fixed Barrier on Path', 'Obstructing Object'],
    descriptions: [
      'Permanent fixture (pole, sign, furniture) obstructs the accessible path of travel.',
      'Fixed obstacle reduces clear width below accessibility requirements or blocks passage entirely.',
    ],
    fixes: [
      'Relocate the obstacle to maintain minimum 36-inch clear passage width.',
      'Remove or reposition the fixture to restore accessible routing.',
    ],
  },
  overgrown_vegetation: {
    titles: ['Overgrown Plants Blocking Path', 'Vegetation Obstruction', 'Encroaching Landscaping'],
    descriptions: [
      'Overgrown vegetation narrows or blocks the accessible pathway.',
      'Plants have encroached onto the walkway, reducing clear width and creating obstacles.',
    ],
    fixes: [
      'Trim vegetation to maintain minimum required pathway clearance.',
      'Establish regular landscaping maintenance schedule to prevent obstruction.',
    ],
  },
  parking_violation: {
    titles: ['Blocked Accessible Parking', 'Parking Violation', 'Misused Accessible Space'],
    descriptions: [
      'Accessible parking space blocked or improperly used, preventing access for users who need it.',
      'Vehicle parked illegally in accessible space or access aisle, blocking wheelchair users.',
    ],
    fixes: [
      'Enforce accessible parking regulations and issue violations.',
      'Install better signage and physical barriers to prevent misuse.',
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
  pothole: {
    titles: ['Dangerous Pothole', 'Pavement Hole', 'Deep Surface Damage'],
    descriptions: [
      'Pothole in the pathway creates a serious hazard for wheelchair users and can cause tipping or wheel damage.',
      'Deep hole in the pavement prevents safe passage for mobility devices.',
    ],
    fixes: [
      'Fill and repair the pothole to restore a smooth, level surface.',
      'Replace damaged pavement section to eliminate the hazard.',
    ],
  },
  slippery_surface: {
    titles: ['Slippery Surface Hazard', 'Slick Pavement', 'Low Traction Area'],
    descriptions: [
      'Surface is slippery when wet, creating a fall hazard and making wheelchair propulsion difficult.',
      'Low-traction surface poses risks for all users, especially those with mobility devices or balance issues.',
    ],
    fixes: [
      'Apply anti-slip coating or textured surface treatment.',
      'Replace with slip-resistant pavement material.',
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
