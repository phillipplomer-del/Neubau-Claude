/**
 * Hook to aggregate project data for AI report generation
 * Combines Einzelcontrolling data with PA/Arbeitsgang data
 */

import { useState, useEffect, useCallback } from 'react';
import { ProductionRepository } from '@/lib/db/repositories/productionRepository';
import type { ProductionEntry } from '@/types/production';
import type { EinzelcontrollingSnapshot } from '@/types/einzelcontrolling';
import type { ProjectReportRequest } from '@/lib/ai/geminiService';
import { transformSnapshotToRequest } from '@/lib/ai/geminiService';

interface ProductionStats {
  anzahlPAs: number;
  anzahlArbeitsgaenge: number;
  stundenPlan: number;
  stundenIst: number;
  abweichungStunden: number;
  kritischePAs: Array<{
    paNummer: string;
    beschreibung: string;
    abweichungProzent: number;
  }>;
}

interface UseProjectReportDataResult {
  loading: boolean;
  error: string | null;
  productionStats: ProductionStats | null;
  prepareReportRequest: (
    snapshot: EinzelcontrollingSnapshot,
    projektname: string,
    kunde: string
  ) => ProjectReportRequest;
  refreshProductionData: () => Promise<void>;
}

const productionRepository = new ProductionRepository();

/**
 * Calculate production statistics from entries
 */
function calculateProductionStats(entries: ProductionEntry[]): ProductionStats {
  // Filter unique PAs (by workOrderNumber)
  const paMap = new Map<string, ProductionEntry[]>();

  entries.forEach((entry) => {
    const paNumber = entry.workOrderNumber || 'unknown';
    if (!paMap.has(paNumber)) {
      paMap.set(paNumber, []);
    }
    paMap.get(paNumber)!.push(entry);
  });

  // Calculate totals
  let totalPlannedHours = 0;
  let totalActualHours = 0;
  let totalOperations = 0;

  const paStats: Array<{
    paNummer: string;
    beschreibung: string;
    plannedHours: number;
    actualHours: number;
    abweichungProzent: number;
  }> = [];

  paMap.forEach((paEntries, paNummer) => {
    let paPlanned = 0;
    let paActual = 0;

    paEntries.forEach((entry) => {
      // Convert minutes to hours if needed
      const planned = entry.plannedHours || 0;
      const actual = entry.actualHours || 0;
      paPlanned += planned;
      paActual += actual;
      totalOperations++;
    });

    totalPlannedHours += paPlanned;
    totalActualHours += paActual;

    // Calculate deviation percentage
    const abweichungProzent = paPlanned > 0
      ? ((paActual - paPlanned) / paPlanned) * 100
      : 0;

    paStats.push({
      paNummer,
      beschreibung: paEntries[0]?.productDescription || paEntries[0]?.notes || '',
      plannedHours: paPlanned,
      actualHours: paActual,
      abweichungProzent,
    });
  });

  // Find critical PAs (>20% deviation)
  const kritischePAs = paStats
    .filter((pa) => Math.abs(pa.abweichungProzent) > 20)
    .sort((a, b) => Math.abs(b.abweichungProzent) - Math.abs(a.abweichungProzent))
    .slice(0, 10)
    .map((pa) => ({
      paNummer: pa.paNummer,
      beschreibung: pa.beschreibung,
      abweichungProzent: pa.abweichungProzent,
    }));

  return {
    anzahlPAs: paMap.size,
    anzahlArbeitsgaenge: totalOperations,
    stundenPlan: totalPlannedHours,
    stundenIst: totalActualHours,
    abweichungStunden: totalActualHours - totalPlannedHours,
    kritischePAs,
  };
}

export function useProjectReportData(projektnummer: string | null): UseProjectReportDataResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productionStats, setProductionStats] = useState<ProductionStats | null>(null);

  const loadProductionData = useCallback(async () => {
    if (!projektnummer) {
      setProductionStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entries = await productionRepository.findByProjektnummer(projektnummer);

      if (entries.length === 0) {
        // No production data found - that's okay, we can still generate report
        setProductionStats(null);
      } else {
        const stats = calculateProductionStats(entries);
        setProductionStats(stats);
      }
    } catch (err) {
      console.error('Error loading production data:', err);
      setError('Fehler beim Laden der Produktionsdaten');
      setProductionStats(null);
    } finally {
      setLoading(false);
    }
  }, [projektnummer]);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  const prepareReportRequest = useCallback(
    (
      snapshot: EinzelcontrollingSnapshot,
      projektname: string,
      kunde: string
    ): ProjectReportRequest => {
      return transformSnapshotToRequest(
        snapshot,
        projektname,
        kunde,
        productionStats || undefined
      );
    },
    [productionStats]
  );

  return {
    loading,
    error,
    productionStats,
    prepareReportRequest,
    refreshProductionData: loadProductionData,
  };
}
