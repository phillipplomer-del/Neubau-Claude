/**
 * Project Pie Charts Component
 * Shows two donut charts with legend on the right:
 * 1. Projects per Projektleiter (project manager)
 * 2. Projects per Category A/B/C
 */

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { ProjectEntry } from '@/types/controlling';

interface ProjectPieChartsProps {
  projects: ProjectEntry[];
}

// Purple gradient colors from design (will cycle through)
const MANAGER_COLORS = [
  'hsl(238.73, 83.53%, 66.67%)', // primary purple
  'hsl(243.4, 75.36%, 58.63%)',  // chart-2
  'hsl(244.52, 57.94%, 50.59%)', // chart-3
  'hsl(243.65, 54.5%, 41.37%)', // chart-4
  'hsl(242.17, 47.43%, 34.31%)', // chart-5
  'hsl(238.73, 83.53%, 76.67%)', // lighter primary
  'hsl(243.4, 75.36%, 68.63%)',  // lighter chart-2
  'hsl(244.52, 57.94%, 60.59%)', // lighter chart-3
];

// Purple shades for categories
const CATEGORY_COLORS = {
  A: 'hsl(238.73, 83.53%, 66.67%)', // primary purple
  B: 'hsl(243.4, 75.36%, 58.63%)',  // chart-2 darker purple
  C: 'hsl(238.73, 83.53%, 86.67%)', // lighter purple/lavender
};

export default function ProjectPieCharts({ projects }: ProjectPieChartsProps) {
  // Aggregate by project manager
  const managerData = useMemo(() => {
    const counts = new Map<string, number>();

    projects.forEach((project) => {
      const manager = project.projektleiter || 'Unbekannt';
      counts.set(manager, (counts.get(manager) || 0) + 1);
    });

    const total = projects.length;
    return Array.from(counts.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? ((value / total) * 100).toFixed(2) : '0'
      }))
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

    const total = counts.A + counts.B + counts.C;
    return [
      { name: 'Kategorie A', value: counts.A, category: 'A', percent: total > 0 ? ((counts.A / total) * 100).toFixed(2) : '0' },
      { name: 'Kategorie B', value: counts.B, category: 'B', percent: total > 0 ? ((counts.B / total) * 100).toFixed(2) : '0' },
      { name: 'Kategorie C', value: counts.C, category: 'C', percent: total > 0 ? ((counts.C / total) * 100).toFixed(2) : '0' },
    ].filter(item => item.value > 0);
  }, [projects]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Projects per Project Manager */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Projekte pro Projektleiter
        </h3>
        <div className="flex items-center">
          {/* Donut Chart */}
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={managerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 ml-4 space-y-2">
            {managerData.slice(0, 5).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: MANAGER_COLORS[index % MANAGER_COLORS.length] }}
                  />
                  <span className="text-sm text-foreground truncate max-w-[100px]">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground ml-2">{item.percent}%</span>
              </div>
            ))}
            {managerData.length > 5 && (
              <div className="text-xs text-muted-foreground">
                +{managerData.length - 5} weitere
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects per Category */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Projekte je Kategorie
        </h3>
        <div className="flex items-center">
          {/* Donut Chart */}
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 ml-4 space-y-3">
            {categoryData.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] }}
                  />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground ml-2">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
