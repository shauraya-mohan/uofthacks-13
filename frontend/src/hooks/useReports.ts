'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Report } from '@/lib/types';
import { getReports, saveReports, generateId } from '@/lib/storage';

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getReports();
    setReports(stored);
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever reports change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveReports(reports);
    }
  }, [reports, isLoaded]);

  const addReport = useCallback(
    (reportData: Omit<Report, 'id' | 'createdAt'>): Report => {
      const newReport: Report = {
        ...reportData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setReports((prev) => [...prev, newReport]);
      return newReport;
    },
    []
  );

  const removeReport = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearReports = useCallback(() => {
    setReports([]);
  }, []);

  return {
    reports,
    isLoaded,
    addReport,
    removeReport,
    clearReports,
  };
}
