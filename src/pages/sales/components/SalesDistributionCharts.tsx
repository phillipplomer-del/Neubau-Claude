/**
 * Sales Distribution Charts Component
 * Two donut charts: By Category (A/B/C) and By Sales Rep
 */

import { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatCurrencyShort } from '@/lib/sales/kpiCalculator';

interface CategoryData {
  A: { count: number; value: number };
  B: { count: number; value: number };
  C: { count: number; value: number };
}

interface SalesRepData {
  name: string;
  count: number;
  value: number;
}

interface SalesDistributionChartsProps {
  byCategory: CategoryData;
  bySalesRep: SalesRepData[];
  loading?: boolean;
}

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

// Category colors
const CATEGORY_COLORS_LIGHT = {
  A: '#00E097', // mint
  B: '#00DEE0', // cyan
  C: '#0050E0', // blue
};

const CATEGORY_COLORS_DARK = {
  A: '#FFAA80', // orange
  B: '#E0BD00', // gold
  C: '#80FF80', // green
};

// Sales rep colors
const REP_COLORS_LIGHT = [
  '#00E097',
  '#00DEE0',
  '#0050E0',
  '#00B8D4',
  '#00C9A7',
];

const REP_COLORS_DARK = [
  '#FFAA80',
  '#E0BD00',
  '#80FF80',
  '#FFD080',
  '#9EE000',
];

export default function SalesDistributionCharts({
  byCategory,
  bySalesRep,
  loading = false,
}: SalesDistributionChartsProps) {
  const isDark = useDarkMode();
  const CATEGORY_COLORS = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const REP_COLORS = isDark ? REP_COLORS_DARK : REP_COLORS_LIGHT;

  // Prepare category data for chart
  const categoryChartData = useMemo(() => {
    return [
      { name: 'Kategorie A', value: byCategory.A.value, count: byCategory.A.count, color: CATEGORY_COLORS.A },
      { name: 'Kategorie B', value: byCategory.B.value, count: byCategory.B.count, color: CATEGORY_COLORS.B },
      { name: 'Kategorie C', value: byCategory.C.value, count: byCategory.C.count, color: CATEGORY_COLORS.C },
    ].filter(d => d.value > 0);
  }, [byCategory, CATEGORY_COLORS]);

  // Prepare sales rep data for chart
  const repChartData = useMemo(() => {
    return bySalesRep.map((rep, index) => ({
      name: rep.name,
      value: rep.value,
      count: rep.count,
      color: REP_COLORS[index % REP_COLORS.length],
    }));
  }, [bySalesRep, REP_COLORS]);

  // Calculate totals
  const categoryTotal = useMemo(() => {
    return categoryChartData.reduce((sum, d) => sum + d.value, 0);
  }, [categoryChartData]);

  const repTotal = useMemo(() => {
    return repChartData.reduce((sum, d) => sum + d.value, 0);
  }, [repChartData]);

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { name: string; value: number; count: number } }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-foreground text-sm mb-1">{data.name}</p>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            Wert: <span className="font-medium text-foreground">{formatCurrencyShort(data.value)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Anzahl: <span className="font-medium text-foreground">{data.count}</span>
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-4"></div>
            <div className="h-[140px] flex items-center justify-center">
              <div className="w-28 h-28 bg-muted rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* By Category */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nach Kategorie</h3>

        {categoryChartData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            Keine Daten
          </div>
        ) : (
          <>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-2 space-y-1">
              {categoryChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {categoryTotal > 0 ? ((item.value / categoryTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* By Sales Rep */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nach Mitarbeiter</h3>

        {repChartData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            Keine Daten
          </div>
        ) : (
          <>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={repChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                  >
                    {repChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-2 space-y-1">
              {repChartData.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-medium text-foreground">
                    {repTotal > 0 ? ((item.value / repTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
