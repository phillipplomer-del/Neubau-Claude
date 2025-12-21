/**
 * Grouped Projects Table Component
 * Groups sales entries by project number with expand/collapse functionality
 * Uses same column structure as SalesTable
 */

import React, { useMemo, useState } from 'react';
import type { SalesEntry, CommentStatus } from '@/types/sales';
import { formatCurrency, formatNumber } from '@/lib/sales/kpiCalculator';

interface GroupedProjectsTableProps {
  data: SalesEntry[];
  onRowClick?: (entry: SalesEntry) => void;
  statusMap?: Map<string, CommentStatus>;
}

interface ProjectGroup {
  projektnummer: string;
  entries: SalesEntry[];
  totalValue: number;
  earliestDelivery: Date | null;
  status: CommentStatus;
}

export default function GroupedProjectsTable({ data, onRowClick, statusMap }: GroupedProjectsTableProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Group entries by projektnummer
  const projectGroups = useMemo(() => {
    const groups = new Map<string, ProjectGroup>();

    data.forEach((entry) => {
      const projektNr = entry.projektnummer || 'Ohne Projekt';

      if (!groups.has(projektNr)) {
        groups.set(projektNr, {
          projektnummer: projektNr,
          entries: [],
          totalValue: 0,
          earliestDelivery: null,
          status: 'none',
        });
      }

      const group = groups.get(projektNr)!;
      group.entries.push(entry);

      // Sum up turnover values
      if (entry.openTurnover) {
        group.totalValue += entry.openTurnover;
      }

      // Track earliest delivery date
      if (entry.deliveryDate) {
        const deliveryDate = typeof entry.deliveryDate === 'string'
          ? new Date(entry.deliveryDate)
          : entry.deliveryDate;

        if (!group.earliestDelivery || deliveryDate < group.earliestDelivery) {
          group.earliestDelivery = deliveryDate;
        }
      }

      // Get highest priority status from statusMap
      if (entry.id && statusMap) {
        const entryStatus = statusMap.get(entry.id);
        if (entryStatus) {
          // Priority: critical > at-risk > watched > none
          if (entryStatus === 'critical' || group.status === 'none') {
            group.status = entryStatus;
          } else if (entryStatus === 'at-risk' && group.status !== 'critical') {
            group.status = entryStatus;
          } else if (entryStatus === 'watched' && group.status !== 'critical' && group.status !== 'at-risk') {
            group.status = entryStatus;
          }
        }
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      // Sort by earliest delivery date
      if (!a.earliestDelivery && !b.earliestDelivery) return 0;
      if (!a.earliestDelivery) return 1;
      if (!b.earliestDelivery) return -1;
      return a.earliestDelivery.getTime() - b.earliestDelivery.getTime();
    });
  }, [data, statusMap]);

  const toggleProject = (projektnummer: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projektnummer)) {
        next.delete(projektnummer);
      } else {
        next.add(projektnummer);
      }
      return next;
    });
  };

  const getStatusColor = (status: CommentStatus): string => {
    switch (status) {
      case 'critical':
        return 'bg-red-100';
      case 'at-risk':
        return 'bg-orange-100';
      case 'watched':
        return 'bg-purple-100';
      default:
        return 'bg-white';
    }
  };

  const getRowClassName = (entry: SalesEntry): string => {
    const status = entry.id ? statusMap?.get(entry.id) : undefined;
    const baseClasses = "border-b border-gray-100 hover:opacity-90 transition-colors cursor-pointer";

    if (status === 'critical') {
      return `${baseClasses} bg-red-100`;
    }
    if (status === 'at-risk') {
      return `${baseClasses} bg-orange-100`;
    }
    if (status === 'watched') {
      return `${baseClasses} bg-purple-100`;
    }
    return `${baseClasses} hover:bg-primary-50`;
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('de-DE');
  };

  const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs w-8"></th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 90 }}>Best.Nr.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 90 }}>PNR</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Buchung</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 75 }}>Kd.Nr.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 130 }}>Kunde</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 50 }}>Land</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Prod.Gr.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 90 }}>Art.Nr.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 120 }}>Produktname</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Wunsch</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Best.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Liefer.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 50 }}>Einh.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 70 }}>Menge</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 100 }}>Proj.Verantw.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 90 }}>Bearb.</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 95 }}>Umsatz</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs" style={{ width: 85 }}>Verzug</th>
            </tr>
          </thead>
          <tbody>
            {projectGroups.map((group) => {
              const isExpanded = expandedProjects.has(group.projektnummer);

              return (
                <React.Fragment key={group.projektnummer}>
                  {/* Project Header Row - Collapsed view shows summary */}
                  <tr
                    onClick={() => toggleProject(group.projektnummer)}
                    className={`${getStatusColor(group.status)} border-b-2 border-gray-300 hover:opacity-90 cursor-pointer`}
                  >
                    <td className="px-3 py-3 text-center">
                      <span className="text-base font-bold">{isExpanded ? '▼' : '▶'}</span>
                    </td>
                    {/* Project info spanning full width */}
                    <td className="px-3 py-3" colSpan={18}>
                      <div className="flex items-center justify-between">
                        {/* Left: Project + Customer */}
                        <div className="flex items-center gap-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              Projekt {group.projektnummer}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({group.entries.length} Artikel)
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {group.entries[0]?.customerName || '-'}
                          </div>
                        </div>

                        {/* Right: Delivery + Turnover */}
                        <div className="flex items-center gap-8">
                          <div className="text-sm">
                            <span className="text-gray-500">Früheste Lieferung: </span>
                            <span className="font-medium text-gray-900">
                              {group.earliestDelivery ? formatDate(group.earliestDelivery) : '-'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Gesamt-Umsatz</div>
                            <div className="font-mono text-green-700 font-semibold text-base">
                              {formatCurrency(group.totalValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Article Rows - Same columns as SalesTable */}
                  {isExpanded && group.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => onRowClick?.(entry)}
                      className={getRowClassName(entry)}
                    >
                      <td className="px-1.5 py-1.5"></td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.deliveryNumber)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.projektnummer)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{formatDate(entry.importedAt)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.customerNumber)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">
                        <span className="block truncate" title={safeString(entry.customerName)}>
                          {safeString(entry.customerName)}
                        </span>
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.country)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.productGroup)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.artikelnummer)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">
                        <span className="block truncate" title={safeString(entry.productDescription)}>
                          {safeString(entry.productDescription)}
                        </span>
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-900">{formatDate(entry.requestedDeliveryDate)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{formatDate(entry.confirmedDeliveryDate)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{formatDate(entry.deliveryDate)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.unit)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">
                        {entry.quantity ? <span className="font-mono">{formatNumber(entry.quantity)}</span> : '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.projectManager)}</td>
                      <td className="px-1.5 py-1.5 text-gray-900">{safeString(entry.processor)}</td>
                      <td className="px-1.5 py-1.5">
                        {entry.openTurnover ? (
                          <span className="font-mono text-green-700 text-xs">
                            {formatCurrency(entry.openTurnover)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-1.5 py-1.5 text-gray-900">
                        {entry.delayDays && entry.delayDays > 0 ? (
                          <span className="font-mono text-red-600">
                            {entry.delayDays}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
