/**
 * Controlling KPI Cards Component
 * Shows 4 KPI cards: Umsatz, Marge €, Median Marge %, Projektanzahl
 */

import { useMemo } from 'react';
import type { ProjectEntry } from '@/types/controlling';

interface ControllingKPIsProps {
  projects: ProjectEntry[];
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

export default function ControllingKPIs({ projects }: ControllingKPIsProps) {
  const kpis = useMemo(() => {
    // Sum of Umsatz
    const totalUmsatz = projects.reduce((sum, p) => sum + p.umsatz, 0);

    // Sum of Marge €
    const totalMarge = projects.reduce((sum, p) => sum + p.marge, 0);

    // Marge Prozent = Summe Marge / Summe Umsatz
    const margeProzent = totalUmsatz > 0 ? totalMarge / totalUmsatz : 0;

    // Total project count
    const projectCount = projects.length;

    return {
      totalUmsatz,
      totalMarge,
      margeProzent,
      projectCount,
    };
  }, [projects]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Umsatz */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Gesamt-Umsatz</div>
        <div className="text-2xl font-bold text-blue-600">
          {formatCurrency(kpis.totalUmsatz)}
        </div>
      </div>

      {/* Total Marge € */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Gesamt-Marge</div>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(kpis.totalMarge)}
        </div>
      </div>

      {/* Marge % */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Marge %</div>
        <div className="text-2xl font-bold text-purple-600">
          {(kpis.margeProzent * 100).toFixed(1)}%
        </div>
      </div>

      {/* Project Count */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500 mb-1">Anzahl Projekte</div>
        <div className="text-2xl font-bold text-gray-900">
          {kpis.projectCount}
        </div>
      </div>
    </div>
  );
}
