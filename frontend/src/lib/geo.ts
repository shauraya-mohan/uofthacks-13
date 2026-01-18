// Geolocation and geometry utilities

import type { Coordinates, Report, AdminArea } from './types';

/**
 * Get current position via browser Geolocation API
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Point-in-polygon test using ray casting algorithm
 * Works with GeoJSON Polygon coordinates (rings)
 */
export function isPointInPolygon(
  point: Coordinates,
  polygon: GeoJSON.Polygon
): boolean {
  const [lng, lat] = [point.lng, point.lat];
  const rings = polygon.coordinates;

  // Check outer ring (first ring) - must be inside
  if (!isPointInRing(lng, lat, rings[0])) {
    return false;
  }

  // Check inner rings (holes) - must be outside all holes
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lng, lat, rings[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Ray casting algorithm for single ring
 */
function isPointInRing(
  x: number,
  y: number,
  ring: GeoJSON.Position[]
): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Get reports that fall inside a given area
 */
export function getReportsInArea(reports: Report[], area: AdminArea): Report[] {
  return reports.filter((report) =>
    isPointInPolygon(report.coordinates, area.geometry)
  );
}

/**
 * Get all areas that contain a given point
 */
export function getAreasContainingPoint(
  point: Coordinates,
  areas: AdminArea[]
): AdminArea[] {
  return areas.filter((area) => isPointInPolygon(point, area.geometry));
}

/**
 * Default map center (Toronto for UofTHacks)
 */
export const DEFAULT_CENTER: Coordinates = {
  lat: 43.6532,
  lng: -79.3832,
};

export const DEFAULT_ZOOM = 15;
