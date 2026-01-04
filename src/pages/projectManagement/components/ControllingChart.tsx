/**
 * Controlling Chart Component
 * Shows projects or turnover over time with year filter
 * Modern design with gradient fills - adapts to dark mode
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
} from 'recharts';
import Button from '@/components/ui/Button';
import type { ControllingEntry } from '@/types/controlling';

interface ControllingChartProps {
  data: ControllingEntry[];
  years: number[];
}

type ViewMode = 'projects' | 'turnover';
type TimeRange = 'last7' | 'last30' | 'last3months' | 'all';

// Light mode colors (Aqua)
const CATEGORY_COLORS_LIGHT = {
  A: '#00E097',  // mint (primary)
  B: '#00DEE0',  // cyan
  C: '#0050E0',  // blue
};
const PRIMARY_COLOR_LIGHT = '#00E097';

// Dark mode colors (Orange → Gold → Green)
const CATEGORY_COLORS_DARK = {
  A: '#FFAA80',  // orange
  B: '#E0BD00',  // gold
  C: '#80FF80',  // green
};
const PRIMARY_COLOR_DARK = '#E0BD00'; // gold as primary

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

export default function ControllingChart({ data, years }: ControllingChartProps) {
  const isDark = useDarkMode();

  // Select colors based on theme
  const CATEGORY_COLORS = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const PRIMARY_COLOR = isDark ? PRIMARY_COLOR_DARK : PRIMARY_COLOR_LIGHT;

  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter data by year and time range
  const filteredData = useMemo(() => {
    let filtered = data;

    if (selectedYear !== 'all') {
      filtered = filtered.filter(entry => entry.year === selectedYear);
    }

    // Apply time range filter
    if (timeRange !== 'all' && filtered.length > 0) {
      const now = new Date();
      switch (timeRange) {
        case 'last7':
          filtered = filtered.filter(entry => {
            const diff = (now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 7;
          });
          break;
        case 'last30':
          filtered = filtered.filter(entry => {
            const diff = (now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 30;
          });
          break;
        case 'last3months':
          filtered = filtered.filter(entry => {
            const diff = (now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 90;
          });
          break;
      }
    }

    return filtered;
  }, [data, selectedYear, timeRange]);

  // Format data for chart
  const chartData = useMemo(() => {
    return filteredData.map(entry => ({
      date: entry.date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
      }),
      fullDate: entry.date.toLocaleDateString('de-DE'),
      categoryA: entry.categoryA,
      categoryB: entry.categoryB,
      categoryC: entry.categoryC,
      total: entry.totalProjects,
      turnover: entry.turnover,
      turnoverFormatted: formatCurrency(entry.turnover),
    }));
  }, [filteredData]);

  // Format currency
  function formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} Mio €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} T€`;
    }
    return `${value.toFixed(0)} €`;
  }

  // Custom tooltip with modern styling
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; dataKey: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = chartData.find(d => d.date === label);

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[150px]">
        <p className="font-semibold text-foreground mb-2 text-sm">{dataPoint?.fullDate}</p>
        {viewMode === 'projects' ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs" style={{ color: CATEGORY_COLORS.A }}>Kat A</span>
              <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS.A }}>{dataPoint?.categoryA}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs" style={{ color: CATEGORY_COLORS.B }}>Kat B</span>
              <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS.B }}>{dataPoint?.categoryB}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs" style={{ color: CATEGORY_COLORS.C }}>Kat C</span>
              <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS.C }}>{dataPoint?.categoryC}</span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">Gesamt</span>
              <span className="text-sm font-bold text-foreground">{dataPoint?.total}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Umsatz</span>
            <span className="text-sm font-bold text-primary">{dataPoint?.turnoverFormatted}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {viewMode === 'projects' ? 'Projektübersicht' : 'Umsatzentwicklung'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {timeRange === 'last3months' ? 'Letzte 3 Monate' :
             timeRange === 'last30' ? 'Letzte 30 Tage' :
             timeRange === 'last7' ? 'Letzte 7 Tage' : 'Gesamter Zeitraum'}
          </p>
        </div>

        {/* Time Range Filter - like in screenshot */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setTimeRange('last3months')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeRange === 'last3months'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            3 Monate
          </button>
          <button
            onClick={() => setTimeRange('last30')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeRange === 'last30'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30 Tage
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeRange === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Alle
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'projects' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('projects')}
          >
            Projekte
          </Button>
          <Button
            variant={viewMode === 'turnover' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('turnover')}
          >
            Umsatz
          </Button>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Jahr:</span>
          <Button
            variant={selectedYear === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear('all')}
          >
            Alle
          </Button>
          {years.map(year => (
            <Button
              key={year}
              variant={selectedYear === year ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Keine Daten verfügbar
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCatA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATEGORY_COLORS.A} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={CATEGORY_COLORS.A} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCatB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATEGORY_COLORS.B} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={CATEGORY_COLORS.B} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCatC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CATEGORY_COLORS.C} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={CATEGORY_COLORS.C} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorTurnover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (viewMode === 'turnover') {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {viewMode === 'projects' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="categoryA"
                    name="Kategorie A"
                    stackId="1"
                    stroke={CATEGORY_COLORS.A}
                    strokeWidth={2}
                    fill="url(#colorCatA)"
                  />
                  <Area
                    type="monotone"
                    dataKey="categoryB"
                    name="Kategorie B"
                    stackId="1"
                    stroke={CATEGORY_COLORS.B}
                    strokeWidth={2}
                    fill="url(#colorCatB)"
                  />
                  <Area
                    type="monotone"
                    dataKey="categoryC"
                    name="Kategorie C"
                    stackId="1"
                    stroke={CATEGORY_COLORS.C}
                    strokeWidth={2}
                    fill="url(#colorCatC)"
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="turnover"
                  name="Umsatz"
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  fill="url(#colorTurnover)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-4">
        {viewMode === 'projects' ? (
          <>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryA : 0}
              </div>
              <div className="text-xs text-muted-foreground">Kat A</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary/80">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryB : 0}
              </div>
              <div className="text-xs text-muted-foreground">Kat B</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary/60">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryC : 0}
              </div>
              <div className="text-xs text-muted-foreground">Kat C</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].totalProjects : 0}
              </div>
              <div className="text-xs text-muted-foreground">Gesamt</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center col-span-2">
              <div className="text-xl font-bold text-primary">
                {filteredData.length > 0 ? formatCurrency(filteredData[filteredData.length - 1].turnover) : '0 €'}
              </div>
              <div className="text-xs text-muted-foreground">Aktueller Umsatz</div>
            </div>
            <div className="text-center col-span-2">
              <div className="text-xl font-bold text-muted-foreground">
                {filteredData.length > 0 ? formatCurrency(
                  Math.max(...filteredData.map(d => d.turnover))
                ) : '0 €'}
              </div>
              <div className="text-xs text-muted-foreground">Maximum</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
