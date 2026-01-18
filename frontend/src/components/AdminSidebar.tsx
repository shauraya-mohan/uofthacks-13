'use client';

import { useMemo, useState } from 'react';
import type { Report, AdminArea } from '@/lib/types';
import { getReportsInArea } from '@/lib/geo';
import AreaKanban from './AreaKanban';

interface AdminSidebarProps {
  reports: Report[];
  areas: AdminArea[];
  selectedAreaId: string | null;
  onAreaSelect: (areaId: string | null) => void;
  onAreaDelete: (areaId: string) => void;
  onAreaRename: (areaId: string, newName: string) => void;
  onAreaUpdateEmails: (areaId: string, emails: string[]) => Promise<void>;
  onUpdateReport: (reportId: string, updates: Partial<Report>) => Promise<void>;
  onReportClick?: (report: Report) => void;
}

export default function AdminSidebar({
  reports,
  areas,
  selectedAreaId,
  onAreaSelect,
  onAreaDelete,
  onAreaRename,
  onAreaUpdateEmails,
  onUpdateReport,
  onReportClick,
}: AdminSidebarProps) {
  const [emailModalArea, setEmailModalArea] = useState<AdminArea | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSavingEmails, setIsSavingEmails] = useState(false);
  const [localEmails, setLocalEmails] = useState<string[]>([]);

  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    areas.forEach((area) => {
      const reportsInArea = getReportsInArea(reports, area);
      counts.set(area.id, reportsInArea.length);
    });
    return counts;
  }, [reports, areas]);

  const handleAreaClick = (area: AdminArea) => {
    const newSelectedId = selectedAreaId === area.id ? null : area.id;
    onAreaSelect(newSelectedId);
  };

  const handleRename = (area: AdminArea) => {
    const newName = prompt('Enter new name for this area:', area.name);
    if (newName && newName.trim()) {
      onAreaRename(area.id, newName.trim());
    }
  };

  const openEmailModal = (area: AdminArea) => {
    setEmailModalArea(area);
    setLocalEmails(area.notificationEmails || []);
    setEmailInput('');
    setEmailError('');
  };

  const closeEmailModal = () => {
    setEmailModalArea(null);
    setEmailInput('');
    setEmailError('');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (localEmails.includes(trimmed)) {
      setEmailError('This email is already added');
      return;
    }

    setLocalEmails([...localEmails, trimmed]);
    setEmailInput('');
    setEmailError('');
  };

  const removeEmail = (email: string) => {
    setLocalEmails(localEmails.filter((e) => e !== email));
  };

  const saveEmails = async () => {
    if (!emailModalArea) return;

    setIsSavingEmails(true);
    try {
      await onAreaUpdateEmails(emailModalArea.id, localEmails);
      closeEmailModal();
    } catch (err) {
      setEmailError('Failed to save emails. Please try again.');
    } finally {
      setIsSavingEmails(false);
    }
  };

  // Calculate total costs per area
  const areaCosts = useMemo(() => {
    const costs = new Map<string, number>();
    areas.forEach((area) => {
      const areaReports = getReportsInArea(reports, area);
      let total = 0;
      areaReports.forEach((report) => {
        const cost = report.aiDraft.estimatedCost;
        if (cost) {
          total += cost.amount * (cost.quantity || 1);
        }
      });
      costs.set(area.id, total);
    });
    return costs;
  }, [reports, areas]);

  return (
    <div className="w-96 lg:w-[420px] bg-[#0a0a0a]/80 backdrop-blur-2xl border-r border-white/10 flex flex-col h-full shadow-2xl">
      {/* Stats - Minimal */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Overview</h2>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-3xl font-light text-white">{reports.length}</p>
            <p className="text-sm font-medium text-gray-500 mt-1">Total Reports</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-3xl font-light text-white">{areas.length}</p>
            <p className="text-sm font-medium text-gray-500 mt-1">Areas Defined</p>
          </div>
        </div>
      </div>

      {/* Areas List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 px-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">No areas defined yet</p>
            <p className="text-sm mt-2 text-gray-600">Use the polygon tool on the map to define responsibility zones</p>
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {areas.map((area) => {
              const count = areaCounts.get(area.id) || 0;
              const isSelected = selectedAreaId === area.id;

              return (
                <li key={area.id} className="rounded-xl overflow-hidden transition-all duration-300">
                  <div
                    className={`group p-4 cursor-pointer transition-all duration-300 ${isSelected
                        ? 'bg-blue-600/10 border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                        : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                      }`}
                    onClick={() => handleAreaClick(area)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium truncate transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-200 group-hover:text-white'}`}>
                          {area.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                          {count} report{count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Actions - Only visible on hover or selected */}
                      <div className={`flex items-center gap-1 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmailModal(area);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${(area.notificationEmails?.length || 0) > 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(area);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this area?')) {
                              onAreaDelete(area.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Severity Badges & Cost - Minimal */}
                    {count > 0 && isSelected && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap animate-fade-in">
                        <SeverityBadge severity="high" reports={reports} area={area} />
                        <SeverityBadge severity="medium" reports={reports} area={area} />
                        <SeverityBadge severity="low" reports={reports} area={area} />
                        {(areaCosts.get(area.id) || 0) > 0 && (
                          <span className="text-xs text-emerald-400 font-mono font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            ${(areaCosts.get(area.id) || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CAD
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline Kanban Board - Collapsible */}
                  {isSelected && (
                    <div className="border-t border-white/5 bg-black/20 animate-slide-down">
                      <AreaKanban
                        area={area}
                        reports={reports}
                        onUpdateReport={onUpdateReport}
                        onReportClick={onReportClick}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <p className="text-xs text-gray-500 text-center font-medium">
          Select an area to manage tickets
        </p>
      </div>

      {/* Email Management Modal - Glassmorphic */}
      {emailModalArea && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-md mx-4 shadow-2xl scale-100 animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Notification Emails</h3>
                <p className="text-sm text-blue-400 mt-0.5 font-medium">{emailModalArea.name}</p>
              </div>
              <button
                onClick={closeEmailModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Add email addresses to instantly notify stakeholders.
              </p>

              {/* Add Email Input */}
              <div className="flex gap-3 mb-6">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="Enter recipient email..."
                  className="flex-1 px-4 py-2.5 bg-[#0a0a0a]/50 border border-white/10 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
                />
                <button
                  onClick={addEmail}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                  Add
                </button>
              </div>

              {/* Error Message */}
              {emailError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {emailError}
                  </p>
                </div>
              )}

              {/* Email List */}
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {localEmails.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-xl">
                    <p className="text-gray-500 text-sm">No recipients added yet</p>
                  </div>
                ) : (
                  localEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a]/30 border border-white/5 rounded-xl group hover:border-white/10 transition-colors"
                    >
                      <span className="text-gray-200 text-sm font-medium">{email}</span>
                      <button
                        onClick={() => removeEmail(email)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/10 bg-white/5 flex justify-end gap-3">
              <button
                onClick={closeEmailModal}
                className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEmails}
                disabled={isSavingEmails}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingEmails ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({
  severity,
  reports,
  area,
}: {
  severity: 'high' | 'medium' | 'low';
  reports: Report[];
  area: AdminArea;
}) {
  const count = getReportsInArea(reports, area).filter(
    (r) => r.content.severity === severity
  ).length;

  if (count === 0) return null;

  const colors = {
    high: 'bg-red-500/10 text-red-400 border border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${colors[severity]}`}>
      {count} {severity}
    </span>
  );
}
