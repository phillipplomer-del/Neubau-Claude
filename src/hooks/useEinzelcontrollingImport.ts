/**
 * Hook for importing Einzelcontrolling data from Excel
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type {
  EinzelcontrollingSnapshot,
  ECUebersicht,
  ECVorkalkulation,
  ECPMKonstruktion,
  ECEinkauf,
  ECProduktion,
  ECVersand,
  ECVertrieb,
  ECSonstiges,
  ECNachkalkulation,
  ECKPIs,
  ECKostenverursacher,
  ECImportResult,
  EMPTY_VORKALKULATION,
  EMPTY_PM_KONSTRUKTION,
  EMPTY_EINKAUF,
  EMPTY_PRODUKTION,
  EMPTY_VERSAND,
  EMPTY_VERTRIEB,
  EMPTY_SONSTIGES,
} from '@/types/einzelcontrolling';
import { createSnapshot } from '@/lib/firebase/einzelcontrollingRepository';

export interface UseEinzelcontrollingImportReturn {
  importing: boolean;
  progress: number;
  error: string | null;
  result: ECImportResult | null;
  importFile: (file: File, userName: string) => Promise<ECImportResult>;
  reset: () => void;
}

export function useEinzelcontrollingImport(): UseEinzelcontrollingImportReturn {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ECImportResult | null>(null);

  const reset = useCallback(() => {
    setImporting(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const parseNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle German number format (1.234,56)
      const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const getCurrentKW = (): string => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `KW${weekNumber.toString().padStart(2, '0')}/${now.getFullYear()}`;
  };

  const importFile = useCallback(async (file: File, userName: string): Promise<ECImportResult> => {
    setImporting(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      setProgress(10);

      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      setProgress(30);

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];

      if (data.length < 2) {
        throw new Error('Excel-Datei enthält keine Daten');
      }

      setProgress(50);

      // Parse headers and find projektnummer
      let projektnummer = '';
      let kalenderwoche = getCurrentKW();

      // Try to find projektnummer in first rows
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').toLowerCase();
          if (cell.includes('projektnummer') || cell.includes('projekt-nr')) {
            projektnummer = String(row[j + 1] || '').trim();
          }
          if (cell.includes('kalenderwoche') || cell.includes('kw')) {
            const kwValue = String(row[j + 1] || '').trim();
            if (kwValue.match(/kw\d+/i)) {
              kalenderwoche = kwValue;
            }
          }
        }
      }

      if (!projektnummer) {
        // Try to extract from filename
        const match = file.name.match(/(\d{5,6})/);
        if (match) {
          projektnummer = match[1];
        } else {
          throw new Error('Projektnummer konnte nicht gefunden werden');
        }
      }

      setProgress(70);

      // Parse data into sections (simplified - would need actual Excel structure)
      const uebersicht: ECUebersicht = {
        auftragsvolumen: 0,
        gesamtkosten: 0,
        deckungsbeitrag: 0,
        deckungsbeitragProzent: 0,
        projektstatus: 'In Bearbeitung',
        fortschrittProzent: 0,
      };

      const vorkalkulation: ECVorkalkulation = {
        material: 0,
        fertigung: 0,
        montage: 0,
        konstruktion: 0,
        projektmanagement: 0,
        sonstiges: 0,
        gesamt: 0,
      };

      const pmKonstruktion: ECPMKonstruktion = {
        stundenPM: 0,
        stundenKonstruktion: 0,
        kostenPM: 0,
        kostenKonstruktion: 0,
        gesamt: 0,
      };

      const einkauf: ECEinkauf = {
        materialkosten: 0,
        zukaufteile: 0,
        dienstleistungen: 0,
        gesamt: 0,
      };

      const produktion: ECProduktion = {
        stundenFertigung: 0,
        stundenMontage: 0,
        kostenFertigung: 0,
        kostenMontage: 0,
        materialverbrauch: 0,
        gesamt: 0,
      };

      const versand: ECVersand = {
        verpackung: 0,
        transport: 0,
        versicherung: 0,
        gesamt: 0,
      };

      const vertrieb: ECVertrieb = {
        provision: 0,
        reisekosten: 0,
        sonstiges: 0,
        gesamt: 0,
      };

      const sonstiges: ECSonstiges = {
        garantie: 0,
        risiko: 0,
        sonstiges: 0,
        gesamt: 0,
      };

      // Parse data rows - look for known labels
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const label = String(row[0] || '').toLowerCase().trim();

        if (label.includes('auftragsvolumen') || label.includes('auftragswert')) {
          uebersicht.auftragsvolumen = parseNumber(row[1]);
        }
        if (label.includes('gesamtkosten')) {
          uebersicht.gesamtkosten = parseNumber(row[1]);
        }
        if (label.includes('deckungsbeitrag') && !label.includes('%')) {
          uebersicht.deckungsbeitrag = parseNumber(row[1]);
        }
        if (label.includes('fortschritt') || label.includes('fertigstellung')) {
          uebersicht.fortschrittProzent = parseNumber(row[1]);
        }

        // Vorkalkulation
        if (label === 'material' || label.includes('materialkosten')) {
          vorkalkulation.material = parseNumber(row[1]);
        }
        if (label.includes('fertigung')) {
          vorkalkulation.fertigung = parseNumber(row[1]);
        }
        if (label.includes('montage')) {
          vorkalkulation.montage = parseNumber(row[1]);
        }
        if (label.includes('konstruktion')) {
          vorkalkulation.konstruktion = parseNumber(row[1]);
        }

        // Produktion
        if (label.includes('stunden fertigung')) {
          produktion.stundenFertigung = parseNumber(row[1]);
        }
        if (label.includes('stunden montage')) {
          produktion.stundenMontage = parseNumber(row[1]);
        }
        if (label.includes('kosten fertigung')) {
          produktion.kostenFertigung = parseNumber(row[1]);
        }
        if (label.includes('kosten montage')) {
          produktion.kostenMontage = parseNumber(row[1]);
        }
      }

      // Calculate totals
      vorkalkulation.gesamt =
        vorkalkulation.material +
        vorkalkulation.fertigung +
        vorkalkulation.montage +
        vorkalkulation.konstruktion +
        vorkalkulation.projektmanagement +
        vorkalkulation.sonstiges;

      produktion.gesamt =
        produktion.kostenFertigung + produktion.kostenMontage + produktion.materialverbrauch;

      einkauf.gesamt = einkauf.materialkosten + einkauf.zukaufteile + einkauf.dienstleistungen;

      // Calculate deckungsbeitrag if not set
      if (uebersicht.deckungsbeitrag === 0 && uebersicht.auftragsvolumen > 0) {
        uebersicht.deckungsbeitrag = uebersicht.auftragsvolumen - uebersicht.gesamtkosten;
      }
      if (uebersicht.auftragsvolumen > 0) {
        uebersicht.deckungsbeitragProzent =
          (uebersicht.deckungsbeitrag / uebersicht.auftragsvolumen) * 100;
      }

      const nachkalkulation: ECNachkalkulation = {
        istKostenGesamt: uebersicht.gesamtkosten,
        abweichungAbsolut: uebersicht.gesamtkosten - vorkalkulation.gesamt,
        abweichungProzent:
          vorkalkulation.gesamt > 0
            ? ((uebersicht.gesamtkosten - vorkalkulation.gesamt) / vorkalkulation.gesamt) * 100
            : 0,
      };

      // Calculate top cost drivers
      const allCosts = [
        { bereich: 'Produktion', kosten: produktion.gesamt },
        { bereich: 'Einkauf', kosten: einkauf.gesamt },
        { bereich: 'PM/Konstruktion', kosten: pmKonstruktion.gesamt },
        { bereich: 'Versand', kosten: versand.gesamt },
        { bereich: 'Vertrieb', kosten: vertrieb.gesamt },
        { bereich: 'Sonstiges', kosten: sonstiges.gesamt },
      ];

      const totalCosts = allCosts.reduce((sum, item) => sum + item.kosten, 0);
      const topKostenverursacher: ECKostenverursacher[] = allCosts
        .filter((item) => item.kosten > 0)
        .map((item) => ({
          bereich: item.bereich,
          kosten: item.kosten,
          anteilProzent: totalCosts > 0 ? (item.kosten / totalCosts) * 100 : 0,
        }))
        .sort((a, b) => b.kosten - a.kosten)
        .slice(0, 5);

      const kpis: ECKPIs = {
        deckungsbeitragAbsolut: uebersicht.deckungsbeitrag,
        deckungsbeitragProzent: uebersicht.deckungsbeitragProzent,
        roiProzent:
          uebersicht.gesamtkosten > 0
            ? (uebersicht.deckungsbeitrag / uebersicht.gesamtkosten) * 100
            : 0,
        planKosten: vorkalkulation.gesamt,
        istKosten: uebersicht.gesamtkosten,
        kostenabweichung: nachkalkulation.abweichungAbsolut,
        kostenabweichungProzent: nachkalkulation.abweichungProzent,
        fertigstellungsgradProzent: uebersicht.fortschrittProzent,
        stundenPlan: 0,
        stundenIst: produktion.stundenFertigung + produktion.stundenMontage,
        stundenabweichung: 0,
        topKostenverursacher,
      };

      setProgress(90);

      // Create snapshot in Firebase
      const snapshotId = await createSnapshot({
        projektnummer,
        kalenderwoche,
        importedBy: userName,
        data: {
          uebersicht,
          vorkalkulation,
          pmKonstruktion,
          einkauf,
          produktion,
          versand,
          vertrieb,
          sonstiges,
          nachkalkulation,
          kpis,
        },
      });

      setProgress(100);

      const importResult: ECImportResult = {
        success: true,
        projektnummer,
        kalenderwoche,
      };

      setResult(importResult);
      setImporting(false);
      return importResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      setImporting(false);

      const importResult: ECImportResult = {
        success: false,
        error: errorMessage,
      };
      setResult(importResult);
      return importResult;
    }
  }, []);

  return {
    importing,
    progress,
    error,
    result,
    importFile,
    reset,
  };
}
