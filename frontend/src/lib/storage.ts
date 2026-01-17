// localStorage helpers for MobilityCursor
// 
// ⚠️ DEPRECATED: This file is kept for backwards compatibility only.
// All data is now stored in MongoDB via API routes:
// - Reports: /api/reports
// - Areas: /api/areas
// 
// The hooks (useReports, useAreas) now use the API exclusively.
// This localStorage code is no longer used in the application.

import type { Report, AdminArea } from './types';

const STORAGE_KEYS = {
  reports: 'mobilitycursor:reports',
  areas: 'mobilitycursor:areas',
} as const;

// Type-safe localStorage wrapper
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// Reports
export function getReports(): Report[] {
  return getItem<Report[]>(STORAGE_KEYS.reports, []);
}

export function saveReports(reports: Report[]): void {
  setItem(STORAGE_KEYS.reports, reports);
}

export function addReport(report: Report): Report[] {
  const reports = getReports();
  const updated = [...reports, report];
  saveReports(updated);
  return updated;
}

export function removeReport(id: string): Report[] {
  const reports = getReports();
  const updated = reports.filter((r) => r.id !== id);
  saveReports(updated);
  return updated;
}

// Admin Areas
export function getAreas(): AdminArea[] {
  return getItem<AdminArea[]>(STORAGE_KEYS.areas, []);
}

export function saveAreas(areas: AdminArea[]): void {
  setItem(STORAGE_KEYS.areas, areas);
}

export function addArea(area: AdminArea): AdminArea[] {
  const areas = getAreas();
  const updated = [...areas, area];
  saveAreas(updated);
  return updated;
}

export function updateArea(id: string, updates: Partial<AdminArea>): AdminArea[] {
  const areas = getAreas();
  const updated = areas.map((a) => (a.id === id ? { ...a, ...updates } : a));
  saveAreas(updated);
  return updated;
}

export function removeArea(id: string): AdminArea[] {
  const areas = getAreas();
  const updated = areas.filter((a) => a.id !== id);
  saveAreas(updated);
  return updated;
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
