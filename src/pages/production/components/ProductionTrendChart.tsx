/**
 * Production Trend Chart Component
 * Line chart showing on-time delivery rate over the last 8 weeks
 */

import { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ProductionTrendDataPoint } from '@/types/production';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface ProductionTrendChartProps {
  data: ProductionTrendDataPoint[];
  loading?: boolean;
}

// Theme-aware colors
const COLORS = {
  light: {
    line: '#0050E0',
    target: '#10B981',
    grid: '#E5E7EB',
    tooltip: '#FFFFFF',
  },
  dark: {
    line: '#FFAA80',
    target: '#80FF80',
    grid: '#374151',
    tooltip: '#1F2937',
  },
};

const TARGET_RATE = 95; // Target: 95% on-time delivery

export default function ProductionTrendChart({
  data,
  loading = false,
}: ProductionTrendChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      target: TARGET_RATE,
    }));
  }, [data]);

  // Calculate min/max for Y axis
  const yDomain = useMemo(() => {
    if (data.length === 0) return [80, 100];
    const values = data.map((d) => d.onTimeRate);
    const min = Math.min(...values, TARGET_RATE);
    const max = Math.max(...values, TARGET_RATE);
    return [Math.floor(min - 5), Math.ceil(max + 2)];
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Termintreue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Termintreue Trend (8 Wochen)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: colors.line }}
              ></div>
              <span className="text-muted-foreground">Aktuell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{
                  backgroundColor: colors.target,
                  borderStyle: 'dashed',
                }}
              ></div>
              <span className="text-muted-foreground">Ziel (95%)</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.grid}
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.tooltip,
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Termintreue']}
              />
              <ReferenceLine
                y={TARGET_RATE}
                stroke={colors.target}
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="onTimeRate"
                stroke={colors.line}
                strokeWidth={2.5}
                dot={{ fill: colors.line, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
