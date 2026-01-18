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

  return (
    <div className="w-96 lg:w-[420px] bg-[#1a1a1a] border-l border-[#333] flex flex-col h-full">
      {/* Stats */}
      <div className="p-4 bg-[#141414] border-b border-[#333]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-100">{reports.length}</p>
            <p className="text-sm text-gray-500">Total Reports</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{areas.length}</p>
            <p className="text-sm text-gray-500">Areas Defined</p>
          </div>
        </div>
      </div>

      {/* Areas List */}
      <div className="flex-1 overflow-y-auto">
        {areas.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p>No areas defined yet</p>
            <p className="text-sm mt-1">Use the polygon tool on the map</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#333]">
            {areas.map((area) => {
              const count = areaCounts.get(area.id) || 0;
              const isSelected = selectedAreaId === area.id;

              return (
                <li
                  key={area.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-600/20 border-l-4 border-blue-500' : 'hover:bg-[#262626]'
                  }`}
                  onClick={() => handleAreaClick(area)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-100 truncate">{area.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {count} report{count !== 1 ? 's' : ''} in this area
                      </p>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEmailModal(area);
                        }}
                        className={`relative p-1.5 rounded transition-colors ${
                          (area.notificationEmails?.length || 0) > 0
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
                            : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/20'
                        }`}
                        title="Notification Emails"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {(area.notificationEmails?.length || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {area.notificationEmails?.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(area);
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                        title="Rename"
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
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Severity breakdown */}
                  {count > 0 && isSelected && (
                    <div className="mt-3 flex gap-2">
                      <SeverityBadge severity="high" reports={reports} area={area} />
                      <SeverityBadge severity="medium" reports={reports} area={area} />
                      <SeverityBadge severity="low" reports={reports} area={area} />
                    </div>
                  )}

                  {/* Inline Kanban Board for selected area */}
                  {isSelected && (
                    <AreaKanban
                      area={area}
                      reports={reports}
                      onUpdateReport={onUpdateReport}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#333] bg-[#141414]">
        <p className="text-xs text-gray-600 text-center">
          Click an area to highlight its reports
        </p>
      </div>

      {/* Email Management Modal */}
      {emailModalArea && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#333] w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#333] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Notification Emails</h3>
                <p className="text-sm text-gray-500 mt-0.5">{emailModalArea.name}</p>
              </div>
              <button
                onClick={closeEmailModal}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              <p className="text-sm text-gray-400 mb-4">
                Add email addresses to receive notifications when new reports are created in this area.
              </p>

              {/* Add Email Input */}
              <div className="flex gap-2 mb-4">
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
                  placeholder="Enter email address"
                  className="flex-1 px-3 py-2 bg-[#262626] border border-[#444] rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <button
                  onClick={addEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Error Message */}
              {emailError && (
                <p className="text-red-400 text-sm mb-3">{emailError}</p>
              )}

              {/* Email List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localEmails.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No emails registered yet
                  </p>
                ) : (
                  localEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between px-3 py-2 bg-[#262626] rounded-lg"
                    >
                      <span className="text-gray-300 text-sm truncate">{email}</span>
                      <button
                        onClick={() => removeEmail(email)}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors ml-2 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#333] flex justify-end gap-2">
              <button
                onClick={closeEmailModal}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-[#333] rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEmails}
                disabled={isSavingEmails}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}>
      {count} {severity}
    </span>
  );
}
