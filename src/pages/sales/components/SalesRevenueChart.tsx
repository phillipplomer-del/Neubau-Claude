/**
 * Sales Revenue Chart Component
 * Shows revenue over time with Plan vs. Actual comparison
 */

import { useMemo, useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  ComposedChart,
} from 'recharts';

interface RevenueDataPoint {
  month: string;
  plan: number;
  actual: number;
}

interface SalesRevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

type TimeRange = '3months' | '6months' | '12months' | 'all';

// Hook to detect dark mode
function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// Colors
const COLORS_LIGHT = {
  actual: '#00E097',
  plan: '#0050E0',
};

const COLORS_DARK = {
  actual: '#FFAA80',
  plan: '#E0BD00',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} Mio €`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} T€`;
  }
  return `${value.toFixed(0)} €`;
}

export default function SalesRevenueChart({
  data,
  loading = false,
}: SalesRevenueChartProps) {
  const isDark = useDarkMode();
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;

    const months = timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    return data.slice(-months);
  }, [data, timeRange]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalActual = filteredData.reduce((sum, d) => sum + d.actual, 0);
    const totalPlan = filteredData.reduce((sum, d) => sum + d.plan, 0);
    const achievement = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;

    return { totalActual, totalPlan, achievement };
  }, [filteredData]);

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const actualValue = payload.find((p) => p.dataKey === 'actual')?.value || 0;
    const planValue = payload.find((p) => p.dataKey === 'plan')?.value || 0;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
        <p className="font-semibold text-foreground mb-2 text-sm">{label}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs" style={{ color: COLORS.actual }}>
              Ist
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: COLORS.actual }}
            >
              {formatCurrency(actualValue)}
            </span>
          </div>
          {planValue > 0 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs" style={{ color: COLORS.plan }}>
                Plan
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: COLORS.plan }}
              >
                {formatCurrency(planValue)}
              </span>
            </div>
          )}
          {planValue > 0 && (
            <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">Erreichung</span>
              <span
                className={`text-sm font-bold ${
                  actualValue >= planValue
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {((actualValue / planValue) * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 h-[340px] animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4"></div>
        <div className="h-[260px] bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Umsatzentwicklung
          </h3>
          <p className="text-sm text-muted-foreground">Plan vs. Ist</p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {[
            { key: '3months', label: '3M' },
            { key: '6months', label: '6M' },
            { key: '12months', label: '1J' },
            { key: 'all', label: 'Alle' },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key as TimeRange)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px]">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Keine Daten verfügbar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={COLORS.actual}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLORS.actual}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Plan as dashed line */}
              <Line
                type="monotone"
                dataKey="plan"
                name="Plan"
                stroke={COLORS.plan}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />

              {/* Actual as filled area */}
              <Area
                type="monotone"
                dataKey="actual"
                name="Ist"
                stroke={COLORS.actual}
                strokeWidth={2}
                fill="url(#colorActual)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">
            {formatCurrency(totals.totalActual)}
          </div>
          <div className="text-xs text-muted-foreground">Ist Gesamt</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-muted-foreground">
            {totals.totalPlan > 0 ? formatCurrency(totals.totalPlan) : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Plan Gesamt</div>
        </div>
        <div className="text-center">
          <div
            className={`text-lg font-bold ${
              totals.achievement >= 100
                ? 'text-green-600 dark:text-green-400'
                : totals.achievement >= 80
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {totals.totalPlan > 0 ? `${totals.achievement.toFixed(0)}%` : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Erreichung</div>
        </div>
      </div>
    </div>
  );
}
