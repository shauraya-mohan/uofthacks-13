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

export default function MainApp() {
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
                <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
                    <a
                        href="/admin"
                        className="px-5 py-3 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-gray-200 rounded-2xl font-medium hover:bg-[#262626]/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-sm flex items-center gap-2 group"
                    >
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin
                    </a>
                    <button
                        onClick={handleReportButtonClick}
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-medium hover:from-blue-500 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Report Barrier
                    </button>
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 left-6 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 z-10 min-w-[160px]">
                    <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Severity Levels</p>
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-3 group">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-gray-200 font-medium">High</span>
                        </div>
                        <div className="flex items-center gap-3 group">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)] group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-gray-200 font-medium">Medium</span>
                        </div>
                        <div className="flex items-center gap-3 group">
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-gray-200 font-medium">Low</span>
                        </div>
                    </div>
                    {reports.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-400 font-medium">
                                <span className="text-blue-400 font-bold">{reports.length}</span> active reports
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
