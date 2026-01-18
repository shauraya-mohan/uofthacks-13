// Core types for MobilityCursor

export type Severity = 'low' | 'medium' | 'high';

export type ReportStatus = 'draft' | 'open' | 'acknowledged' | 'in_progress' | 'resolved';

export type Category =
  | 'broken_sidewalk'
  | 'missing_ramp'
  | 'blocked_path'
  | 'steep_grade'
  | 'poor_lighting'
  | 'narrow_passage'
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

// Category display names
export const CATEGORY_LABELS: Record<Category, string> = {
  broken_sidewalk: 'Broken Sidewalk',
  missing_ramp: 'Missing Ramp',
  blocked_path: 'Blocked Path',
  steep_grade: 'Steep Grade',
  poor_lighting: 'Poor Lighting',
  narrow_passage: 'Narrow Passage',
  uneven_surface: 'Uneven Surface',
  other: 'Other',
};
