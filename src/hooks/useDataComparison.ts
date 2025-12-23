/**
 * Data Comparison Hook
 * Compares Projektnummern across Sales, Production, and Controlling (Project Management)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import type { SalesEntry } from '@/types/sales';
import type { ProductionEntry } from '@/types/production';
import type { ProjectManagementEntry } from '@/types/projectManagement';

export interface DataCounts {
  sales: number;
  production: number;
  controlling: number;
  // Unique Projektnummern pro Bereich
  uniquePnrSales: number;
  uniquePnrProduction: number;
  uniquePnrControlling: number;
}

export interface MatchResult {
  projektnummer: string;
  salesCount: number;
  productionCount: number;
  controllingCount: number;
}

export interface ComparisonMatches {
  // Matches in allen drei Bereichen
  allThree: MatchResult[];
  // Matches Sales + Produktion (inkl. die auch in Controlling sind)
  salesProduction: MatchResult[];
  // Matches Sales + Controlling (inkl. die auch in Produktion sind)
  salesControlling: MatchResult[];
  // Matches Produktion + Controlling (inkl. die auch in Sales sind)
  productionControlling: MatchResult[];
  // In Sales aber NICHT in Controlling
  salesNotInControlling: MatchResult[];
}

export interface UseDataComparisonReturn {
  loading: boolean;
  error: string | null;
  counts: DataCounts;
  matches: ComparisonMatches;
  refresh: () => Promise<void>;
}

/**
 * Check if a projektnummer is valid (not empty or placeholder)
 */
function isValidProjektnummer(pnr: string | undefined | null): pnr is string {
  if (!pnr) return false;
  const trimmed = String(pnr).trim();
  if (!trimmed) return false;

  // Filter common placeholder values
  const invalidValues = ['0', '-', 'n/a', 'na', 'none', 'null', 'undefined', ''];
  if (invalidValues.includes(trimmed.toLowerCase())) return false;

  // Filter very short values
  if (trimmed.length < 2) return false;

  return true;
}

export function useDataComparison(): UseDataComparisonReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesEntry[]>([]);
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);
  const [controllingData, setControllingData] = useState<ProjectManagementEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sales, production, controlling] = await Promise.all([
        salesRepository.getAll(),
        productionRepository.getAll(),
        projectRepository.getAll(),
      ]);

      setSalesData(sales as SalesEntry[]);
      setProductionData(production as ProductionEntry[]);
      setControllingData(controlling as ProjectManagementEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build comparison matches (INKLUSIV - nicht exklusiv!)
  // Moved up so we can use the maps for counts
  const { matches, uniqueCounts } = useMemo(() => {
    // Collect unique projektnummern from each source with counts
    const salesPnr = new Map<string, number>();
    const productionPnr = new Map<string, number>();
    const controllingPnr = new Map<string, number>();

    salesData.forEach((entry) => {
      if (!isValidProjektnummer(entry.projektnummer)) return;
      salesPnr.set(entry.projektnummer, (salesPnr.get(entry.projektnummer) || 0) + 1);
    });

    productionData.forEach((entry) => {
      if (!isValidProjektnummer(entry.projektnummer)) return;
      productionPnr.set(entry.projektnummer, (productionPnr.get(entry.projektnummer) || 0) + 1);
    });

    controllingData.forEach((entry) => {
      if (!isValidProjektnummer(entry.projektnummer)) return;
      controllingPnr.set(entry.projektnummer, (controllingPnr.get(entry.projektnummer) || 0) + 1);
    });

    // Find matches - INKLUSIV (alle die in beiden/allen sind, unabhängig vom dritten)
    const allThree: MatchResult[] = [];
    const salesProduction: MatchResult[] = [];
    const salesControlling: MatchResult[] = [];
    const productionControlling: MatchResult[] = [];
    const salesNotInControlling: MatchResult[] = [];

    // Alle unique Projektnummern sammeln
    const allPnr = new Set<string>([
      ...salesPnr.keys(),
      ...productionPnr.keys(),
      ...controllingPnr.keys(),
    ]);

    allPnr.forEach((pnr) => {
      const inSales = salesPnr.has(pnr);
      const inProduction = productionPnr.has(pnr);
      const inControlling = controllingPnr.has(pnr);

      const result: MatchResult = {
        projektnummer: pnr,
        salesCount: salesPnr.get(pnr) || 0,
        productionCount: productionPnr.get(pnr) || 0,
        controllingCount: controllingPnr.get(pnr) || 0,
      };

      // In allen drei
      if (inSales && inProduction && inControlling) {
        allThree.push(result);
      }

      // Sales + Produktion (inkl. die auch in Controlling sind)
      if (inSales && inProduction) {
        salesProduction.push(result);
      }

      // Sales + Controlling (inkl. die auch in Produktion sind)
      if (inSales && inControlling) {
        salesControlling.push(result);
      }

      // Produktion + Controlling (inkl. die auch in Sales sind)
      if (inProduction && inControlling) {
        productionControlling.push(result);
      }

      // In Sales aber NICHT in Controlling
      if (inSales && !inControlling) {
        salesNotInControlling.push(result);
      }
    });

    // Sort all arrays
    const sortByPnr = (a: MatchResult, b: MatchResult) =>
      a.projektnummer.localeCompare(b.projektnummer);

    return {
      matches: {
        allThree: allThree.sort(sortByPnr),
        salesProduction: salesProduction.sort(sortByPnr),
        salesControlling: salesControlling.sort(sortByPnr),
        productionControlling: productionControlling.sort(sortByPnr),
        salesNotInControlling: salesNotInControlling.sort(sortByPnr),
      },
      uniqueCounts: {
        sales: salesPnr.size,
        production: productionPnr.size,
        controlling: controllingPnr.size,
      },
    };
  }, [salesData, productionData, controllingData]);

  // Count entries per department
  const counts: DataCounts = useMemo(() => ({
    sales: salesData.length,
    production: productionData.length,
    controlling: controllingData.length,
    uniquePnrSales: uniqueCounts.sales,
    uniquePnrProduction: uniqueCounts.production,
    uniquePnrControlling: uniqueCounts.controlling,
  }), [salesData, productionData, controllingData, uniqueCounts]);

  return {
    loading,
    error,
    counts,
    matches,
    refresh: fetchData,
  };
}
