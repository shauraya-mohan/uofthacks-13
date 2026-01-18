/**
 * Server-side geolocation utilities
 * These functions can be used in API routes without browser dependencies
 */

import type { AdminArea } from './types';

interface Coordinates {
  lng: number;
  lat: number;
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
 * Get all areas that contain a given point
 */
export function getAreasContainingPoint(
  point: Coordinates,
  areas: AdminArea[]
): AdminArea[] {
  return areas.filter((area) => isPointInPolygon(point, area.geometry));
}
