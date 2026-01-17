'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdminArea } from '@/lib/types';
import { getAreas, saveAreas, generateId } from '@/lib/storage';

export function useAreas() {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getAreas();
    setAreas(stored);
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever areas change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveAreas(areas);
    }
  }, [areas, isLoaded]);

  const addArea = useCallback(
    (geometry: GeoJSON.Polygon, name?: string): AdminArea => {
      const newArea: AdminArea = {
        id: generateId(),
        name: name || `Area ${Date.now()}`,
        geometry,
        createdAt: new Date().toISOString(),
      };
      setAreas((prev) => [...prev, newArea]);
      return newArea;
    },
    []
  );

  const updateArea = useCallback(
    (id: string, updates: Partial<Omit<AdminArea, 'id' | 'createdAt'>>) => {
      setAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const removeArea = useCallback((id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAreas = useCallback(() => {
    setAreas([]);
  }, []);

  return {
    areas,
    isLoaded,
    addArea,
    updateArea,
    removeArea,
    clearAreas,
  };
}
