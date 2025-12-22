/**
 * Parser for Controlling time series data (Tabelle2)
 * This is imported separately from the main project data
 */

import * as XLSX from 'xlsx';
import type { ControllingEntry } from '@/types/controlling';

const DB_NAME = 'pps-controlling-timeseries';
const DB_VERSION = 1;
const STORE_NAME = 'timeseries';

/**
 * Open IndexedDB connection for time series data
 */
function openTimeseriesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Convert Excel serial date to JavaScript Date
 */
function excelDateToJS(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

/**
 * Parse time series from Tabelle2 of a Controlling Excel file
 */
export async function parseAndStoreTimeSeries(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });

  // Check if we have at least 2 sheets
  if (workbook.SheetNames.length < 2) {
    console.log('[Timeseries] No second sheet found, skipping time series import');
    return 0;
  }

  const sheetName = workbook.SheetNames[1]; // Tabelle2
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.log('[Timeseries] Could not access second sheet');
    return 0;
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  console.log('[Timeseries] Rows in Tabelle2:', jsonData.length);

  // Parse entries
  const entries: ControllingEntry[] = [];

  // Log first row to debug column names
  if (jsonData.length > 0) {
    console.log('[Timeseries] Column names:', Object.keys(jsonData[0]));
    console.log('[Timeseries] First row:', jsonData[0]);
  }

  for (const row of jsonData) {
    try {
      // Get date from first column (could be named differently)
      let date: Date | null = null;
      const dateValue = row['Datum'] || row['Date'] || Object.values(row)[0];

      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        date = excelDateToJS(dateValue);
      } else if (typeof dateValue === 'string') {
        // Parse date string (YYYY-MM-DD or DD.MM.YYYY)
        const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        } else {
          const germanMatch = dateValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
          if (germanMatch) {
            date = new Date(Number(germanMatch[3]), Number(germanMatch[2]) - 1, Number(germanMatch[1]));
          }
        }
      }

      if (!date || isNaN(date.getTime())) continue;

      // Get year and month
      const year = Number(row['Jahr'] || row['Year']) || date.getFullYear();
      const month = Number(row['Monat'] || row['Month']) || (date.getMonth() + 1);

      // Get category counts - try multiple column name variations (including 'Kat A' with space)
      const categoryA = Number(row['Kat A'] || row['Kategorie A'] || row['A'] || row['KatA'] || 0) || 0;
      const categoryB = Number(row['Kat B'] || row['Kategorie B'] || row['B'] || row['KatB'] || 0) || 0;
      const categoryC = Number(row['Kat C'] || row['Kategorie C'] || row['C'] || row['KatC'] || 0) || 0;

      // Get totals
      const totalProjects = Number(row['Gesamt'] || row['Total'] || row['Projekte'] || 0) || (categoryA + categoryB + categoryC);
      const turnover = Number(row['Umsatz'] || row['Turnover'] || row['Revenue'] || 0) || 0;

      entries.push({
        date,
        year,
        month,
        categoryA,
        categoryB,
        categoryC,
        totalProjects,
        turnover,
      });
    } catch (err) {
      console.warn('[Timeseries] Error parsing row:', err);
    }
  }

  console.log('[Timeseries] Parsed entries:', entries.length);

  if (entries.length === 0) {
    return 0;
  }

  // Store in IndexedDB
  const db = await openTimeseriesDB();

  // Clear existing data
  const clearTx = db.transaction(STORE_NAME, 'readwrite');
  const clearStore = clearTx.objectStore(STORE_NAME);
  await new Promise<void>((resolve, reject) => {
    const request = clearStore.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Add new data
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const entry of entries) {
    store.add(entry);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();

  return entries.length;
}

/**
 * Load time series data from IndexedDB
 */
export async function loadTimeSeries(): Promise<{ entries: ControllingEntry[]; years: number[] }> {
  try {
    const db = await openTimeseriesDB();

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = (request.result as ControllingEntry[]).map(entry => ({
          ...entry,
          date: new Date(entry.date),
        }));

        // Sort by date
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Extract unique years
        const yearsSet = new Set(entries.map(e => e.year));
        const years = Array.from(yearsSet).sort((a, b) => a - b);

        db.close();
        resolve({ entries, years });
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('[Timeseries] Error loading data:', err);
    return { entries: [], years: [] };
  }
}

/**
 * Clear time series data
 */
export async function clearTimeSeries(): Promise<void> {
  try {
    const db = await openTimeseriesDB();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (err) {
    console.error('[Timeseries] Error clearing data:', err);
  }
}
