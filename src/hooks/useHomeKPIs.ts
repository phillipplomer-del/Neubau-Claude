/**
 * Hook for Home page KPIs
 * Aggregates data from Sales and Controlling
 */

import { useState, useEffect } from 'react';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import type { SalesEntry } from '@/types/sales';
import type { ProjectManagementEntry } from '@/types/projectManagement';

export interface HomeKPIs {
  offenerUmsatz: number;
  anzahlProjekte: number;
  kritischeProjekte: number;
  beobachteteProjekte: number;
  loading: boolean;
  error: string | null;
}

export function useHomeKPIs(): HomeKPIs {
  const [kpis, setKpis] = useState<HomeKPIs>({
    offenerUmsatz: 0,
    anzahlProjekte: 0,
    kritischeProjekte: 0,
    beobachteteProjekte: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadKPIs = async () => {
      try {
        // Load sales data
        const salesEntries = await salesRepository.getAll() as SalesEntry[];

        // Calculate offener Umsatz (sum of openTurnover or remainingTurnover)
        let offenerUmsatz = 0;
        let kritischeAuftraege = 0;
        let beobachteteAuftraege = 0;

        salesEntries.forEach((entry) => {
          // Sum open turnover
          offenerUmsatz += entry.openTurnover || entry.remainingTurnover || 0;

          // Count by comment status
          if (entry.commentStatus === 'critical') {
            kritischeAuftraege++;
          } else if (entry.commentStatus === 'watched') {
            beobachteteAuftraege++;
          }
        });

        // Load project data
        const projectEntries = await projectRepository.getAll() as ProjectManagementEntry[];
        const anzahlProjekte = projectEntries.filter(p => p.projektnummer).length;

        setKpis({
          offenerUmsatz,
          anzahlProjekte,
          kritischeProjekte: kritischeAuftraege,
          beobachteteProjekte: beobachteteAuftraege,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error loading Home KPIs:', err);
        setKpis((prev) => ({
          ...prev,
          loading: false,
          error: 'Fehler beim Laden der KPIs',
        }));
      }
    };

    loadKPIs();
  }, []);

  return kpis;
}
