'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Report, ReportStatus, AdminArea, EstimatedCost } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import { getReportsInArea } from '@/lib/geo';

interface AreaKanbanProps {
  area: AdminArea;
  reports: Report[];
  onUpdateReport: (reportId: string, updates: Partial<Report>) => Promise<void>;
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

export default function AreaKanban({ area, reports, onUpdateReport }: AreaKanbanProps) {
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

  // Calculate total costs
  const totalCost = useMemo(() => {
    let total = 0;
    areaReports.forEach((report) => {
      const cost = report.aiDraft.estimatedCost;
      if (cost) {
        total += cost.amount * (cost.quantity || 1);
      }
    });
    return total;
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
      <div className="py-4 text-center text-gray-500 text-sm">
        No reports in this area
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Header with total cost */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-gray-500">{areaReports.length} reports</span>
        <span className="text-xs text-emerald-400 font-medium">
          ${totalCost.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CAD
        </span>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_COLUMNS.map(({ status, label, color }) => (
          <div
            key={status}
            className="flex-shrink-0 w-36 bg-[#0f0f0f] rounded-lg border border-[#333] flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            {/* Column Header */}
            <div className="px-2 py-1.5 border-b border-[#333] flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-gray-300">{label}</span>
              <span className="text-xs text-gray-600 ml-auto">
                {reportsByStatus[status].length}
              </span>
            </div>

            {/* Column Content */}
            <div className="flex-1 p-1.5 space-y-1.5 max-h-48 overflow-y-auto">
              {reportsByStatus[status].map((report) => (
                <div
                  key={report.id}
                  draggable
                  onDragStart={() => handleDragStart(report)}
                  className={`bg-[#1a1a1a] border border-[#333] rounded p-2 cursor-grab active:cursor-grabbing hover:border-[#444] transition-all ${
                    draggedReport?.id === report.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  {/* Title */}
                  <p className="text-xs text-gray-200 line-clamp-2 mb-1">
                    {report.content.title}
                  </p>

                  {/* Severity badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: SEVERITY_COLORS[report.content.severity] }}
                    >
                      {report.content.severity}
                    </span>

                    {/* Cost */}
                    {editingCost?.reportId === report.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          value={editingCost.amount}
                          onChange={(e) =>
                            setEditingCost({ ...editingCost, amount: e.target.value })
                          }
                          className="w-14 px-1 py-0.5 bg-[#262626] border border-[#404040] rounded text-[10px] text-gray-200 focus:border-emerald-500 outline-none"
                          step="0.01"
                          min="0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={handleSaveCost}
                          className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] hover:bg-emerald-500"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={(e) => handleStartCostEdit(report, e)}
                        className="text-[10px] text-emerald-400 cursor-pointer hover:text-emerald-300"
                      >
                        {report.aiDraft.estimatedCost
                          ? `$${(report.aiDraft.estimatedCost.amount * (report.aiDraft.estimatedCost.quantity || 1)).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : '+$'}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {reportsByStatus[status].length === 0 && (
                <div className="text-center py-3 text-gray-600 text-[10px]">
                  Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-[#333] flex items-center justify-between px-1">
        <div className="flex gap-3">
          {STATUS_COLUMNS.map(({ status, label, color }) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-500">{reportsByStatus[status].length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
