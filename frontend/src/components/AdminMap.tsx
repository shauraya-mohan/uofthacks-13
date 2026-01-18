'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Report, AdminArea } from '@/lib/types';
import { SEVERITY_COLORS, CATEGORY_LABELS, STATUS_OUTLINE_COLORS } from '@/lib/types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/geo';

// Marker size constants
const MARKER_SIZE = 20;
const MARKER_SIZE_HOVER = 26;
const MARKER_SIZE_HIGHLIGHT = 28;

// Create popup HTML content for a report
function createPopupContent(report: Report): string {
  // Use thumbnailUrl for faster loading in popups, fallback to mediaUrl for backwards compatibility
  const imageUrl = report.thumbnailUrl || report.mediaUrl;
  const mediaHtml = report.mediaType === 'image'
    ? `<img src="${imageUrl}" alt="Report" style="width:100%;height:120px;object-fit:cover;border-radius:4px;" loading="lazy" />`
    : `<video src="${report.mediaUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;" muted autoplay loop playsinline></video>`;

  const severityColor = SEVERITY_COLORS[report.content.severity];
  const categoryLabel = CATEGORY_LABELS[report.content.category];

  return `
    <div style="width:180px;font-family:system-ui,sans-serif;">
      ${mediaHtml}
      <div style="padding:8px 0 4px;">
        <div style="font-weight:600;font-size:13px;color:#f5f5f5;margin-bottom:4px;">${report.content.title}</div>
        <div style="font-size:11px;color:#a3a3a3;margin-bottom:4px;">${categoryLabel}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${severityColor};"></span>
          <span style="font-size:12px;color:#a3a3a3;text-transform:capitalize;">${report.content.severity} severity</span>
        </div>
      </div>
    </div>
  `;
}

interface MarkerData {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
  reportId: string;
  severity: Report['content']['severity'];
}

interface AdminMapProps {
  reports: Report[];
  areas: AdminArea[];
  selectedAreaId: string | null;
  highlightedReportIds: string[];
  onAreaCreated: (geometry: GeoJSON.Polygon) => void | Promise<void>;
  onAreaDeleted: (areaId: string) => void | Promise<void>;
  onPinClick?: (report: Report) => void;
  className?: string;
}

