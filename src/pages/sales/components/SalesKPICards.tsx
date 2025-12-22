/**
 * Sales KPI Cards Component
 * Displays key performance indicators for sales data
 */

import Card, { CardContent } from '@/components/ui/Card';
import type { SalesKPIs } from '@/lib/sales/kpiCalculator';
import { formatCurrency, formatNumber } from '@/lib/sales/kpiCalculator';
import { Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface SalesKPICardsProps {
  kpis: SalesKPIs;
  loading?: boolean;
}

export default function SalesKPICards({ kpis, loading = false }: SalesKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 w-24 rounded bg-muted"></div>
              <div className="mt-2 h-8 w-32 rounded bg-muted"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate trend percentages (mock for now, could be based on historical data)
  const deliveryTrend = kpis.totalDeliveries > 0 ? '+12.5%' : '0%';
  const revenueTrend = kpis.totalOpenRevenue > 0 ? '-20%' : '0%';

  const cards = [
    {
      label: 'Offene Lieferungen',
      value: formatNumber(kpis.totalDeliveries),
      trend: deliveryTrend,
      trendUp: true,
      subtitle: 'Aktive Bestellungen',
      icon: Package,
      iconColor: 'text-primary',
    },
    {
      label: 'Offener Umsatz',
      value: formatCurrency(kpis.totalOpenRevenue),
      trend: revenueTrend,
      trendUp: false,
      subtitle: 'Ausstehender Wert',
      icon: TrendingUp,
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Verzögert',
      value: formatNumber(kpis.delayedDeliveries),
      trend: kpis.delayedDeliveries > 0 ? `${((kpis.delayedDeliveries / Math.max(kpis.totalDeliveries, 1)) * 100).toFixed(1)}%` : '0%',
      trendUp: false,
      subtitle: 'Benötigt Aufmerksamkeit',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Ø Verzögerung',
      value: kpis.averageDelay > 0 ? `${kpis.averageDelay.toFixed(1)} Tage` : '0 Tage',
      trend: kpis.averageDelay <= 3 ? 'Gut' : kpis.averageDelay <= 7 ? 'Akzeptabel' : 'Kritisch',
      trendUp: kpis.averageDelay <= 3,
      subtitle: kpis.averageDelay <= 3 ? 'Im Zielbereich' : 'Überschreitet Ziel',
      icon: Clock,
      iconColor: kpis.averageDelay > 7 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {card.label}
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      card.trendUp
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {card.trend}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span>{card.subtitle}</span>
                    <TrendingUp className={`h-3 w-3 ${card.trendUp ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
                  </p>
                </div>
                <div className={`${card.iconColor}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
