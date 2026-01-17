'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Report, ReportStatus, AdminArea, EstimatedCost } from '@/lib/types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from '@/lib/types';
import { getReportsInArea } from '@/lib/geo';

interface KanbanBoardProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  areas: AdminArea[];
  selectedAreaId: string | null;
  onUpdateReport: (reportId: string, updates: Partial<Report>) => Promise<void>;
}

const STATUS_COLUMNS: { status: ReportStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: '#3b82f6' },
  { status: 'acknowledged', label: 'Acknowledged', color: '#f59e0b' },
  { status: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
  { status: 'resolved', label: 'Resolved', color: '#22c55e' },
];

interface EditingCost {
  reportId: string;
  amount: string;
  quantity: string;
}

export default function KanbanBoard({
  isOpen,
  onClose,
  reports,
  areas,
  selectedAreaId,
  onUpdateReport,
}: KanbanBoardProps) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [draggedReport, setDraggedReport] = useState<Report | null>(null);
  const [editingCost, setEditingCost] = useState<EditingCost | null>(null);

  // Filter reports by selected area
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter by area if selected
    if (selectedAreaId) {
      const selectedArea = areas.find((a) => a.id === selectedAreaId);
      if (selectedArea) {
        filtered = getReportsInArea(reports, selectedArea);
      }
    }

    // Filter by status if not 'all'
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    return filtered;
  }, [reports, areas, selectedAreaId, statusFilter]);

  // Group reports by status
  const reportsByStatus = useMemo(() => {
    const grouped: Record<ReportStatus, Report[]> = {
      draft: [],
      open: [],
      acknowledged: [],
      in_progress: [],
      resolved: [],
    };

    filteredReports.forEach((report) => {
      grouped[report.status].push(report);
    });

    return grouped;
  }, [filteredReports]);

  // Calculate total costs
  const totalCosts = useMemo(() => {
    const result: Record<ReportStatus | 'all', number> = {
      draft: 0,
      open: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      all: 0,
    };

    filteredReports.forEach((report) => {
      const cost = report.aiDraft.estimatedCost;
      if (cost) {
        const total = cost.amount * (cost.quantity || 1);
        result[report.status] += total;
        result.all += total;
      }
    });

    return result;
  }, [filteredReports]);

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
  const handleStartCostEdit = useCallback((report: Report) => {
    const cost = report.aiDraft.estimatedCost;
    setEditingCost({
      reportId: report.id,
      amount: cost?.amount.toString() || '0',
      quantity: cost?.quantity?.toString() || '1',
    });
  }, []);

  // Handle cost save
  const handleSaveCost = useCallback(async () => {
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-5xl bg-[#0f0f0f] border-l border-[#333] shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] bg-[#1a1a1a] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-100">Kanban Board</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedAreaId
                ? `Viewing reports in selected area`
                : 'All reports'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Total Cost Badge */}
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-4 py-2">
              <span className="text-emerald-400 text-sm font-medium">Total Cost: </span>
              <span className="text-emerald-200 font-bold">
                ${totalCosts.all.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors p-2 hover:bg-[#333] rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-[#333] bg-[#141414] flex items-center gap-4">
          <span className="text-sm text-gray-500">Filter by status:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#262626] text-gray-400 hover:bg-[#333]'
              }`}
            >
              All ({filteredReports.length})
            </button>
            {STATUS_COLUMNS.map(({ status, label, color }) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'text-white'
                    : 'bg-[#262626] text-gray-400 hover:bg-[#333]'
                }`}
                style={statusFilter === status ? { backgroundColor: color } : {}}
              >
                {label} ({reportsByStatus[status].length})
              </button>
            ))}
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {STATUS_COLUMNS.map(({ status, label, color }) => (
              <div
                key={status}
                className={`flex-shrink-0 w-80 bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col ${
                  statusFilter !== 'all' && statusFilter !== status ? 'opacity-40' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(status)}
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="font-semibold text-gray-200">{label}</h3>
                    <span className="text-sm text-gray-500">
                      ({reportsByStatus[status].length})
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">
                    ${totalCosts[status].toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {reportsByStatus[status].map((report) => (
                    <div
                      key={report.id}
                      draggable
                      onDragStart={() => handleDragStart(report)}
                      className={`bg-[#262626] border border-[#404040] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#555] transition-all ${
                        draggedReport?.id === report.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-200 line-clamp-2">
                          {report.content.title}
                        </h4>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
                          style={{ backgroundColor: SEVERITY_COLORS[report.content.severity] }}
                        >
                          {report.content.severity}
                        </span>
                      </div>

                      {/* Category */}
                      <p className="text-xs text-gray-500 mb-3">
                        {CATEGORY_LABELS[report.content.category]}
                      </p>

                      {/* Cost Section */}
                      {editingCost?.reportId === report.id ? (
                        <div className="bg-[#1a1a1a] border border-emerald-700/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400 w-16">Amount:</label>
                            <input
                              type="number"
                              value={editingCost.amount}
                              onChange={(e) =>
                                setEditingCost({ ...editingCost, amount: e.target.value })
                              }
                              className="flex-1 px-2 py-1 bg-[#262626] border border-[#404040] rounded text-sm text-gray-200 focus:border-emerald-500 outline-none"
                              step="0.01"
                              min="0"
                            />
                            <span className="text-xs text-gray-500">CAD</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400 w-16">Quantity:</label>
                            <input
                              type="number"
                              value={editingCost.quantity}
                              onChange={(e) =>
                                setEditingCost({ ...editingCost, quantity: e.target.value })
                              }
                              className="flex-1 px-2 py-1 bg-[#262626] border border-[#404040] rounded text-sm text-gray-200 focus:border-emerald-500 outline-none"
                              step="1"
                              min="1"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={handleSaveCost}
                              className="flex-1 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-500 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCost(null)}
                              className="flex-1 py-1.5 bg-[#333] text-gray-300 rounded text-xs font-medium hover:bg-[#404040] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartCostEdit(report)}
                          className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2 hover:border-emerald-700/50 cursor-pointer transition-colors group"
                        >
                          {report.aiDraft.estimatedCost ? (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-emerald-400 font-medium text-sm">
                                  ${report.aiDraft.estimatedCost.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-gray-500 text-xs ml-1">
                                  × {report.aiDraft.estimatedCost.quantity || 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-300 font-semibold text-sm">
                                  ${((report.aiDraft.estimatedCost.amount) * (report.aiDraft.estimatedCost.quantity || 1)).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                </span>
                                <svg className="w-3 h-3 text-gray-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-gray-500 text-xs">
                              <span>No cost estimate</span>
                              <svg className="w-3 h-3 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Date */}
                      <p className="text-xs text-gray-600 mt-2">
                        {new Date(report.createdAt).toLocaleDateString('en-CA')}
                      </p>
                    </div>
                  ))}

                  {reportsByStatus[status].length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      No reports in this status
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Summary */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              {STATUS_COLUMNS.map(({ status, label, color }) => (
                <div key={status} className="text-center">
                  <p className="text-lg font-bold" style={{ color }}>
                    {reportsByStatus[status].length}
                  </p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">
                Total Reports: <span className="text-gray-200 font-semibold">{filteredReports.length}</span>
              </p>
              <p className="text-sm text-emerald-400">
                Total Budget: <span className="text-emerald-200 font-bold">${totalCosts.all.toLocaleString('en-CA', { minimumFractionDigits: 2 })} CAD</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
