// Amplitude analytics helper

import type { AnalyticsEvent, AnalyticsEventProperties } from './types';

let amplitudeInstance: typeof import('@amplitude/analytics-browser') | null = null;
let initialized = false;

/**
 * Initialize Amplitude SDK
 * Safe to call multiple times - will only init once
 */
export async function initAmplitude(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    console.warn('[Analytics] No Amplitude API key found, tracking disabled');
    return;
  }

  try {
    const amplitude = await import('@amplitude/analytics-browser');
    amplitude.init(apiKey, undefined, {
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: false,
        fileDownloads: false,
      },
    });
    amplitudeInstance = amplitude;
    initialized = true;
    console.log('[Analytics] Amplitude initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize Amplitude:', error);
  }
}

/**
 * Track an analytics event
 */
export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsEventProperties
): void {
  if (!initialized || !amplitudeInstance) {
    console.log(`[Analytics] Would track: ${event}`, properties);
    return;
  }

  try {
    amplitudeInstance.track(event, properties);
    console.log(`[Analytics] Tracked: ${event}`, properties);
  } catch (error) {
    console.error(`[Analytics] Failed to track ${event}:`, error);
  }
}

/**
 * Convenience functions for specific events
 */
export const analytics = {
  reportStart: () => track('report_start'),

  mediaSelected: (mediaType: 'image' | 'video') =>
    track('media_selected', { media_type: mediaType }),

  aiResultShown: (
    category: string,
    severity: string,
    confidence: number,
    geoMethod: 'auto' | 'manual'
  ) =>
    track('ai_result_shown', {
      category: category as AnalyticsEventProperties['category'],
      severity: severity as AnalyticsEventProperties['severity'],
      confidence,
      geo_method: geoMethod,
    }),

  reportSubmitted: (
    reportId: string,
    category: string,
    severity: string,
    mediaType: 'image' | 'video',
    geoMethod: 'auto' | 'manual'
  ) =>
    track('report_submitted', {
      report_id: reportId,
      category: category as AnalyticsEventProperties['category'],
      severity: severity as AnalyticsEventProperties['severity'],
      media_type: mediaType,
      geo_method: geoMethod,
    }),

  pinOpened: (reportId: string, category: string, severity: string) =>
    track('pin_opened', {
      report_id: reportId,
      category: category as AnalyticsEventProperties['category'],
      severity: severity as AnalyticsEventProperties['severity'],
    }),

  adminLoginSuccess: () => track('admin_login_success'),

  adminAreaSaved: (areaId: string) =>
    track('admin_area_saved', { area_id: areaId }),

  adminAreaSelected: (areaId: string, reportCount: number) =>
    track('admin_area_selected', { area_id: areaId, report_count: reportCount }),
};
