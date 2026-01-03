/**
 * Sales Upcoming Deliveries Component
 * Shows deliveries scheduled for the next days
 */

import { useMemo, useState } from 'react';
import type { SalesEntry } from '@/types/sales';
import { formatCurrencyShort } from '@/lib/sales/kpiCalculator';
import { Calendar } from 'lucide-react';

interface SalesUpcomingDeliveriesProps {
  data: SalesEntry[];
  loading?: boolean;
}

type DaysFilter = 7 | 14 | 30;

export default function SalesUpcomingDeliveries({
  data,
  loading = false,
}: SalesUpcomingDeliveriesProps) {
  const [daysFilter, setDaysFilter] = useState<DaysFilter>(14);

  // Filter deliveries within the selected days
  const upcomingDeliveries = useMemo(() => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysFilter * 24 * 60 * 60 * 1000);

    return data
      .filter((entry) => {
        if (entry.status === 'completed' || entry.status === 'cancelled') return false;

        const deliveryDate = entry.confirmedDeliveryDate || entry.requestedDeliveryDate || entry.deliveryDate;
        if (!deliveryDate) return false;

        const date = deliveryDate instanceof Date ? deliveryDate : new Date(deliveryDate);
        return date >= now && date <= futureDate;
      })
      .sort((a, b) => {
        const dateA = a.confirmedDeliveryDate || a.requestedDeliveryDate || a.deliveryDate;
        const dateB = b.confirmedDeliveryDate || b.requestedDeliveryDate || b.deliveryDate;
        if (!dateA || !dateB) return 0;

        const dA = dateA instanceof Date ? dateA : new Date(dateA);
        const dB = dateB instanceof Date ? dateB : new Date(dateB);
        return dA.getTime() - dB.getTime();
      })
      .slice(0, 8);
  }, [data, daysFilter]);

  // Calculate days until delivery
  const getDaysUntil = (date: Date | string | undefined): number => {
    if (!date) return 0;
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Format date
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Anstehende Lieferungen
          </h3>
        </div>

        {/* Days Filter */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setDaysFilter(days as DaysFilter)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                daysFilter === days
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {days}T
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      {upcomingDeliveries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Keine Lieferungen in den nächsten {daysFilter} Tagen
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {upcomingDeliveries.map((entry, index) => {
            const deliveryDate = entry.confirmedDeliveryDate || entry.requestedDeliveryDate || entry.deliveryDate;
            const daysUntil = getDaysUntil(deliveryDate);
            const value = entry.openTurnover || entry.totalPrice || 0;

            return (
              <div
                key={entry.id || index}
                className="p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {entry.customerName || 'Unbekannt'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.productDescription || entry.deliveryNumber || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-foreground">
                      {formatDate(deliveryDate)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        daysUntil <= 3
                          ? 'text-red-600 dark:text-red-400'
                          : daysUntil <= 7
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {daysUntil === 0
                        ? 'Heute'
                        : daysUntil === 1
                        ? 'Morgen'
                        : `in ${daysUntil} Tagen`}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatCurrencyShort(value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
