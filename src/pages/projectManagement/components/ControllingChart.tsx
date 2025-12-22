/**
 * Controlling Chart Component
 * Shows projects or turnover over time with year filter
 */

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

export default function ControllingChart({ data, years }: ControllingChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Filter data by year
  const filteredData = useMemo(() => {
    if (selectedYear === 'all') {
      return data;
    }
    return data.filter(entry => entry.year === selectedYear);
  }, [data, selectedYear]);

  // Format data for chart
  const chartData = useMemo(() => {
    return filteredData.map(entry => ({
      date: entry.date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: selectedYear === 'all' ? '2-digit' : undefined,
      }),
      fullDate: entry.date.toLocaleDateString('de-DE'),
      categoryA: entry.categoryA,
      categoryB: entry.categoryB,
      categoryC: entry.categoryC,
      total: entry.totalProjects,
      turnover: entry.turnover,
      turnoverFormatted: formatCurrency(entry.turnover),
    }));
  }, [filteredData, selectedYear]);

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = filteredData.find(d =>
      d.date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: selectedYear === 'all' ? '2-digit' : undefined,
      }) === label
    );

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{dataPoint?.date.toLocaleDateString('de-DE')}</p>
        {viewMode === 'projects' ? (
          <>
            <p className="text-sm text-blue-600">Kat A: {dataPoint?.categoryA}</p>
            <p className="text-sm text-green-600">Kat B: {dataPoint?.categoryB}</p>
            <p className="text-sm text-orange-600">Kat C: {dataPoint?.categoryC}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 pt-1 border-t">
              Gesamt: {dataPoint?.totalProjects}
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold text-green-700">
            {formatCurrency(dataPoint?.turnover || 0)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
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
          <span className="text-sm text-gray-600">Jahr:</span>
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
      <div className="h-[400px]">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Keine Daten verfügbar
          </div>
        ) : viewMode === 'projects' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#9ca3af' }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#9ca3af' }}
                label={{
                  value: 'Anzahl Projekte',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6b7280' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="categoryA"
                name="Kategorie A"
                stackId="1"
                stroke="#3b82f6"
                fill="#93c5fd"
              />
              <Area
                type="monotone"
                dataKey="categoryB"
                name="Kategorie B"
                stackId="1"
                stroke="#22c55e"
                fill="#86efac"
              />
              <Area
                type="monotone"
                dataKey="categoryC"
                name="Kategorie C"
                stackId="1"
                stroke="#f97316"
                fill="#fdba74"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#9ca3af' }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={{ stroke: '#9ca3af' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value;
                }}
                label={{
                  value: 'Umsatz (€)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6b7280' }
                }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Umsatz']}
                labelFormatter={(label) => {
                  const dataPoint = filteredData.find(d =>
                    d.date.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: selectedYear === 'all' ? '2-digit' : undefined,
                    }) === label
                  );
                  return dataPoint?.date.toLocaleDateString('de-DE') || label;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="turnover"
                name="Umsatz"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
        {viewMode === 'projects' ? (
          <>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryA : 0}
              </div>
              <div className="text-xs text-gray-500">Aktuell Kat A</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryB : 0}
              </div>
              <div className="text-xs text-gray-500">Aktuell Kat B</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].categoryC : 0}
              </div>
              <div className="text-xs text-gray-500">Aktuell Kat C</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {filteredData.length > 0 ? filteredData[filteredData.length - 1].totalProjects : 0}
              </div>
              <div className="text-xs text-gray-500">Gesamt Projekte</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center col-span-2">
              <div className="text-2xl font-bold text-green-700">
                {filteredData.length > 0 ? formatCurrency(filteredData[filteredData.length - 1].turnover) : '0 €'}
              </div>
              <div className="text-xs text-gray-500">Aktueller Umsatz</div>
            </div>
            <div className="text-center col-span-2">
              <div className="text-2xl font-bold text-gray-600">
                {filteredData.length > 0 ? formatCurrency(
                  Math.max(...filteredData.map(d => d.turnover))
                ) : '0 €'}
              </div>
              <div className="text-xs text-gray-500">Maximum im Zeitraum</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
