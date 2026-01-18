'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Report, ReportStatus, AdminArea, EstimatedCost } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import { getReportsInArea } from '@/lib/geo';

interface AreaKanbanProps {
  area: AdminArea;
  reports: Report[];
  onUpdateReport: (reportId: string, updates: Partial<Report>) => Promise<void>;
  onReportClick?: (report: Report) => void;
}

const STATUS_COLUMNS: { status: ReportStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: '#3b82f6' },
  { status: 'acknowledged', label: 'Ack', color: '#f59e0b' },
  { status: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
  { status: 'resolved', label: 'Resolved', color: '#22c55e' },
];

interface EditingCost {
  reportId: string;
  amount: string;
  quantity: string;
}

export default function AreaKanban({ area, reports, onUpdateReport, onReportClick }: AreaKanbanProps) {
  const [draggedReport, setDraggedReport] = useState<Report | null>(null);
  const [editingCost, setEditingCost] = useState<EditingCost | null>(null);

  // Filter reports by this area
  const areaReports = useMemo(() => {
    return getReportsInArea(reports, area);
  }, [reports, area]);

  // Group reports by status
  const reportsByStatus = useMemo(() => {
    const grouped: Record<ReportStatus, Report[]> = {
      draft: [],
      open: [],
      acknowledged: [],
      in_progress: [],
      resolved: [],
    };

    areaReports.forEach((report) => {
      grouped[report.status].push(report);
    });

    return grouped;
  }, [areaReports]);

  

  // Handle drag start
  const handleDragStart = useCallback((report: Report) => {
    setDraggedReport(report);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    async (targetStatus: ReportStatus) => {
      if (!draggedReport || draggedReport.status === targetStatus) {
        setDraggedReport(null);
        return;
      }

      try {
        await onUpdateReport(draggedReport.id, { status: targetStatus });
      } catch (error) {
        console.error('Failed to update report status:', error);
      }

      setDraggedReport(null);
    },
    [draggedReport, onUpdateReport]
  );

  // Handle cost edit
  const handleStartCostEdit = useCallback((report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    const cost = report.aiDraft.estimatedCost;
    setEditingCost({
      reportId: report.id,
      amount: cost?.amount.toString() || '0',
      quantity: cost?.quantity?.toString() || '1',
    });
  }, []);

  // Handle cost save
  const handleSaveCost = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingCost) return;

    const amount = parseFloat(editingCost.amount) || 0;
    const quantity = parseFloat(editingCost.quantity) || 1;

    const report = reports.find((r) => r.id === editingCost.reportId);
    if (!report) return;

    const updatedCost: EstimatedCost = {
      amount,
      unit: report.aiDraft.estimatedCost?.unit || 'total',
      quantity,
    };

    try {
      await onUpdateReport(editingCost.reportId, {
        aiDraft: {
          ...report.aiDraft,
          estimatedCost: updatedCost,
        },
      });
    } catch (error) {
      console.error('Failed to update cost:', error);
    }

    setEditingCost(null);
  }, [editingCost, reports, onUpdateReport]);

  if (areaReports.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-xs italic">
        No reports tracked in this area
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Kanban Board - Table Style */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="border border-white/10 rounded-lg overflow-hidden inline-flex flex-col min-w-full">
          {/* Header Row */}
          <div className="flex border-b border-white/10 bg-white/5">
            {STATUS_COLUMNS.map(({ status, label, color }, index) => (
              <div
                key={status}
                className={`w-36 flex-shrink-0 px-3 py-2 flex items-center justify-between ${index < STATUS_COLUMNS.length - 1 ? 'border-r border-white/10' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ color: color, backgroundColor: color }}
                  />
                  <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide">{label}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {reportsByStatus[status].length}
                </span>
              </div>
            ))}
          </div>

          {/* Content Row */}
          <div className="flex">
            {STATUS_COLUMNS.map(({ status }, index) => (
              <div
                key={status}
                className={`w-36 flex-shrink-0 p-2 space-y-2 min-h-[120px] max-h-[280px] overflow-y-auto custom-scrollbar ${index < STATUS_COLUMNS.length - 1 ? 'border-r border-white/10' : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
              >
              {reportsByStatus[status].map((report) => (
                <div
                  key={report.id}
                  draggable
                  onDragStart={() => handleDragStart(report)}
                  onClick={() => onReportClick?.(report)}
                  className={`bg-white/5 border border-white/5 rounded-md p-2 cursor-grab active:cursor-grabbing hover:border-blue-500/30 hover:bg-white/10 transition-all group ${draggedReport?.id === report.id ? 'opacity-50 scale-95' : ''
                    }`}
                >
                  {/* Title */}
                  <p className="text-[11px] font-medium text-gray-300 line-clamp-2 mb-2 group-hover:text-blue-100 transition-colors">
                    {report.content.title}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${report.content.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          report.content.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                    >
                      {report.content.severity}
                    </span>

                    {/* Cost */}
                    {editingCost?.reportId === report.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-emerald-500">$</span>
                        <input
                          type="number"
                          value={editingCost.amount}
                          onChange={(e) =>
                            setEditingCost({ ...editingCost, amount: e.target.value })
                          }
                          className="w-12 px-1 py-0.5 bg-black border border-emerald-500/50 rounded text-[10px] text-emerald-400 focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={handleSaveCost}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={(e) => handleStartCostEdit(report, e)}
                        className={`text-[10px] font-mono hover:underline cursor-pointer ${report.aiDraft.estimatedCost ? 'text-emerald-400' : 'text-gray-600 hover:text-emerald-400'
                          }`}
                      >
                        {report.aiDraft.estimatedCost
                          ? `$${(report.aiDraft.estimatedCost.amount * (report.aiDraft.estimatedCost.quantity || 1)).toLocaleString('en-CA', { notation: 'compact' })}`
                          : '+$'}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {reportsByStatus[status].length === 0 && (
                <div className="h-full flex items-center justify-center py-4 opacity-30">
                  <p className="text-[9px] uppercase tracking-widest font-medium text-gray-500">Empty</p>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
