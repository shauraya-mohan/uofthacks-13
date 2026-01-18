'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Report } from '@/lib/types';
import { useReports } from '@/hooks/useReports';
import { useAreas } from '@/hooks/useAreas';
import { getReportsInArea, getAreasContainingPoint } from '@/lib/geo';
import AdminPasswordGate from '@/components/AdminPasswordGate';
import AdminSidebar from '@/components/AdminSidebar';
import PinDrawer from '@/components/PinDrawer';
import Toast, { useToast } from '@/components/Toast';
import CommandPaletteSearch from '@/components/CommandPaletteSearch';

const AdminMap = dynamic(() => import('@/components/AdminMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function AdminPage() {
  const { reports, isLoaded: reportsLoaded, refreshReports, updateReport, removeReport } = useReports();
  const { areas, isLoaded: areasLoaded, addArea, updateArea, removeArea } = useAreas();
  const { toasts, addToast, dismissToast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [aiSearchMatchIds, setAiSearchMatchIds] = useState<string[] | null>(null);

  const prevReportsRef = useRef<Report[]>([]);
  const isInitialLoadRef = useRef(true);

  // Poll for new reports every 5 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshReports]);

  useEffect(() => {
    if (!reportsLoaded || !areasLoaded || areas.length === 0) return;

    // Skip notifications on initial page load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevReportsRef.current = reports;
      return;
    }

    const prevIds = new Set(prevReportsRef.current.map((r) => r.id));
    const newReports = reports.filter((r) => !prevIds.has(r.id));

    newReports.forEach((report) => {
      const containingAreas = getAreasContainingPoint(report.coordinates, areas);
      if (containingAreas.length > 0) {
        const areaNames = containingAreas.map((a) => a.name).join(', ');
        addToast(
          `New ${report.content.severity} severity report in: ${areaNames}`,
          report.content.severity === 'high' ? 'warning' : 'info'
        );
      }
    });

    prevReportsRef.current = reports;
  }, [reports, areas, reportsLoaded, areasLoaded, addToast]);

  // Combine area-based and AI search-based highlighting
  const highlightedReportIds = useMemo(() => {
    // AI search results take priority if active
    if (aiSearchMatchIds !== null) {
      return aiSearchMatchIds;
    }
    // Otherwise, highlight reports in selected area
    if (!selectedAreaId) return [];
    const selectedArea = areas.find((a) => a.id === selectedAreaId);
    if (!selectedArea) return [];
    return getReportsInArea(reports, selectedArea).map((r) => r.id);
  }, [selectedAreaId, areas, reports, aiSearchMatchIds]);

  const handleAreaCreated = useCallback(
    async (geometry: GeoJSON.Polygon) => {
      const areaNumber = areas.length + 1;
      const newArea = await addArea(geometry, `Area ${areaNumber}`);
      if (newArea) {
        addToast('Responsibility area created', 'success');
      } else {
        addToast('Failed to create area', 'error');
      }
    },
    [areas.length, addArea, addToast]
  );

  const handleAreaDeleted = useCallback(
    (areaId: string) => {
      removeArea(areaId);
      if (selectedAreaId === areaId) {
        setSelectedAreaId(null);
      }
      addToast('Area deleted', 'info');
    },
    [removeArea, selectedAreaId, addToast]
  );

  const handleAreaRename = useCallback(
    (areaId: string, newName: string) => {
      updateArea(areaId, { name: newName });
      addToast('Area renamed', 'success');
    },
    [updateArea, addToast]
  );

  const handleAreaUpdateEmails = useCallback(
    async (areaId: string, emails: string[]) => {
      const success = await updateArea(areaId, { notificationEmails: emails });
      if (success) {
        addToast(`Notification emails updated (${emails.length} recipients)`, 'success');
      } else {
        addToast('Failed to update notification emails', 'error');
        throw new Error('Failed to update emails');
      }
    },
    [updateArea, addToast]
  );

  const handlePinClick = useCallback((report: Report) => {
    setSelectedReport(report);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedReport(null);
  };

  const handleUpdateReport = useCallback(
    async (reportId: string, updates: Partial<Report>) => {
      const success = await updateReport(reportId, updates);
      if (success) {
        addToast('Report updated', 'success');
      } else {
        addToast('Failed to update report', 'error');
      }
    },
    [updateReport, addToast]
  );

  const handleDeleteReport = useCallback(
    async (reportId: string) => {
      await removeReport(reportId);
      addToast('Report deleted', 'success');
    },
    [removeReport, addToast]
  );

  if (!isAuthenticated) {
    return <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  const isLoaded = reportsLoaded && areasLoaded;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f] text-gray-100">
      {/* Header */}
      <header className="bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 font-medium">Manage responsibility areas</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
          >
            Exit to Map
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Left side */}
        {isLoaded && (
          <AdminSidebar
            reports={reports}
            areas={areas}
            selectedAreaId={selectedAreaId}
            onAreaSelect={setSelectedAreaId}
            onAreaDelete={handleAreaDeleted}
            onAreaRename={handleAreaRename}
            onAreaUpdateEmails={handleAreaUpdateEmails}
            onUpdateReport={handleUpdateReport}
            onReportClick={handlePinClick}
          />
        )}

        {/* Map */}
        <main className="flex-1 relative">
          {isLoaded ? (
            <AdminMap
              reports={reports}
              areas={areas}
              selectedAreaId={selectedAreaId}
              highlightedReportIds={highlightedReportIds}
              onAreaCreated={handleAreaCreated}
              onAreaDeleted={handleAreaDeleted}
              onPinClick={handlePinClick}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
              <div className="text-gray-400">Loading...</div>
            </div>
          )}

          {/* Instructions overlay */}
          {isLoaded && areas.length === 0 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-8 py-5 z-10 text-center max-w-md">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">Create a Responsibility Area</p>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                Use the polygon tool in the top-left corner to draw boundaries for areas you want to monitor.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Pin Detail Drawer */}
      <PinDrawer
        report={selectedReport}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onDelete={handleDeleteReport}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* AI Command Palette Search */}
      {isLoaded && (
        <CommandPaletteSearch
          onSearchResults={setAiSearchMatchIds}
          totalReports={reports.length}
        />
      )}
    </div>
  );
}
