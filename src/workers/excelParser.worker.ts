/**
 * Excel Parser Web Worker
 * Parses large Excel files in the background without blocking the UI
 */

import * as XLSX from 'xlsx';
import type { Department, ImportProgress } from '../types/common';

// Message types
interface ParseMessage {
  type: 'parse';
  file: ArrayBuffer;
  department: Department;
  fileName: string;
}

interface ProgressMessage {
  type: 'progress';
  data: ImportProgress;
}

interface ResultMessage {
  type: 'complete';
  data: {
    rows: Record<string, unknown>[];
    columns: string[];
    totalRows: number;
  };
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerMessage = ParseMessage;
type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'parse') {
    try {
      await parseExcelFile(message.file, message.department, message.fileName);
    } catch (error) {
      const errorMessage: ErrorMessage = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(errorMessage);
    }
  }
};

/**
 * Parse Excel file and send progress updates
 */
async function parseExcelFile(
  arrayBuffer: ArrayBuffer,
  department: Department,
  fileName: string
): Promise<void> {
  // Stage 1: Parsing
  sendProgress({
    stage: 'parsing',
    processed: 0,
    total: 100,
    percentage: 0,
    message: 'Excel-Datei wird geladen...',
  });

  // Read workbook
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  sendProgress({
    stage: 'parsing',
    processed: 30,
    total: 100,
    percentage: 30,
    message: 'Arbeitsblatt wird verarbeitet...',
  });

  // Find the sheet with actual data
  // Priority order: look for specific sheet names first, then use the largest sheet
  console.log('[Worker v4] Available sheets:', workbook.SheetNames);

  let sheetName: string | null = null;
  let sheet: XLSX.WorkSheet | null = null;

  // Department-specific sheet name detection
  if (department === 'sales') {
    // Look for common sales sheet names
    const salesSheetNames = ['Orderbacklog', 'Offene Lieferungen', 'Sales', 'Verkauf'];
    sheetName = workbook.SheetNames.find((name) =>
      salesSheetNames.some((pattern) => name.toLowerCase().includes(pattern.toLowerCase()))
    ) || null;
  } else if (department === 'production') {
    // Look for common production sheet names
    const productionSheetNames = ['Produktion', 'Production', 'Soll-Ist', 'PA'];
    sheetName = workbook.SheetNames.find((name) =>
      productionSheetNames.some((pattern) => name.toLowerCase().includes(pattern.toLowerCase()))
    ) || null;
  } else if (department === 'projectManagement') {
    // Look for common project management sheet names
    const projectSheetNames = ['Controlling', 'Projekte', 'Projects', 'PM'];
    sheetName = workbook.SheetNames.find((name) =>
      projectSheetNames.some((pattern) => name.toLowerCase().includes(pattern.toLowerCase()))
    ) || null;
  }

  // If no matching sheet name found, use the sheet with the most data
  if (!sheetName) {
    console.log('[Worker v4] No matching sheet name found, finding largest sheet...');
    let maxRows = 0;

    for (const name of workbook.SheetNames) {
      const testSheet = workbook.Sheets[name];
      if (!testSheet) continue;

      const data = XLSX.utils.sheet_to_json(testSheet);
      if (data.length > maxRows) {
        maxRows = data.length;
        sheetName = name;
      }
    }
  }

  if (!sheetName) {
    throw new Error('Keine Arbeitsblätter in der Datei gefunden');
  }

  console.log('[Worker v4] Using sheet:', sheetName);
  sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Arbeitsblatt "${sheetName}" nicht gefunden`);
  }

  sendProgress({
    stage: 'parsing',
    processed: 60,
    total: 100,
    percentage: 60,
    message: 'Daten werden konvertiert...',
  });

  // Convert to JSON with explicit range to get ALL rows
  // SheetJS sometimes misses rows with many empty cells, so we need to be explicit
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: null,
    blankrows: true, // Include rows that appear blank
  });

  const totalRows = jsonData.length;
  console.log('[Worker v4] Total rows from Excel:', totalRows);

  // Debug: Log first few rows to see what data looks like
  console.log('[Worker v4] Sample row 0:', jsonData[0]);
  console.log('[Worker v4] Sample row 100:', jsonData[100]);
  console.log('[Worker v4] Sample row 500:', jsonData[500]);

  sendProgress({
    stage: 'parsing',
    processed: totalRows,
    total: totalRows,
    percentage: 100,
    message: `${totalRows} Zeilen gelesen`,
  });

  // Stage 2: Extract columns
  sendProgress({
    stage: 'validating',
    processed: 0,
    total: totalRows,
    percentage: 0,
    message: 'Spalten werden erkannt...',
  });

  const columns: string[] = [];
  if (jsonData.length > 0 && jsonData[0]) {
    Object.keys(jsonData[0]).forEach((key) => {
      columns.push(key);
    });
  }

  // Stage 3: Filter empty rows
  sendProgress({
    stage: 'validating',
    processed: totalRows / 2,
    total: totalRows,
    percentage: 50,
    message: 'Leere Zeilen werden entfernt...',
  });

  const filteredRows = jsonData.filter((row) => {
    // Keep rows that have at least ONE non-null, non-empty value in ANY column
    // This includes __EMPTY columns because the Excel might have merged cells or unusual formatting
    const keys = Object.keys(row);

    // If row has no keys at all, skip it
    if (keys.length === 0) return false;

    // Keep row if it has at least ONE non-empty, non-null value (INCLUDING __EMPTY columns)
    const hasContent = Object.values(row).some((val) => {
      // Skip __rowNum__ field (internal SheetJS field)
      if (typeof val === 'number' && val > 0 && val < 100000) {
        // Could be __rowNum__, check other values
      }

      // Null or undefined = no content
      if (val === null || val === undefined) return false;

      // Empty string = no content
      if (typeof val === 'string' && val.trim() === '') return false;

      // Any number (including 0) is valid content
      if (typeof val === 'number') return true;

      // Any date is valid content
      if (val instanceof Date) return true;

      // Non-empty string is valid content (including numeric strings like "4820.5415")
      if (typeof val === 'string' && val.trim() !== '') return true;

      return false;
    });

    return hasContent;
  });

  console.log('[Worker v4] Rows after filtering empty rows:', filteredRows.length);

  sendProgress({
    stage: 'validating',
    processed: totalRows,
    total: totalRows,
    percentage: 100,
    message: `${filteredRows.length} gültige Zeilen gefunden`,
  });

  // Stage 4: Complete
  sendProgress({
    stage: 'complete',
    processed: filteredRows.length,
    total: filteredRows.length,
    percentage: 100,
    message: 'Import abgeschlossen',
  });

  // Send results
  const result: ResultMessage = {
    type: 'complete',
    data: {
      rows: filteredRows,
      columns,
      totalRows: filteredRows.length,
    },
  };

  self.postMessage(result);
}

/**
 * Send progress update to main thread
 */
function sendProgress(progress: ImportProgress): void {
  const message: ProgressMessage = {
    type: 'progress',
    data: progress,
  };
  self.postMessage(message);
}

// Export empty object to make this a module
export {};
