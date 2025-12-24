/**
 * Financial Bar Chart Component
 * Shows aggregated financial metrics: Umsatz, VK, Aktuell, Voraussichtlich, Marge
 */

import { useMemo, useEffect, useState } from 'react';
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

// Light mode colors (Aqua)
const COLORS_LIGHT = {
  umsatz: '#00E097',           // mint (primary)
  vk: '#00DEE0',               // cyan
  aktuell: '#00B8D4',          // teal
  voraussichtlich: '#0050E0',  // blue
  marge: '#00C9A7',            // sea green
};

// Dark mode colors (Gold/Lime)
const COLORS_DARK = {
  umsatz: '#E0BD00',           // gold (primary)
  vk: '#E0D900',               // yellow
  aktuell: '#9EE000',          // lime
  voraussichtlich: '#45F600',  // green
  marge: '#E0A200',            // orange gold
};

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
  const isDark = useDarkMode();

  // Select colors based on theme
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

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
      <div className="bg-card border border-border rounded-[12px] shadow-[var(--shadow-card)] p-3">
        <p className="font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{data.payload.name}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
      </div>
    );
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold text-foreground mb-3 text-center" style={{ fontFamily: 'var(--font-display)' }}>
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
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              onMouseEnter={(_, index) => {
                const bars = document.querySelectorAll('.recharts-bar-rectangle');
                bars.forEach((bar, i) => {
                  if (i === index) {
                    (bar as HTMLElement).style.filter = 'brightness(1.15)';
                    (bar as HTMLElement).style.transform = 'scaleY(1.02)';
                    (bar as HTMLElement).style.transformOrigin = 'bottom';
                  }
                });
              }}
              onMouseLeave={() => {
                const bars = document.querySelectorAll('.recharts-bar-rectangle');
                bars.forEach((bar) => {
                  (bar as HTMLElement).style.filter = '';
                  (bar as HTMLElement).style.transform = '';
                });
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={COLORS[entry.key as keyof typeof COLORS]}
                  fillOpacity={0.85}
                  style={{ transition: 'all 200ms ease' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary below chart */}
      <div className="mt-3 pt-3 border-t border-border grid grid-cols-5 gap-2 text-center">
        {chartData.map((item) => (
          <div key={item.key}>
            <div
              className="text-base font-bold"
              style={{ color: COLORS[item.key as keyof typeof COLORS], fontFamily: 'var(--font-display)' }}
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
