/**
 * Hook for managing controlling data
 * Reads data from the shared projectRepository (imported via main Import page)
 * Also loads time series data from separate IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import type { ControllingEntry, ProjectEntry } from '@/types/controlling';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import { loadTimeSeries, clearTimeSeries } from '@/lib/controlling/timeseriesParser';
import type { ProjectManagementEntry } from '@/types/projectManagement';

interface UseControllingDataReturn {
  data: ControllingEntry[];
  projects: ProjectEntry[];
  years: number[];
  loading: boolean;
  error: string | null;
  clearData: () => Promise<void>;
}

/**
 * Transform ProjectManagementEntry to ProjectEntry for controlling charts
 */
function transformToProjectEntry(entry: ProjectManagementEntry): ProjectEntry | null {
  // Skip entries without projektnummer
  if (!entry.projektnummer) return null;

  // Map category to A/B/C
  let kategorie: 'A' | 'B' | 'C' = 'C';
  if (entry.category === 'A' || entry.category === 'B' || entry.category === 'C') {
    kategorie = entry.category;
  }

  // Access additional fields via type assertion
  const extendedEntry = entry as Record<string, unknown>;

  return {
    projektnummer: String(entry.projektnummer),
    auftraggeber: entry.client || '',
    bezeichnung: entry.projectName || '',
    projektleiter: entry.projectManager || 'Unbekannt',
    projektkategorie: kategorie,
    umsatz: Number(entry.actualRevenue) || 0,
    vk: Number(entry.plannedBudget) || 0,
    aktuell: Number(entry.actualCosts) || 0,
    voraussichtlich: Number(extendedEntry.forecastCosts) || 0,
    marge: Number(extendedEntry.marginEuro) || 0,
    margeProzent: Number(entry.profitMargin) || 0,
  };
}

export function useControllingData(): UseControllingDataReturn {
  const [data, setData] = useState<ControllingEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load project data from shared repository
        const allEntries = await projectRepository.getAll() as ProjectManagementEntry[];

        // Transform to ProjectEntry format
        const transformedProjects: ProjectEntry[] = [];
        for (const entry of allEntries) {
          const transformed = transformToProjectEntry(entry);
          if (transformed) {
            transformedProjects.push(transformed);
          }
        }

        setProjects(transformedProjects);

        // Load time series data from separate IndexedDB
        const { entries: timeseriesEntries, years: timeseriesYears } = await loadTimeSeries();
        setData(timeseriesEntries);
        setYears(timeseriesYears);

        setLoading(false);
      } catch (err) {
        console.error('Error loading controlling data:', err);
        setError('Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Clear all project data and time series
  const clearData = useCallback(async () => {
    try {
      await projectRepository.clear();
      await clearTimeSeries();
      setData([]);
      setProjects([]);
      setYears([]);
    } catch (err) {
      setError('Fehler beim Löschen der Daten');
      throw err;
    }
  }, []);

  return {
    data,
    projects,
    years,
    loading,
    error,
    clearData,
  };
}
