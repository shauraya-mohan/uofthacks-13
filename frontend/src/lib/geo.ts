// Geolocation and geometry utilities

import type { Coordinates, Report, AdminArea } from './types';

/**
 * Custom error class for geolocation with detailed error codes
 */
export class GeoLocationError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'GeoLocationError';
    this.code = code;
  }
}

/**
 * Get current position via browser Geolocation API
 * Mobile browsers require HTTPS for geolocation to work
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    // Check if running in secure context (required for mobile)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      console.warn('Geolocation requires HTTPS on mobile browsers');
      reject(new GeoLocationError(
        0,
        'Location access requires a secure connection (HTTPS). Please use HTTPS or set location manually.'
      ));
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation API not available');
      reject(new GeoLocationError(0, 'Geolocation not supported by your browser'));
      return;
    }

    console.log('Requesting geolocation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Geolocation success:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        // Provide specific error messages based on error code
        let message: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please allow location access in your browser settings.';
            console.warn('Geolocation permission denied by user');
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable. Please check your GPS/location settings.';
            console.warn('Geolocation position unavailable');
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again or set location manually.';
            console.warn('Geolocation request timed out');
            break;
          default:
            message = 'Could not get your location. Please set location manually.';
            console.warn('Geolocation error:', error);
        }
        reject(new GeoLocationError(error.code, message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for mobile GPS initialization
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
