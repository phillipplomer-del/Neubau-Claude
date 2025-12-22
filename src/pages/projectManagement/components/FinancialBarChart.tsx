/**
 * Financial Bar Chart Component
 * Shows aggregated financial metrics: Umsatz, VK, Aktuell, Voraussichtlich, Marge
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ProjectEntry } from '@/types/controlling';

interface FinancialBarChartProps {
  projects: ProjectEntry[];
}

// Purple gradient colors from design (darkest to lightest)
const COLORS = {
  umsatz: 'hsl(238.73, 83.53%, 66.67%)',     // primary purple
  vk: 'hsl(243.4, 75.36%, 58.63%)',          // chart-2
  aktuell: 'hsl(244.52, 57.94%, 50.59%)',    // chart-3
  voraussichtlich: 'hsl(243.65, 54.5%, 41.37%)', // chart-4
  marge: 'hsl(242.17, 47.43%, 34.31%)',      // chart-5
};

/**
 * Format currency value for display
 */
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(2)} Mio €`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)} T€`;
  }
  return `${value.toFixed(0)} €`;
}

export default function FinancialBarChart({ projects }: FinancialBarChartProps) {
  // Aggregate financial data
  const chartData = useMemo(() => {
    const totals = {
      umsatz: 0,
      vk: 0,
      aktuell: 0,
      voraussichtlich: 0,
      marge: 0,
    };

    projects.forEach((project) => {
      totals.umsatz += project.umsatz;
      totals.vk += project.vk;
      totals.aktuell += project.aktuell;
      totals.voraussichtlich += project.voraussichtlich;
      totals.marge += project.marge;
    });

    return [
      { name: 'Umsatz', value: totals.umsatz, key: 'umsatz' },
      { name: 'VK', value: totals.vk, key: 'vk' },
      { name: 'Aktuell', value: totals.aktuell, key: 'aktuell' },
      { name: 'Voraussichtlich', value: totals.voraussichtlich, key: 'voraussichtlich' },
      { name: 'Marge €', value: totals.marge, key: 'marge' },
    ];
  }, [projects]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string } }> }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground">{data.payload.name}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
      </div>
    );
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold text-foreground mb-2 text-center">
        Finanzübersicht (Summe aller Projekte)
      </h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={COLORS[entry.key as keyof typeof COLORS]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary below chart */}
      <div className="mt-2 pt-2 border-t border-border grid grid-cols-5 gap-2 text-center">
        {chartData.map((item) => (
          <div key={item.key}>
            <div
              className="text-base font-bold"
              style={{ color: COLORS[item.key as keyof typeof COLORS] }}
            >
              {formatCurrency(item.value)}
            </div>
            <div className="text-xs text-muted-foreground">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
