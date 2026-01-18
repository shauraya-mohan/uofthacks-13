'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdminArea } from '@/lib/types';

export function useAreas() {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from API on mount
  useEffect(() => {
    async function fetchAreas() {
      try {
        const response = await fetch('/api/areas');
        if (response.ok) {
          const data = await response.json();
          setAreas(data);
        }
      } catch (error) {
        console.error('Failed to fetch areas:', error);
      } finally {
        setIsLoaded(true);
      }
    }
    fetchAreas();
  }, []);

  const addArea = useCallback(
    async (geometry: GeoJSON.Polygon, name?: string): Promise<AdminArea | null> => {
      try {
        const response = await fetch('/api/areas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ geometry, name }),
        });

        if (!response.ok) {
          throw new Error('Failed to create area');
        }

        const newArea: AdminArea = await response.json();
        setAreas((prev) => [newArea, ...prev]);
        return newArea;
      } catch (error) {
        console.error('Failed to add area:', error);
        return null;
      }
    },
    []
  );

  const updateArea = useCallback(
    async (id: string, updates: Partial<Omit<AdminArea, 'id' | 'createdAt'>>): Promise<boolean> => {
      // Store original area for potential rollback
      const originalAreas = areas;

      // Optimistic update locally
      setAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );

      // Persist to database
      try {
        const response = await fetch(`/api/areas/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setAreas(originalAreas);
          console.error('Failed to update area');
          return false;
        }
        return true;
      } catch (error) {
        console.error('Failed to update area:', error);
        // Revert optimistic update on error
        setAreas(originalAreas);
        return false;
      }
    },
    [areas]
  );

  const removeArea = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/areas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAreas((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to remove area:', error);
    }
  }, []);

  const clearAreas = useCallback(() => {
    setAreas([]);
  }, []);

  const refreshAreas = useCallback(async () => {
    try {
      const response = await fetch('/api/areas');
      if (response.ok) {
        const data = await response.json();
        setAreas(data);
      }
    } catch (error) {
      console.error('Failed to refresh areas:', error);
    }
  }, []);

  const reorderAreas = useCallback((orderedIds: string[]) => {
    setAreas((prev) => {
      const areaMap = new Map(prev.map((a) => [a.id, a]));
      return orderedIds
        .map((id) => areaMap.get(id))
        .filter((a): a is AdminArea => a !== undefined);
    });
  }, []);

  return {
    areas,
    isLoaded,
    addArea,
    updateArea,
    removeArea,
    clearAreas,
    refreshAreas,
    reorderAreas,
  };
}
