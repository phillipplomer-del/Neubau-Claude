/**
 * Sales KPI Cards Component
 * Displays key performance indicators for sales data
 */

import Card, { CardContent } from '@/components/ui/Card';
import type { SalesKPIs } from '@/lib/sales/kpiCalculator';
import { formatCurrency, formatNumber } from '@/lib/sales/kpiCalculator';

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
              <div className="h-4 w-24 rounded bg-gray-200"></div>
              <div className="mt-2 h-8 w-32 rounded bg-gray-300"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Offene Lieferungen',
      value: formatNumber(kpis.totalDeliveries),
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      icon: '📦',
    },
    {
      label: 'Offener Umsatz',
      value: formatCurrency(kpis.totalOpenRevenue),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '💰',
    },
    {
      label: 'Verzögerte Lieferungen',
      value: formatNumber(kpis.delayedDeliveries),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '⚠️',
    },
    {
      label: 'Ø Verzögerung',
      value: kpis.averageDelay > 0 ? `${kpis.averageDelay.toFixed(1)} Tage` : 'Keine',
      color: kpis.averageDelay > 0 ? 'text-orange-600' : 'text-gray-600',
      bgColor: kpis.averageDelay > 0 ? 'bg-orange-50' : 'bg-gray-50',
      icon: '⏱️',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="transition-shadow hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.bgColor} text-2xl`}>
                {card.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
