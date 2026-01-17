// Core types for MobilityCursor

export type Severity = 'low' | 'medium' | 'high';

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

export interface AnalyzeResponse {
  category: Category;
  severity: Severity;
  summary: string;
  confidence: number;
}

export interface Report {
  id: string;
  coordinates: Coordinates;
  mediaUrl: string; // Object URL for local preview
  mediaType: 'image' | 'video';
  fileName: string;
  fileSize: number;
  analysis: AnalyzeResponse;
  geoMethod: 'auto' | 'manual';
  createdAt: string; // ISO timestamp
}

export interface AdminArea {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon;
  createdAt: string;
}

// Amplitude event types
export type AnalyticsEvent =
  | 'report_start'
  | 'media_selected'
  | 'ai_result_shown'
  | 'report_submitted'
  | 'pin_opened'
  | 'admin_login_success'
  | 'admin_area_saved'
  | 'admin_area_selected';

export interface AnalyticsEventProperties {
  media_type?: 'image' | 'video';
  category?: Category;
  severity?: Severity;
  confidence?: number;
  geo_method?: 'auto' | 'manual';
  area_id?: string;
  report_id?: string;
  report_count?: number;
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
