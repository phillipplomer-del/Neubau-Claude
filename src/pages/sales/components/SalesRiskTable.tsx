/**
 * Sales Risk Table Component
 * Shows projects at risk (delayed or critical status)
 */

import { useMemo } from 'react';
import type { SalesEntry } from '@/types/sales';
import { formatCurrencyShort } from '@/lib/sales/kpiCalculator';
import { AlertTriangle } from 'lucide-react';

interface SalesRiskTableProps {
  data: SalesEntry[];
  loading?: boolean;
}

export default function SalesRiskTable({
  data,
  loading = false,
}: SalesRiskTableProps) {
  // Filter and sort at-risk entries
  const riskEntries = useMemo(() => {
    return data
      .filter((entry) => {
        if (entry.status === 'completed' || entry.status === 'cancelled') return false;

        const delayDays = entry.delayDays || 0;
        const status = entry.commentStatus || 'none';

        return delayDays > 7 || status === 'at-risk' || status === 'critical';
      })
      .sort((a, b) => {
        // Sort by severity (critical first, then delay days)
        if (a.commentStatus === 'critical' && b.commentStatus !== 'critical') return -1;
        if (b.commentStatus === 'critical' && a.commentStatus !== 'critical') return 1;

        const delayA = a.delayDays || 0;
        const delayB = b.delayDays || 0;
        return delayB - delayA;
      })
      .slice(0, 8);
  }, [data]);

  // Total value at risk
  const totalRiskValue = useMemo(() => {
    return riskEntries.reduce((sum, entry) => {
      return sum + (entry.openTurnover || entry.totalPrice || 0);
    }, 0);
  }, [riskEntries]);

  // Get risk level
  const getRiskLevel = (entry: SalesEntry): { level: string; className: string } => {
    const status = entry.commentStatus;
    const delayDays = entry.delayDays || 0;

    if (status === 'critical' || delayDays > 21) {
      return {
        level: 'Kritisch',
        className: 'text-red-600 dark:text-red-400',
      };
    }
    if (status === 'at-risk' || delayDays > 14) {
      return {
        level: 'Hoch',
        className: 'text-orange-600 dark:text-orange-400',
      };
    }
    return {
      level: 'Mittel',
      className: 'text-amber-600 dark:text-amber-400',
    };
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 h-full">
        <div className="h-5 w-40 bg-muted rounded mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Gefährdete Projekte
          </h3>
          {riskEntries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {riskEntries.length} Projekte · {formatCurrencyShort(totalRiskValue)} gefährdet
            </p>
          )}
        </div>
      </div>

      {/* Risk List */}
      {riskEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
            <span className="text-lg">✓</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Keine gefährdeten Projekte
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {riskEntries.map((entry, index) => {
            const risk = getRiskLevel(entry);
            const value = entry.openTurnover || entry.totalPrice || 0;
            const delayDays = entry.delayDays || 0;

            return (
              <div
                key={entry.id || index}
                className="p-2.5 rounded-md bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {entry.customerName || 'Unbekannt'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.projektnummer || entry.deliveryNumber || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${risk.className}`}>
                      {risk.level}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {delayDays > 0 ? `${delayDays} Tage Verzug` : 'Markiert'}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Gefährdeter Wert</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyShort(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