export default function AdminMap({
  reports,
  areas,
  selectedAreaId,
  highlightedReportIds,
  onAreaCreated,
  onAreaDeleted,
  onPinClick,
  className = '',
}: AdminMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const markersData = useRef<globalThis.Map<string, MarkerData>>(new globalThis.Map());
  const areaIdMap = useRef<globalThis.Map<string, string>>(new globalThis.Map()); // Mapbox Draw ID -> Our Area ID
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const reportsRef = useRef(reports);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Keep refs updated
  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  // Initialize map with 3D buildings and draw controls
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      pitch: 45, // Tilt for 3D perspective
      bearing: -15, // Slight rotation for better 3D view
      antialias: true, // Smoother 3D rendering
    });

    // Initialize Mapbox Draw
    const drawControl = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill - active
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3,
          },
        },
        // Polygon fill - inactive
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.15,
          },
        },
        // Polygon stroke - active
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
          },
        },
        // Polygon stroke - inactive
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        },
        // Vertex points
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#3b82f6',
          },
        },
        // Midpoint markers
        {
          id: 'gl-draw-point-mid',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 3,
            'circle-color': '#3b82f6',
          },
        },
      ],
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(drawControl, 'top-left');
    draw.current = drawControl;

    map.current.on('style.load', () => {
      if (!map.current) return;

      // Enable 3D terrain and buildings in Mapbox Standard style
      try {
        map.current.setConfigProperty('basemap', 'lightPreset', 'dusk');
        map.current.setConfigProperty('basemap', 'showPlaceLabels', true);
        map.current.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      } catch {
        // Fallback for older Mapbox versions - add 3D buildings manually
        if (!map.current.getLayer('3d-buildings')) {
          map.current.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8,
            },
          });
        }
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);

      // Center on user's GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (map.current) {
              map.current.flyTo({
                center: [position.coords.longitude, position.coords.latitude],
                zoom: 16,
                duration: 1500,
              });
            }
          },
          (error) => {
            console.log('Could not get GPS location:', error.message);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      draw.current = null;
    };
  }, []);

  // Handle draw events
  useEffect(() => {
    if (!map.current || !draw.current) return;

    const handleCreate = (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0];
      if (feature.geometry.type === 'Polygon') {
        onAreaCreated(feature.geometry as GeoJSON.Polygon);
        // Remove the drawn feature - we'll add it back from our state
        if (feature.id) {
          draw.current?.delete(String(feature.id));
        }
      }
    };

    const handleDelete = (e: { features: GeoJSON.Feature[] }) => {
      e.features.forEach((feature) => {
        const areaId = areaIdMap.current.get(String(feature.id));
        if (areaId) {
          onAreaDeleted(areaId);
        }
      });
    };

    map.current.on('draw.create', handleCreate);
    map.current.on('draw.delete', handleDelete);

    return () => {
      map.current?.off('draw.create', handleCreate);
      map.current?.off('draw.delete', handleDelete);
    };
  }, [onAreaCreated, onAreaDeleted]);

  // Sync areas to draw control
  useEffect(() => {
    if (!draw.current || !mapLoaded) return;

    // Clear existing and rebuild
    draw.current.deleteAll();
    areaIdMap.current.clear();

    areas.forEach((area) => {
      const featureIds = draw.current!.add({
        type: 'Feature',
        geometry: area.geometry,
        properties: {},
      });
      if (featureIds.length > 0) {
        areaIdMap.current.set(featureIds[0], area.id);
      }
    });
  }, [areas, mapLoaded]);

  // Create marker element with hover popup
  const createMarkerElement = useCallback(
    (report: Report) => {
      const el = document.createElement('div');
      el.className = 'report-marker';
      el.dataset.reportId = report.id;
      const outlineColor = STATUS_OUTLINE_COLORS[report.status] || STATUS_OUTLINE_COLORS.open;
      el.style.cssText = `
        width: ${MARKER_SIZE}px;
        height: ${MARKER_SIZE}px;
        background-color: ${SEVERITY_COLORS[report.content.severity]};
        border: 2px solid ${outlineColor};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: width 0.15s ease-out, height 0.15s ease-out, margin 0.15s ease-out, opacity 0.15s ease-out;
        margin: 0;
        opacity: 1;
      `;

      // Show popup on hover (size is controlled by highlight effect, not hover)
      el.addEventListener('mouseenter', () => {
        if (!map.current) return;

        // Find the current report data
        const currentReport = reportsRef.current.find((r) => r.id === report.id) || report;

        // Create or update popup
        if (!hoverPopup.current) {
          hoverPopup.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 18,
            className: 'report-hover-popup',
          });
        }

        hoverPopup.current
          .setLngLat([currentReport.coordinates.lng, currentReport.coordinates.lat])
          .setHTML(createPopupContent(currentReport))
          .addTo(map.current);
      });

      // Hide popup on mouse leave
      el.addEventListener('mouseleave', () => {
        hoverPopup.current?.remove();
      });

      // Click to open sidebar
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        hoverPopup.current?.remove();
        onPinClickRef.current?.(report);
      });

      return el;
    },
    []
  );

  // Update marker highlighting styles and status colors (without recreating markers)
  useEffect(() => {
    const highlightedSet = new Set(highlightedReportIds);
    const hasHighlights = highlightedReportIds.length > 0;

    markersData.current.forEach((data) => {
      const report = reports.find((r) => r.id === data.reportId);
      if (!report) return;

      const isHighlighted = highlightedSet.has(data.reportId);
      const size = isHighlighted ? MARKER_SIZE_HIGHLIGHT : MARKER_SIZE;
      const sizeDiff = isHighlighted ? (MARKER_SIZE_HIGHLIGHT - MARKER_SIZE) / 2 : 0;
      const statusColor = STATUS_OUTLINE_COLORS[report.status] || STATUS_OUTLINE_COLORS.open;

      data.element.style.width = `${size}px`;
      data.element.style.height = `${size}px`;
      data.element.style.margin = isHighlighted ? `-${sizeDiff}px` : '0';
      data.element.style.borderColor = statusColor;
      data.element.style.opacity = isHighlighted || !hasHighlights ? '1' : '0.4';
    });
  }, [highlightedReportIds, reports]);

  // Add/remove markers when reports change (only after map is loaded)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentReportIds = new Set(reports.map((r) => r.id));

    // Remove markers for deleted reports
    markersData.current.forEach((data, id) => {
      if (!currentReportIds.has(id)) {
        data.marker.remove();
        markersData.current.delete(id);
      }
    });

    // Add markers for new reports only
    reports.forEach((report) => {
      if (!markersData.current.has(report.id)) {
        const el = createMarkerElement(report);
        const marker = new mapboxgl.Marker(el)
          .setLngLat([report.coordinates.lng, report.coordinates.lat])
          .addTo(map.current!);

        markersData.current.set(report.id, {
          marker,
          element: el,
          reportId: report.id,
          severity: report.content.severity,
        });
      }
    });
  }, [reports, createMarkerElement, mapLoaded]);

  // Highlight selected area
  useEffect(() => {
    if (!draw.current || !selectedAreaId) return;

    // Find the draw feature ID for the selected area
    const drawFeatureId = Array.from(areaIdMap.current.entries()).find(
      ([, areaId]) => areaId === selectedAreaId
    )?.[0];

    if (drawFeatureId) {
      draw.current.changeMode('simple_select', { featureIds: [drawFeatureId] });
    }
  }, [selectedAreaId]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}
