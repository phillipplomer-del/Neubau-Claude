/**
 * Production Dashboard KPI Cards Component
 * 4 KPI cards for the production dashboard with trends (vs. Vorwoche)
 */

import { useMemo } from 'react';
import type { ProductionDashboardKPIs } from '@/types/production';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
} from 'lucide-react';

interface ProductionKPICardsProps {
  kpis: ProductionDashboardKPIs;
  loading?: boolean;
}

interface KPICardData {
  label: string;
  value: string;
  change?: number;
  changeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  isNegativeGood?: boolean;
  isAbsoluteChange?: boolean; // Show change as absolute number, not percentage
}

export default function ProductionKPICards({
  kpis,
  loading = false,
}: ProductionKPICardsProps) {
  const cards = useMemo<KPICardData[]>(() => [
    {
      label: 'Termintreue',
      value: `${kpis.onTimeDeliveryRate.toFixed(1)}%`,
      change: kpis.onTimeDeliveryRateChange,
      changeLabel: 'vs. LW',
      icon: CheckCircle,
      iconBgColor: kpis.onTimeDeliveryRate >= 95
        ? 'bg-green-100 dark:bg-green-900/30'
        : kpis.onTimeDeliveryRate >= 90
        ? 'bg-amber-100 dark:bg-amber-900/30'
        : 'bg-red-100 dark:bg-red-900/30',
      iconColor: kpis.onTimeDeliveryRate >= 95
        ? 'text-green-600 dark:text-green-400'
        : kpis.onTimeDeliveryRate >= 90
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'In Verzug',
      value: String(kpis.overdueCount),
      change: kpis.overdueCountChange,
      changeLabel: 'vs. LW',
      icon: AlertTriangle,
      iconBgColor: kpis.overdueCount === 0
        ? 'bg-green-100 dark:bg-green-900/30'
        : kpis.overdueCount <= 3
        ? 'bg-amber-100 dark:bg-amber-900/30'
        : 'bg-red-100 dark:bg-red-900/30',
      iconColor: kpis.overdueCount === 0
        ? 'text-green-600 dark:text-green-400'
        : kpis.overdueCount <= 3
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400',
      isNegativeGood: true,
      isAbsoluteChange: true,
    },
    {
      label: 'Ø Verspätung',
      value: `${kpis.averageDelayDays.toFixed(1)} Tage`,
      change: kpis.averageDelayDaysChange,
      changeLabel: 'vs. LW',
      icon: Clock,
      iconBgColor: kpis.averageDelayDays <= 2
        ? 'bg-green-100 dark:bg-green-900/30'
        : kpis.averageDelayDays <= 5
        ? 'bg-amber-100 dark:bg-amber-900/30'
        : 'bg-red-100 dark:bg-red-900/30',
      iconColor: kpis.averageDelayDays <= 2
        ? 'text-green-600 dark:text-green-400'
        : kpis.averageDelayDays <= 5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400',
      isNegativeGood: true,
      isAbsoluteChange: true,
    },
    {
      label: 'Offene Aufträge',
      value: String(kpis.openOrders),
      change: kpis.openOrdersChange,
      changeLabel: 'vs. LW',
      icon: Package,
      iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      isAbsoluteChange: true,
    },
  ], [kpis]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 animate-pulse"
          >
            <div className="h-3 w-20 rounded bg-muted mb-2"></div>
            <div className="h-7 w-24 rounded bg-muted"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        const isPositiveChange = card.change !== undefined && card.change > 0;
        const isNegativeChange = card.change !== undefined && card.change < 0;

        // For "isNegativeGood" metrics, reverse the color logic
        const showGreen = card.isNegativeGood ? isNegativeChange : isPositiveChange;
        const showRed = card.isNegativeGood ? isPositiveChange : isNegativeChange;

        // Format change value
        const formatChange = () => {
          if (card.change === undefined || card.change === 0) return null;
          const sign = card.change > 0 ? '+' : '';
          if (card.isAbsoluteChange) {
            return `${sign}${card.change}`;
          }
          return `${sign}${card.change.toFixed(1)}%`;
        };

        return (
          <div
            key={index}
            className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
          >
            {/* Header with icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-md ${card.iconBgColor}`}>
                <IconComponent className={`h-3.5 w-3.5 ${card.iconColor}`} />
              </div>
            </div>

            {/* Value */}
            <div className="text-xl font-bold text-foreground mb-1">
              {card.value}
            </div>

            {/* Change indicator */}
            <div className="flex items-center gap-1.5">
              {card.change !== undefined && card.change !== 0 ? (
                <>
                  <span
                    className={`flex items-center text-xs font-medium ${
                      showGreen
                        ? 'text-green-600 dark:text-green-400'
                        : showRed
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {isPositiveChange ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {formatChange()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {card.changeLabel}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {card.changeLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
