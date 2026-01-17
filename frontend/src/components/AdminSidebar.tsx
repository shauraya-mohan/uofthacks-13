'use client';

import { useMemo } from 'react';
import type { Report, AdminArea } from '@/lib/types';
import { getReportsInArea } from '@/lib/geo';
import { analytics } from '@/lib/analytics';

interface AdminSidebarProps {
  reports: Report[];
  areas: AdminArea[];
  selectedAreaId: string | null;
  onAreaSelect: (areaId: string | null) => void;
  onAreaDelete: (areaId: string) => void;
  onAreaRename: (areaId: string, newName: string) => void;
}

export default function AdminSidebar({
  reports,
  areas,
  selectedAreaId,
  onAreaSelect,
  onAreaDelete,
  onAreaRename,
}: AdminSidebarProps) {
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
    if (newSelectedId) {
      analytics.adminAreaSelected(area.id, areaCounts.get(area.id) || 0);
    }
  };

  const handleRename = (area: AdminArea) => {
    const newName = prompt('Enter new name for this area:', area.name);
    if (newName && newName.trim()) {
      onAreaRename(area.id, newName.trim());
    }
  };

  return (
    <div className="w-80 bg-[#1a1a1a] border-l border-[#333] flex flex-col h-full">
      {/* Stats */}
      <div className="p-4 bg-[#141414] border-b border-[#333] grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-100">{reports.length}</p>
          <p className="text-sm text-gray-500">Total Reports</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-100">{areas.length}</p>
          <p className="text-sm text-gray-500">Areas Defined</p>
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
