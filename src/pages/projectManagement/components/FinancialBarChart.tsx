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

// Colors for each bar
const COLORS = {
  umsatz: '#3b82f6',        // blue
  vk: '#8b5cf6',            // purple
  aktuell: '#22c55e',       // green
  voraussichtlich: '#f97316', // orange
  marge: '#14b8a6',         // teal
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{data.payload.name}</p>
        <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
      </div>
    );
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
        Finanzübersicht (Summe aller Projekte)
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#9ca3af' }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={{ stroke: '#9ca3af' }}
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
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-5 gap-2 text-center">
        {chartData.map((item) => (
          <div key={item.key}>
            <div
              className="text-lg font-bold"
              style={{ color: COLORS[item.key as keyof typeof COLORS] }}
            >
              {formatCurrency(item.value)}
            </div>
            <div className="text-xs text-gray-500">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
