/**
 * Data Comparison Hook
 * Compares data across Sales, Production, and Project Management
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
  projectManagement: number;
}

export interface ProjektnummerComparison {
  projektnummer: string;
  inSales: boolean;
  inProduction: boolean;
  inProjectManagement: boolean;
  salesCount: number;
  productionCount: number;
  projectCount: number;
}

export interface ArtikelnummerComparison {
  artikelnummer: string;
  inSales: boolean;
  inProduction: boolean;
  salesCount: number;
  productionCount: number;
}

export interface ComparisonSummary {
  projektnummern: {
    total: number;
    inAllThree: number;
    inSalesAndProduction: number;
    inSalesAndProject: number;
    inProductionAndProject: number;
    onlyInSales: number;
    onlyInProduction: number;
    onlyInProject: number;
  };
  artikelnummern: {
    total: number;
    inBoth: number;
    onlyInSales: number;
    onlyInProduction: number;
  };
}

export interface UseDataComparisonReturn {
  loading: boolean;
  error: string | null;
  counts: DataCounts;
  summary: ComparisonSummary;
  projektnummernList: ProjektnummerComparison[];
  artikelnummernList: ArtikelnummerComparison[];
  refresh: () => Promise<void>;
}

export function useDataComparison(): UseDataComparisonReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesEntry[]>([]);
  const [productionData, setProductionData] = useState<ProductionEntry[]>([]);
  const [projectData, setProjectData] = useState<ProjectManagementEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sales, production, projects] = await Promise.all([
        salesRepository.getAll(),
        productionRepository.getAll(),
        projectRepository.getAll(),
      ]);

      setSalesData(sales as SalesEntry[]);
      setProductionData(production as ProductionEntry[]);
      setProjectData(projects as ProjectManagementEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Count entries per department
  const counts: DataCounts = useMemo(() => ({
    sales: salesData.length,
    production: productionData.length,
    projectManagement: projectData.length,
  }), [salesData, productionData, projectData]);

  // Build Projektnummer comparison
  const projektnummernList: ProjektnummerComparison[] = useMemo(() => {
    const pnrMap = new Map<string, ProjektnummerComparison>();

    // Add sales projektnummern
    salesData.forEach((entry) => {
      if (!entry.projektnummer) return;
      const existing = pnrMap.get(entry.projektnummer);
      if (existing) {
        existing.salesCount++;
      } else {
        pnrMap.set(entry.projektnummer, {
          projektnummer: entry.projektnummer,
          inSales: true,
          inProduction: false,
          inProjectManagement: false,
          salesCount: 1,
          productionCount: 0,
          projectCount: 0,
        });
      }
    });

    // Add production projektnummern
    productionData.forEach((entry) => {
      if (!entry.projektnummer) return;
      const existing = pnrMap.get(entry.projektnummer);
      if (existing) {
        existing.inProduction = true;
        existing.productionCount++;
      } else {
        pnrMap.set(entry.projektnummer, {
          projektnummer: entry.projektnummer,
          inSales: false,
          inProduction: true,
          inProjectManagement: false,
          salesCount: 0,
          productionCount: 1,
          projectCount: 0,
        });
      }
    });

    // Add project projektnummern
    projectData.forEach((entry) => {
      if (!entry.projektnummer) return;
      const existing = pnrMap.get(entry.projektnummer);
      if (existing) {
        existing.inProjectManagement = true;
        existing.projectCount++;
      } else {
        pnrMap.set(entry.projektnummer, {
          projektnummer: entry.projektnummer,
          inSales: false,
          inProduction: false,
          inProjectManagement: true,
          salesCount: 0,
          productionCount: 0,
          projectCount: 1,
        });
      }
    });

    return Array.from(pnrMap.values()).sort((a, b) =>
      a.projektnummer.localeCompare(b.projektnummer)
    );
  }, [salesData, productionData, projectData]);

  // Build Artikelnummer comparison (Sales vs Production only)
  const artikelnummernList: ArtikelnummerComparison[] = useMemo(() => {
    const artMap = new Map<string, ArtikelnummerComparison>();

    // Add sales artikelnummern
    salesData.forEach((entry) => {
      if (!entry.artikelnummer) return;
      const existing = artMap.get(entry.artikelnummer);
      if (existing) {
        existing.salesCount++;
      } else {
        artMap.set(entry.artikelnummer, {
          artikelnummer: entry.artikelnummer,
          inSales: true,
          inProduction: false,
          salesCount: 1,
          productionCount: 0,
        });
      }
    });

    // Add production artikelnummern
    productionData.forEach((entry) => {
      if (!entry.artikelnummer) return;
      const existing = artMap.get(entry.artikelnummer);
      if (existing) {
        existing.inProduction = true;
        existing.productionCount++;
      } else {
        artMap.set(entry.artikelnummer, {
          artikelnummer: entry.artikelnummer,
          inSales: false,
          inProduction: true,
          salesCount: 0,
          productionCount: 1,
        });
      }
    });

    return Array.from(artMap.values()).sort((a, b) =>
      a.artikelnummer.localeCompare(b.artikelnummer)
    );
  }, [salesData, productionData]);

  // Build summary statistics
  const summary: ComparisonSummary = useMemo(() => {
    const pnrStats = {
      total: projektnummernList.length,
      inAllThree: 0,
      inSalesAndProduction: 0,
      inSalesAndProject: 0,
      inProductionAndProject: 0,
      onlyInSales: 0,
      onlyInProduction: 0,
      onlyInProject: 0,
    };

    projektnummernList.forEach((item) => {
      const count = (item.inSales ? 1 : 0) + (item.inProduction ? 1 : 0) + (item.inProjectManagement ? 1 : 0);

      if (count === 3) {
        pnrStats.inAllThree++;
      } else if (count === 2) {
        if (item.inSales && item.inProduction) pnrStats.inSalesAndProduction++;
        if (item.inSales && item.inProjectManagement) pnrStats.inSalesAndProject++;
        if (item.inProduction && item.inProjectManagement) pnrStats.inProductionAndProject++;
      } else {
        if (item.inSales) pnrStats.onlyInSales++;
        if (item.inProduction) pnrStats.onlyInProduction++;
        if (item.inProjectManagement) pnrStats.onlyInProject++;
      }
    });

    const artStats = {
      total: artikelnummernList.length,
      inBoth: artikelnummernList.filter(a => a.inSales && a.inProduction).length,
      onlyInSales: artikelnummernList.filter(a => a.inSales && !a.inProduction).length,
      onlyInProduction: artikelnummernList.filter(a => !a.inSales && a.inProduction).length,
    };

    return {
      projektnummern: pnrStats,
      artikelnummern: artStats,
    };
  }, [projektnummernList, artikelnummernList]);

  return {
    loading,
    error,
    counts,
    summary,
    projektnummernList,
    artikelnummernList,
    refresh: fetchData,
  };
}
