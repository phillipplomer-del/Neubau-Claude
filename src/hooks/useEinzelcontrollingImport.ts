/**
 * Hook for importing Einzelcontrolling data from Excel
 * Parses the specific Excel structure with Info sheet and KW snapshots
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type {
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

// Helper to get cell value safely
function getCell(sheet: XLSX.WorkSheet, address: string): unknown {
  const cell = sheet[address];
  return cell ? cell.v : undefined;
}

// Helper to get numeric value from cell
function getNumericCell(sheet: XLSX.WorkSheet, address: string): number {
  const val = getCell(sheet, address);
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// Helper to get string value from cell
function getStringCell(sheet: XLSX.WorkSheet, address: string): string {
  const val = getCell(sheet, address);
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    return val.toLocaleDateString('de-DE');
  }
  return String(val).trim();
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

  const importFile = useCallback(async (file: File, userName: string): Promise<ECImportResult> => {
    setImporting(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      setProgress(10);

      // Read Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });

      setProgress(20);

      // Check for required sheets
      if (!workbook.SheetNames.includes('Info')) {
        throw new Error('Excel-Datei enthält kein "Info" Sheet');
      }

      const infoSheet = workbook.Sheets['Info'];

      // Extract project data from Info sheet
      const projektnummer = getStringCell(infoSheet, 'B6');
      const kunde = getStringCell(infoSheet, 'B7');
      const projektbezeichnung = getStringCell(infoSheet, 'B8');
      const umsatz = getNumericCell(infoSheet, 'B9');
      const vkNummer = getStringCell(infoSheet, 'B12');
      const liefertermin = getStringCell(infoSheet, 'B13');
      const projektleiter = getStringCell(infoSheet, 'B15');

      console.log('=== PROJEKT INFO ===');
      console.log('Projektnummer:', projektnummer);
      console.log('Kunde:', kunde);
      console.log('Umsatz:', umsatz);

      if (!projektnummer) {
        throw new Error('Projektnummer nicht gefunden (B6)');
      }

      setProgress(30);

      // Find KW columns in Auswertung section (Row 41)
      // D41=template, E41=template, F41=KW14, G41=KW46, H41=KW53...
      const kwColumns: { col: string; kw: string }[] = [];
      const cols = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

      for (const col of cols) {
        const val = getStringCell(infoSheet, `${col}41`);
        if (val && val.startsWith('KW')) {
          kwColumns.push({ col, kw: val });
        }
      }

      console.log('Gefundene KW-Spalten:', kwColumns);

      if (kwColumns.length === 0) {
        throw new Error('Keine KW-Snapshots im Info-Sheet gefunden (Zeile 41)');
      }

      setProgress(40);

      // Read Arbeitsgänge data (K5:N27 in Info sheet)
      const arbeitsgaenge: { gruppe: string; soll: number; ist: number }[] = [];
      for (let row = 5; row <= 27; row++) {
        const gruppe = getStringCell(infoSheet, `K${row}`);
        const soll = getNumericCell(infoSheet, `M${row}`);
        const ist = getNumericCell(infoSheet, `N${row}`);
        if (gruppe && gruppe !== 'Arbeitsganggruppe' && gruppe !== 'SUMME') {
          arbeitsgaenge.push({ gruppe, soll, ist });
        }
      }

      console.log('Arbeitsgänge:', arbeitsgaenge);

      // Get totals from row 27
      const stundenSoll = getNumericCell(infoSheet, 'M27');
      const stundenIst = getNumericCell(infoSheet, 'N27');

      setProgress(50);

      // Import each KW as a snapshot
      let lastSnapshotId = '';
      let importedCount = 0;

      for (const kwCol of kwColumns) {
        const { col, kw } = kwCol;
        console.log(`\n=== Importiere ${kw} (Spalte ${col}) ===`);

        // Extract data for this KW from the Auswertung section
        const vorkalkGesamt = getNumericCell(infoSheet, `${col}42`);
        const pmKosten = getNumericCell(infoSheet, `${col}43`);
        const fertigungKosten = getNumericCell(infoSheet, `${col}44`);
        const materialKosten = getNumericCell(infoSheet, `${col}45`);
        const margePlanProzent = getNumericCell(infoSheet, `${col}47`) * 100;
        const margeIstProzent = getNumericCell(infoSheet, `${col}48`) * 100;
        const hkPlan = getNumericCell(infoSheet, `${col}50`);
        const hkIst = getNumericCell(infoSheet, `${col}51`);
        const hkSoll = getNumericCell(infoSheet, `${col}54`);
        const gesamtIst = getNumericCell(infoSheet, `${col}55`);
        const ausstehendeKosten = getNumericCell(infoSheet, `${col}56`);
        const abweichung = getNumericCell(infoSheet, `${col}57`);
        const materialHK = getNumericCell(infoSheet, `${col}59`);
        const materialIst = getNumericCell(infoSheet, `${col}60`);
        const fertigungHK = getNumericCell(infoSheet, `${col}61`);
        const fertigungIst = getNumericCell(infoSheet, `${col}62`);
        const pmHK = getNumericCell(infoSheet, `${col}63`);
        const pmIst = getNumericCell(infoSheet, `${col}64`);
        const konstruktionHK = getNumericCell(infoSheet, `${col}65`);
        const konstruktionIst = getNumericCell(infoSheet, `${col}66`);

        console.log('Vorkalkulation Gesamt:', vorkalkGesamt);
        console.log('HK Plan:', hkPlan, '| HK Ist:', hkIst);
        console.log('Marge Plan %:', margePlanProzent, '| Marge Ist %:', margeIstProzent);

        // Calculate deckungsbeitrag
        const deckungsbeitrag = umsatz - gesamtIst;
        const deckungsbeitragProzent = umsatz > 0 ? (deckungsbeitrag / umsatz) * 100 : 0;

        // Calculate fortschritt based on costs
        const fortschrittProzent = hkPlan > 0 ? Math.min(100, (hkIst / hkPlan) * 100) : 0;

        // Build snapshot data
        const uebersicht: ECUebersicht = {
          auftragsvolumen: umsatz,
          gesamtkosten: gesamtIst,
          deckungsbeitrag,
          deckungsbeitragProzent,
          projektstatus: 'In Bearbeitung',
          fortschrittProzent,
        };

        const vorkalkulation: ECVorkalkulation = {
          material: materialHK,
          fertigung: fertigungHK,
          montage: 0,
          konstruktion: konstruktionHK,
          projektmanagement: pmHK,
          sonstiges: 0,
          gesamt: vorkalkGesamt,
        };

        const pmKonstruktion: ECPMKonstruktion = {
          stundenPM: 0,
          stundenKonstruktion: 0,
          kostenPM: pmHK,
          kostenKonstruktion: konstruktionHK,
          gesamt: pmHK + konstruktionHK,
        };

        const einkauf: ECEinkauf = {
          materialkosten: materialIst,
          zukaufteile: 0,
          dienstleistungen: 0,
          gesamt: materialIst,
        };

        const produktion: ECProduktion = {
          stundenFertigung: stundenIst,
          stundenMontage: 0,
          kostenFertigung: fertigungIst,
          kostenMontage: 0,
          materialverbrauch: 0,
          gesamt: fertigungIst,
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
          sonstiges: ausstehendeKosten,
          gesamt: ausstehendeKosten,
        };

        const nachkalkulation: ECNachkalkulation = {
          istKostenGesamt: gesamtIst,
          abweichungAbsolut: abweichung,
          abweichungProzent: hkPlan > 0 ? (abweichung / hkPlan) * 100 : 0,
        };

        // Build top cost drivers
        const allCosts = [
          { bereich: 'Fertigung', kosten: Math.abs(fertigungIst) },
          { bereich: 'Material', kosten: Math.abs(materialIst) },
          { bereich: 'PM', kosten: Math.abs(pmIst) },
          { bereich: 'Konstruktion', kosten: Math.abs(konstruktionIst) },
        ].filter(c => c.kosten > 0);

        const totalCosts = allCosts.reduce((sum, item) => sum + item.kosten, 0);
        const topKostenverursacher: ECKostenverursacher[] = allCosts
          .map((item) => ({
            bereich: item.bereich,
            kosten: item.kosten,
            anteilProzent: totalCosts > 0 ? (item.kosten / totalCosts) * 100 : 0,
          }))
          .sort((a, b) => b.kosten - a.kosten);

        console.log('Top Kostenverursacher:', topKostenverursacher);

        const kpis: ECKPIs = {
          deckungsbeitragAbsolut: deckungsbeitrag,
          deckungsbeitragProzent: margeIstProzent,
          roiProzent: gesamtIst > 0 ? (deckungsbeitrag / gesamtIst) * 100 : 0,
          planKosten: hkPlan,
          istKosten: gesamtIst,
          kostenabweichung: abweichung,
          kostenabweichungProzent: hkPlan > 0 ? (abweichung / hkPlan) * 100 : 0,
          fertigstellungsgradProzent: fortschrittProzent,
          stundenPlan: stundenSoll,
          stundenIst: stundenIst,
          stundenabweichung: stundenIst - stundenSoll,
          topKostenverursacher,
        };

        // Format KW for storage (e.g., "KW53" -> "KW53/2025")
        const currentYear = new Date().getFullYear();
        const kalenderwoche = kw.includes('/') ? kw : `${kw}/${currentYear}`;

        setProgress(50 + ((importedCount + 1) / kwColumns.length) * 40);

        // Create snapshot in Firebase
        try {
          lastSnapshotId = await createSnapshot({
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
          importedCount++;
          console.log(`Snapshot ${kw} erstellt mit ID:`, lastSnapshotId);
        } catch (err) {
          console.error(`Fehler beim Erstellen von Snapshot ${kw}:`, err);
          throw err;
        }
      }

      setProgress(100);

      const importResult: ECImportResult = {
        success: true,
        projektnummer,
        kalenderwoche: kwColumns[kwColumns.length - 1]?.kw || 'unknown',
      };

      console.log(`\n=== IMPORT ABGESCHLOSSEN ===`);
      console.log(`${importedCount} Snapshots importiert für Projekt ${projektnummer}`);

      setResult(importResult);
      setImporting(false);
      return importResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Import Error:', errorMessage);
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
