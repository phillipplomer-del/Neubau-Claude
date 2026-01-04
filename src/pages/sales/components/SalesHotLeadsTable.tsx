/**
 * Sales Hot Leads Table Component
 * Shows active orders sorted by value
 */

import { useMemo } from 'react';
import type { SalesEntry } from '@/types/sales';
import { formatCurrencyShort } from '@/lib/sales/kpiCalculator';

interface SalesHotLeadsTableProps {
  data: SalesEntry[];
  loading?: boolean;
  limit?: number;
}

export default function SalesHotLeadsTable({
  data,
  loading = false,
  limit = 10,
}: SalesHotLeadsTableProps) {
  // Sort by value and limit
  const sortedData = useMemo(() => {
    return [...data]
      .filter((entry) => entry.status !== 'completed' && entry.status !== 'cancelled')
      .sort((a, b) => {
        const valueA = a.openTurnover || a.totalPrice || 0;
        const valueB = b.openTurnover || b.totalPrice || 0;
        return valueB - valueA;
      })
      .slice(0, limit);
  }, [data, limit]);

  // Get status badge
  const getStatusBadge = (entry: SalesEntry) => {
    const delayDays = entry.delayDays || 0;
    const status = entry.commentStatus || 'none';

    if (status === 'critical' || delayDays > 14) {
      return {
        label: 'Kritisch',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      };
    }
    if (status === 'at-risk' || delayDays > 7) {
      return {
        label: 'Gefährdet',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      };
    }
    if (status === 'watched' || delayDays > 0) {
      return {
        label: 'Beobachtet',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    }
    return {
      label: 'Normal',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="h-5 w-40 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="h-4 w-full bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Aktive Auftragslagen
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top {limit} nach Wert
        </p>
      </div>

      {sortedData.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Keine aktiven Aufträge
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Best.Nr.
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Kunde
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                  Produkt
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                  Wert
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.map((entry, index) => {
                const status = getStatusBadge(entry);
                const value = entry.openTurnover || entry.totalPrice || 0;

                return (
                  <tr
                    key={entry.id || index}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {entry.deliveryNumber || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground truncate max-w-[150px]">
                        {entry.customerName || 'Unbekannt'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-muted-foreground truncate max-w-[180px]">
                        {entry.productDescription || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-semibold text-foreground">
                        {formatCurrencyShort(value)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
