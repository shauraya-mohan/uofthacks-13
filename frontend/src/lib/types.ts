// Core types for Communify

export type Severity = 'low' | 'medium' | 'high';

export type ReportStatus = 'draft' | 'open' | 'acknowledged' | 'in_progress' | 'resolved';

export type Category =
  | 'blocked_path'
  | 'broken_sidewalk'
  | 'construction_barrier'
  | 'drainage_issue'
  | 'missing_ramp'
  | 'missing_signage'
  | 'missing_tactile'
  | 'narrow_passage'
  | 'no_crossing_signal'
  | 'no_curb_cut'
  | 'no_ramp'
  | 'obstacle_on_path'
  | 'overgrown_vegetation'
  | 'parking_violation'
  | 'poor_lighting'
  | 'pothole'
  | 'slippery_surface'
  | 'steep_grade'
  | 'uneven_surface'
  | 'other';

export interface Coordinates {
  lng: number;
  lat: number;
}

// Estimated repair cost (admin only)
export interface EstimatedCost {
  amount: number;      // Cost in CAD dollars
  unit: string;        // e.g., "total", "per unit", "per meter"
  quantity?: number;   // Optional quantity for calculation
}

// AI-generated draft content (returned from /api/analyze)
export interface AnalyzeResponse {
  title: string;
  description: string;
  suggestedFix: string;
  category: Category;
  severity: Severity;
  confidence: number;
  estimatedCost?: EstimatedCost; // AI-estimated repair cost (admin only)
}

// AI draft stored in database (preserved for analytics/ML improvement)
export interface AiDraft {
  title: string;
  description: string;
  suggestedFix: string;
  category: Category;
  severity: Severity;
  confidence: number;
  generatedAt: string; // ISO timestamp
  estimatedCost?: EstimatedCost; // AI-estimated repair cost (admin only)
}

// User's final content (may be edited from AI draft)
export interface ReportContent {
  title: string;
  description: string;
  suggestedFix: string;
  category: Category;
  severity: Severity;
  isEdited: boolean; // true if user modified AI draft
}

export interface Report {
  id: string;
  coordinates: Coordinates;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  fileName: string;
  fileSize: number;
  // New Cloudinary fields (nullable for backwards compatibility)
  thumbnailUrl?: string | null;
  cloudinaryPublicId?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageBytes?: number | null;
  aiDraft: AiDraft;
  content: ReportContent;
  geoMethod: 'auto' | 'manual';
  status: ReportStatus;
  createdAt: string; // ISO timestamp
}

export interface AdminArea {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
  createdAt: string;
  notificationEmails?: string[]; // Email addresses to notify when new reports are created in this area
}

// Severity color mapping
export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#22c55e',    // green
  medium: '#eab308', // yellow
  high: '#ef4444',   // red
};

// Status outline color mapping for map pins (darker variants)
export const STATUS_OUTLINE_COLORS: Record<ReportStatus, string> = {
  draft: '#4b5563',      // gray-600
  open: '#1d4ed8',       // blue-700
  acknowledged: '#b45309', // amber-700
  in_progress: '#6d28d9',  // purple-700
  resolved: '#15803d',     // green-700
};

// Category display names (alphabetical, 'other' at end)
export const CATEGORY_LABELS: Record<Category, string> = {
  blocked_path: 'Blocked Path',
  broken_sidewalk: 'Broken Sidewalk',
  construction_barrier: 'Construction Barrier',
  drainage_issue: 'Drainage Issue',
  missing_ramp: 'Missing Curb Ramp',
  missing_signage: 'Missing Signage',
  missing_tactile: 'Missing Tactile Paving',
  narrow_passage: 'Narrow Passage',
  no_crossing_signal: 'No Crossing Signal',
  no_curb_cut: 'No Curb Cut',
  no_ramp: 'No Ramp (Stairs Only)',
  obstacle_on_path: 'Obstacle on Path',
  overgrown_vegetation: 'Overgrown Vegetation',
  parking_violation: 'Parking Violation',
  poor_lighting: 'Poor Lighting',
  pothole: 'Pothole',
  slippery_surface: 'Slippery Surface',
  steep_grade: 'Steep Grade',
  uneven_surface: 'Uneven Surface',
  other: 'Other',
};
