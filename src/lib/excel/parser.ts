/**
 * Excel Parser using SheetJS (xlsx)
 * Handles reading and parsing Excel files
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn {
  name: string;
  index: number;
  type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
}

export interface ExcelParseResult {
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  sheetName: string;
}

export interface ParseOptions {
  sheetIndex?: number;
  sheetName?: string;
  maxRows?: number;
  skipEmptyRows?: boolean;
}

/**
 * Parse Excel file from ArrayBuffer
 */
export async function parseExcelFile(
  arrayBuffer: ArrayBuffer,
  options: ParseOptions = {}
): Promise<ExcelParseResult> {
  const {
    sheetIndex = 0,
    sheetName,
    maxRows,
    skipEmptyRows = true,
  } = options;

  // Read workbook
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  // Get sheet
  let sheet: XLSX.WorkSheet;
  let actualSheetName: string;

  if (sheetName) {
    sheet = workbook.Sheets[sheetName];
    actualSheetName = sheetName;
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
  } else {
    actualSheetName = workbook.SheetNames[sheetIndex] ?? '';
    sheet = workbook.Sheets[actualSheetName];
    if (!sheet) {
      throw new Error(`Sheet at index ${sheetIndex} not found`);
    }
  }

  // Convert to JSON
  // Use raw: true to preserve Date objects and numbers from Excel
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });

  // Filter empty rows if needed
  let rows = skipEmptyRows
    ? jsonData.filter((row) => Object.values(row).some((val) => val !== null && val !== ''))
    : jsonData;

  // Limit rows if specified
  if (maxRows && maxRows > 0) {
    rows = rows.slice(0, maxRows);
  }

  // Extract columns from first row
  const columns: ExcelColumn[] = [];
  if (rows.length > 0) {
    Object.keys(rows[0] ?? {}).forEach((columnName, index) => {
      columns.push({
        name: columnName,
        index,
        type: detectColumnType(rows, columnName),
      });
    });
  }

  return {
    columns,
    rows,
    totalRows: rows.length,
    sheetName: actualSheetName,
  };
}

/**
 * Detect the type of a column based on its values
 */
function detectColumnType(
  rows: Record<string, unknown>[],
  columnName: string
): 'string' | 'number' | 'date' | 'boolean' | 'unknown' {
  const sampleSize = Math.min(100, rows.length);
  const samples = rows.slice(0, sampleSize).map((row) => row[columnName]);

  let numberCount = 0;
  let stringCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const value of samples) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (typeof value === 'boolean') {
      booleanCount++;
    } else if (typeof value === 'number') {
      numberCount++;
    } else if (value instanceof Date) {
      dateCount++;
    } else if (typeof value === 'string') {
      // Check if it looks like a date
      if (isDateString(value)) {
        dateCount++;
      } else {
        stringCount++;
      }
    }
  }

  const total = numberCount + stringCount + dateCount + booleanCount;
  if (total === 0) return 'unknown';

  // Determine dominant type
  if (dateCount / total > 0.7) return 'date';
  if (numberCount / total > 0.7) return 'number';
  if (booleanCount / total > 0.7) return 'boolean';
  if (stringCount / total > 0.5) return 'string';

  return 'unknown';
}

/**
 * Check if a string looks like a date
 */
function isDateString(str: string): boolean {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
    /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY or MM/DD/YYYY
  ];

  return datePatterns.some((pattern) => pattern.test(str));
}

/**
 * Get available sheet names from a file
 */
export async function getSheetNames(
  arrayBuffer: ArrayBuffer
): Promise<string[]> {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    bookSheets: true,
  });

  return workbook.SheetNames;
}

/**
 * Parse a specific column from Excel
 */
export function parseColumn<T = unknown>(
  rows: Record<string, unknown>[],
  columnName: string
): T[] {
  return rows.map((row) => row[columnName] as T);
}

/**
 * Check if a row is empty
 */
export function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every(
    (val) => val === null || val === undefined || val === ''
  );
}
