/**
 * Hook to get unique project numbers from various data sources
 * Used for auto-suggestions in board creation and time tracking
 */

import { useState, useEffect } from 'react';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import type { ProjectManagementEntry } from '@/types/projectManagement';
import type { SalesEntry } from '@/types/sales';
import type { ProductionEntry } from '@/types/production';

export interface ProjectSuggestion {
  projektnummer: string;
  projectName?: string;
  client?: string;
}

export function useProjectNumbers(): {
  suggestions: ProjectSuggestion[];
  loading: boolean;
} {
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectNumbers = async () => {
      try {
        // Load from all three data sources in parallel
        const [projectEntries, salesEntries, productionEntries] = await Promise.all([
          projectRepository.getAll() as Promise<ProjectManagementEntry[]>,
          salesRepository.getAll() as Promise<SalesEntry[]>,
          productionRepository.getAll() as Promise<ProductionEntry[]>,
        ]);

        // Create a map to deduplicate by projektnummer
        const projectMap = new Map<string, ProjectSuggestion>();

        // Add from Project Management (highest priority - has most info)
        for (const entry of projectEntries) {
          if (entry.projektnummer && !projectMap.has(String(entry.projektnummer))) {
            projectMap.set(String(entry.projektnummer), {
              projektnummer: String(entry.projektnummer),
              projectName: entry.projectName || undefined,
              client: entry.client || undefined,
            });
          }
        }

        // Add from Sales data
        for (const entry of salesEntries) {
          if (entry.projektnummer && !projectMap.has(String(entry.projektnummer))) {
            projectMap.set(String(entry.projektnummer), {
              projektnummer: String(entry.projektnummer),
              projectName: (entry as any).kundenname || (entry as any).kunde || undefined,
              client: (entry as any).kundenname || (entry as any).kunde || undefined,
            });
          }
        }

        // Add from Production data
        for (const entry of productionEntries) {
          if (entry.projektnummer && !projectMap.has(String(entry.projektnummer))) {
            projectMap.set(String(entry.projektnummer), {
              projektnummer: String(entry.projektnummer),
              projectName: undefined,
              client: undefined,
            });
          }
        }

        // Convert to array and sort
        const sortedSuggestions = Array.from(projectMap.values())
          .sort((a, b) => a.projektnummer.localeCompare(b.projektnummer));

        setSuggestions(sortedSuggestions);
      } catch (err) {
        console.error('Error loading project numbers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjectNumbers();
  }, []);

  return { suggestions, loading };
}
