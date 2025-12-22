/**
 * Project Pie Charts Component
 * Shows two pie charts:
 * 1. Projects per Projektleiter (project manager)
 * 2. Projects per Category A/B/C
 */

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { ProjectEntry } from '@/types/controlling';

interface ProjectPieChartsProps {
  projects: ProjectEntry[];
}

// Colors for project managers (will cycle through)
const MANAGER_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#ef4444', // red
  '#84cc16', // lime
];

// Fixed colors for categories
const CATEGORY_COLORS = {
  A: '#3b82f6', // blue
  B: '#22c55e', // green
  C: '#f97316', // orange
};

// Custom label renderer that shows name and value
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
  value,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
}) => {
  if (percent < 0.05) return null; // Don't show label for very small slices

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
    >
      {`${name}: ${value}`}
    </text>
  );
};

// Simpler label just showing value inside slice
const renderValueLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  value,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  value: number;
}) => {
  if (percent < 0.08) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {value}
    </text>
  );
};

export default function ProjectPieCharts({ projects }: ProjectPieChartsProps) {
  // Aggregate by project manager
  const managerData = useMemo(() => {
    const counts = new Map<string, number>();

    projects.forEach((project) => {
      const manager = project.projektleiter || 'Unbekannt';
      counts.set(manager, (counts.get(manager) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  // Aggregate by category
  const categoryData = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0 };

    projects.forEach((project) => {
      if (project.projektkategorie in counts) {
        counts[project.projektkategorie]++;
      }
    });

    return [
      { name: 'Kategorie A', value: counts.A, category: 'A' },
      { name: 'Kategorie B', value: counts.B, category: 'B' },
      { name: 'Kategorie C', value: counts.C, category: 'C' },
    ].filter(item => item.value > 0);
  }, [projects]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Projects per Project Manager */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
          Projekte pro Projektleiter
        </h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={managerData}
                cx="40%"
                cy="50%"
                labelLine={true}
                label={renderCustomLabel}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {managerData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MANAGER_COLORS[index % MANAGER_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} Projekte`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Manager summary */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 justify-center">
            {managerData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center gap-1 text-xs"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MANAGER_COLORS[index % MANAGER_COLORS.length] }}
                />
                <span className="text-gray-600">{item.name}</span>
                <span className="font-semibold">({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects per Category */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
          Projekte je Kategorie
        </h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={renderCustomLabel}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry) => (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} Projekte`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Category summary below */}
        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {categoryData.find(d => d.category === 'A')?.value || 0}
            </div>
            <div className="text-xs text-gray-500">Kategorie A</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {categoryData.find(d => d.category === 'B')?.value || 0}
            </div>
            <div className="text-xs text-gray-500">Kategorie B</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {categoryData.find(d => d.category === 'C')?.value || 0}
            </div>
            <div className="text-xs text-gray-500">Kategorie C</div>
          </div>
        </div>
      </div>
    </div>
  );
}
