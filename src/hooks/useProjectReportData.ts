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
  verspaetetePAs: Array<{
    paNummer: string;
    beschreibung: string;
    endDatum: string;
    tageVerspaetet: number;
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
 * Check if an entry is completed/closed (same logic as useProductionHierarchy)
 */
function isEntryCompleted(entry: ProductionEntry): boolean {
  if (entry.status) {
    const status = entry.status.toLowerCase();
    if (
      status.includes('geschlossen') ||
      status.includes('closed') ||
      status.includes('abgeschlossen') ||
      status.includes('fertig') ||
      status.includes('erledigt')
    ) {
      return true;
    }
  }
  const isActive = entry.active === 'X' || entry.active === true;
  if (!isActive && entry.completionPercentage === 100) {
    return true;
  }
  return false;
}

/**
 * Calculate production statistics from entries
 * IMPORTANT: Hours are stored in MINUTES in the database, must divide by 60
 */
function calculateProductionStats(entries: ProductionEntry[]): ProductionStats {
  // Filter out completed entries (same as Soll-Ist-Vergleich with hideCompleted)
  const activeEntries = entries.filter(entry => !isEntryCompleted(entry));

  // Filter unique PAs (by workOrderNumber)
  const paMap = new Map<string, ProductionEntry[]>();

  activeEntries.forEach((entry) => {
    const paNumber = entry.workOrderNumber || 'unknown';
    if (!paMap.has(paNumber)) {
      paMap.set(paNumber, []);
    }
    paMap.get(paNumber)!.push(entry);
  });

  // Calculate totals - IMPORTANT: Convert from minutes to hours (divide by 60)
  let totalPlannedHours = 0;
  let totalActualHours = 0;
  let totalOperations = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const paStats: Array<{
    paNummer: string;
    beschreibung: string;
    plannedHours: number;
    actualHours: number;
    abweichungProzent: number;
    endDatum: Date | null;
  }> = [];

  paMap.forEach((paEntries, paNummer) => {
    let paPlannedMinutes = 0;
    let paActualMinutes = 0;
    let latestEndDate: Date | null = null;

    paEntries.forEach((entry) => {
      // Values are stored in MINUTES
      paPlannedMinutes += entry.plannedHours || 0;
      paActualMinutes += entry.actualHours || 0;
      totalOperations++;

      // Track the latest end date for this PA
      if (entry.plannedEndDate) {
        const endDate = new Date(entry.plannedEndDate);
        if (!latestEndDate || endDate > latestEndDate) {
          latestEndDate = endDate;
        }
      }
    });

    // Convert to hours
    const paPlannedHours = paPlannedMinutes / 60;
    const paActualHours = paActualMinutes / 60;

    totalPlannedHours += paPlannedHours;
    totalActualHours += paActualHours;

    // Calculate deviation percentage
    const abweichungProzent = paPlannedHours > 0
      ? ((paActualHours - paPlannedHours) / paPlannedHours) * 100
      : 0;

    paStats.push({
      paNummer,
      beschreibung: paEntries[0]?.productDescription || paEntries[0]?.notes || '',
      plannedHours: paPlannedHours,
      actualHours: paActualHours,
      abweichungProzent,
      endDatum: latestEndDate,
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

  // Find delayed PAs (end date < today)
  const verspaetetePAs = paStats
    .filter((pa) => pa.endDatum && pa.endDatum < today)
    .map((pa) => {
      const diffTime = today.getTime() - pa.endDatum!.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        paNummer: pa.paNummer,
        beschreibung: pa.beschreibung,
        endDatum: pa.endDatum!.toLocaleDateString('de-DE'),
        tageVerspaetet: diffDays,
      };
    })
    .sort((a, b) => b.tageVerspaetet - a.tageVerspaetet)
    .slice(0, 10);

  return {
    anzahlPAs: paMap.size,
    anzahlArbeitsgaenge: totalOperations,
    stundenPlan: totalPlannedHours,
    stundenIst: totalActualHours,
    abweichungStunden: totalActualHours - totalPlannedHours,
    kritischePAs,
    verspaetetePAs,
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
      // Try to find entries by projektnummer index first
      let entries = await productionRepository.findByProjektnummer(projektnummer);

      // If no entries found, the projektnummer field might be empty in production data
      // In that case, we skip production stats (feature still works without them)
      if (entries.length === 0) {
        console.log(`No production entries found for projektnummer: ${projektnummer}`);
        setProductionStats(null);
      } else {
        console.log(`Found ${entries.length} production entries for projektnummer: ${projektnummer}`);
        const stats = calculateProductionStats(entries);
        console.log(`Production stats: ${stats.anzahlPAs} PAs, ${stats.stundenPlan.toFixed(1)}h Plan, ${stats.stundenIst.toFixed(1)}h Ist`);
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
