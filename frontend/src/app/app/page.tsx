'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Report } from '@/lib/types';
import { useReports } from '@/hooks/useReports';
import UploadModal from '@/components/UploadModal';
import PinDrawer from '@/components/PinDrawer';
import Toast, { useToast } from '@/components/Toast';

// Dynamic import Map to avoid SSR issues with Mapbox
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});

export default function HomePage() {
  const { reports, isLoaded, addReport } = useReports();
  const { toasts, addToast, dismissToast } = useToast();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleReportButtonClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleReportSubmit = useCallback(
    async (reportData: Omit<Report, 'id' | 'createdAt'>) => {
      const newReport = await addReport(reportData);
      if (newReport) {
        addToast('Report submitted successfully!', 'success');
      } else {
        addToast('Failed to submit report. Please try again.', 'error');
      }
    },
    [addReport, addToast]
  );

  const handlePinClick = useCallback((report: Report) => {
    setSelectedReport(report);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedReport(null);
  };

  return (
    <div className="h-screen w-screen bg-[#0f0f0f]">
      {/* Full-screen Map */}
      <main className="absolute inset-0">
        {isLoaded ? (
          <Map
            reports={reports}
            onPinClick={handlePinClick}
            selectedReportId={selectedReport?.id}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
            <div className="text-gray-400">Loading...</div>
          </div>
        )}

        {/* Floating controls - top left */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
          <a
            href="/admin"
            className="px-5 py-3 bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-xl font-medium hover:bg-[#262626] transition-colors shadow-lg"
          >
            Admin
          </a>
          <button
            onClick={handleReportButtonClick}
            className="px-6 py-3 bg-[#3b82f6] text-white rounded-xl font-bold hover:bg-[#2563eb] transition-colors shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Report Barrier
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 z-10 w-48 shadow-xl">
          <p className="text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">Severity Levels</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
              </span>
              <span className="text-sm text-gray-200 font-medium">High</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
              <span className="text-sm text-gray-200 font-medium">Medium</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-sm text-gray-200 font-medium">Low</span>
            </div>
          </div>
          {reports.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-gray-400">
                <span className="text-white font-bold text-sm">{reports.length}</span> active reports
              </p>
            </div>
          )}
        </div>

      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleReportSubmit}
      />

      {/* Pin Detail Drawer */}
      <PinDrawer
        report={selectedReport}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
