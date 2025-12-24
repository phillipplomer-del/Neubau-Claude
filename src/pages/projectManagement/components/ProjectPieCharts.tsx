/**
 * Project Pie Charts Component
 * Shows two donut charts with legend on the right:
 * 1. Projects per Projektleiter (project manager)
 * 2. Projects per Category A/B/C
 */

import { useMemo, useEffect, useState } from 'react';
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

// Light mode colors (Aqua)
const MANAGER_COLORS_LIGHT = [
  '#00E097', // mint (primary)
  '#00DEE0', // cyan
  '#00B8D4', // teal
  '#0050E0', // blue
  '#00C9A7', // sea green
  '#40E0D0', // turquoise
  '#00CED1', // dark cyan
  '#20B2AA', // light sea green
];

// Dark mode colors (Gold/Lime)
const MANAGER_COLORS_DARK = [
  '#E0BD00', // gold (primary)
  '#E0D900', // yellow
  '#9EE000', // lime
  '#45F600', // green
  '#E0A200', // orange gold
  '#D4E040', // yellow-lime
  '#B8E000', // lime-green
  '#8BC34A', // light green
];

// Light mode category colors
const CATEGORY_COLORS_LIGHT = {
  A: '#00E097', // mint (primary)
  B: '#00DEE0', // cyan
  C: '#0050E0', // blue
};

// Dark mode category colors
const CATEGORY_COLORS_DARK = {
  A: '#E0BD00', // gold (primary)
  B: '#9EE000', // lime
  C: '#45F600', // green
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

export default function ProjectPieCharts({ projects }: ProjectPieChartsProps) {
  const isDark = useDarkMode();

  // Select colors based on theme
  const MANAGER_COLORS = isDark ? MANAGER_COLORS_DARK : MANAGER_COLORS_LIGHT;
  const CATEGORY_COLORS = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;

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
      <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
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
                      fillOpacity={0.85}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} Projekte`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-card)',
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
      <div className="rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
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
                      fillOpacity={0.85}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} Projekte`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-card)',
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
