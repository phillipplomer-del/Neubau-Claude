/**
 * Excel File Analyzer Utility
 * Analyzes Excel files to extract column structure and sample data
 * This helps map real Excel columns to TypeScript interfaces
 */

import * as XLSX from 'xlsx';

export interface ColumnInfo {
  name: string;
  index: number;
  type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  sampleValues: unknown[];
  uniqueCount: number;
  nullCount: number;
}

export interface ExcelAnalysisResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
  recommendations: {
    artikelnummer: string[];
    projektnummer: string[];
    dates: string[];
    quantities: string[];
    status: string[];
    other: string[];
  };
  businessRules?: {
    filterColumn?: string;
    filterCondition?: string;
    estimatedRowsToSkip?: number;
  };
}

/**
 * Keywords for identifying specific column types
 */
const COLUMN_KEYWORDS = {
  artikelnummer: ['art', 'item', 'artikel', 'material', 'nummer', 'itemnr', 'itemno', 'artnr'],
  projektnummer: ['proj', 'project', 'auftrag', 'order', 'projektnr', 'projnr'],
  date: ['date', 'datum', 'termin', 'deadline', 'start', 'end', 'ende'],
  quantity: ['qty', 'quantity', 'menge', 'anzahl', 'rem', 'remaining'],
  status: ['status', 'state', 'zustand'],
  customer: ['customer', 'kunde', 'client'],
  description: ['description', 'beschreibung', 'name', 'bezeichnung'],
  price: ['price', 'preis', 'cost', 'kosten'],
};

/**
 * Analyze an Excel file from File object
 */
export async function analyzeExcelFile(
  file: File,
  options: {
    maxSampleRows?: number;
    maxSampleValues?: number;
  } = {}
): Promise<ExcelAnalysisResult> {
  const { maxSampleRows = 5, maxSampleValues = 3 } = options;

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Read workbook
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: null,
  });

  // Remove completely empty rows
  const rows = jsonData.filter((row) =>
    Object.values(row).some((val) => val !== null && val !== '')
  );

  const totalRows = rows.length;
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const totalColumns = columnNames.length;

  // Analyze each column
  const columns: ColumnInfo[] = columnNames.map((columnName, index) => {
    const columnValues = rows.map((row) => row[columnName]);

    // Get sample values (non-null)
    const nonNullValues = columnValues.filter(
      (v) => v !== null && v !== undefined && v !== ''
    );
    const sampleValues = nonNullValues.slice(0, maxSampleValues);

    // Count unique and null values
    const uniqueCount = new Set(nonNullValues).size;
    const nullCount = columnValues.length - nonNullValues.length;

    return {
      name: columnName,
      index,
      type: detectColumnType(columnValues),
      sampleValues,
      uniqueCount,
      nullCount,
    };
  });

  // Get sample rows
  const sampleRows = rows.slice(0, maxSampleRows);

  // Generate recommendations
  const recommendations = generateRecommendations(columns);

  // Check for business rules (e.g., QuantityRem1 filtering)
  const businessRules = detectBusinessRules(columns, rows);

  return {
    fileName: file.name,
    sheetName,
    totalRows,
    totalColumns,
    columns,
    sampleRows,
    recommendations,
    businessRules,
  };
}

/**
 * Analyze Excel file from path (Node.js environment)
 */
export function analyzeExcelFileFromPath(
  filePath: string,
  options: {
    maxSampleRows?: number;
    maxSampleValues?: number;
  } = {}
): ExcelAnalysisResult {
  const { maxSampleRows = 5, maxSampleValues = 3 } = options;

  // Read workbook
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
  });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: null,
  });

  // Remove completely empty rows
  const rows = jsonData.filter((row) =>
    Object.values(row).some((val) => val !== null && val !== '')
  );

  const totalRows = rows.length;
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const totalColumns = columnNames.length;

  // Analyze each column
  const columns: ColumnInfo[] = columnNames.map((columnName, index) => {
    const columnValues = rows.map((row) => row[columnName]);

    // Get sample values (non-null)
    const nonNullValues = columnValues.filter(
      (v) => v !== null && v !== undefined && v !== ''
    );
    const sampleValues = nonNullValues.slice(0, maxSampleValues);

    // Count unique and null values
    const uniqueCount = new Set(nonNullValues).size;
    const nullCount = columnValues.length - nonNullValues.length;

    return {
      name: columnName,
      index,
      type: detectColumnType(columnValues),
      sampleValues,
      uniqueCount,
      nullCount,
    };
  });

  // Get sample rows
  const sampleRows = rows.slice(0, maxSampleRows);

  // Generate recommendations
  const recommendations = generateRecommendations(columns);

  // Check for business rules
  const businessRules = detectBusinessRules(columns, rows);

  const fileName = filePath.split('/').pop() || filePath;

  return {
    fileName,
    sheetName,
    totalRows,
    totalColumns,
    columns,
    sampleRows,
    recommendations,
    businessRules,
  };
}

/**
 * Detect column type based on values
 */
function detectColumnType(
  values: unknown[]
): 'string' | 'number' | 'date' | 'boolean' | 'unknown' {
  const sampleSize = Math.min(100, values.length);
  const samples = values.slice(0, sampleSize);

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
 * Check if string looks like a date
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
 * Generate recommendations for column mappings
 */
function generateRecommendations(columns: ColumnInfo[]) {
  const recommendations = {
    artikelnummer: [] as string[],
    projektnummer: [] as string[],
    dates: [] as string[],
    quantities: [] as string[],
    status: [] as string[],
    other: [] as string[],
  };

  for (const column of columns) {
    const lowerName = column.name.toLowerCase();

    // Check for Artikelnummer
    if (COLUMN_KEYWORDS.artikelnummer.some((kw) => lowerName.includes(kw))) {
      recommendations.artikelnummer.push(column.name);
      continue;
    }

    // Check for Projektnummer
    if (COLUMN_KEYWORDS.projektnummer.some((kw) => lowerName.includes(kw))) {
      recommendations.projektnummer.push(column.name);
      continue;
    }

    // Check for dates
    if (COLUMN_KEYWORDS.date.some((kw) => lowerName.includes(kw)) || column.type === 'date') {
      recommendations.dates.push(column.name);
      continue;
    }

    // Check for quantities
    if (COLUMN_KEYWORDS.quantity.some((kw) => lowerName.includes(kw))) {
      recommendations.quantities.push(column.name);
      continue;
    }

    // Check for status
    if (COLUMN_KEYWORDS.status.some((kw) => lowerName.includes(kw))) {
      recommendations.status.push(column.name);
      continue;
    }

    // Other important columns
    if (
      COLUMN_KEYWORDS.customer.some((kw) => lowerName.includes(kw)) ||
      COLUMN_KEYWORDS.description.some((kw) => lowerName.includes(kw)) ||
      COLUMN_KEYWORDS.price.some((kw) => lowerName.includes(kw))
    ) {
      recommendations.other.push(column.name);
    }
  }

  return recommendations;
}

/**
 * Detect business rules based on column analysis
 */
function detectBusinessRules(
  columns: ColumnInfo[],
  rows: Record<string, unknown>[]
): {
  filterColumn?: string;
  filterCondition?: string;
  estimatedRowsToSkip?: number;
} | undefined {
  // Check for QuantityRem1 (Sales file business rule)
  const qtyRemCol = columns.find((col) => col.name === 'QuantityRem1');

  if (qtyRemCol) {
    const zeroCount = rows.filter((row) => row['QuantityRem1'] === 0).length;

    return {
      filterColumn: 'QuantityRem1',
      filterCondition: 'Skip rows where QuantityRem1 == 0 (already delivered)',
      estimatedRowsToSkip: zeroCount,
    };
  }

  return undefined;
}

/**
 * Format analysis result as readable text
 */
export function formatAnalysisResult(result: ExcelAnalysisResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(100));
  lines.push(`FILE: ${result.fileName}`);
  lines.push(`Sheet: ${result.sheetName}`);
  lines.push('='.repeat(100));
  lines.push('');

  lines.push('BASIC INFORMATION:');
  lines.push(`  Total rows: ${result.totalRows}`);
  lines.push(`  Total columns: ${result.totalColumns}`);
  lines.push('');

  lines.push(`ALL COLUMN NAMES (${result.columns.length} columns):`);
  result.columns.forEach((col, idx) => {
    lines.push(`  ${String(idx + 1).padStart(2, ' ')}. ${col.name} (${col.type})`);
    if (col.sampleValues.length > 0) {
      const samples = col.sampleValues.map((v) => String(v).substring(0, 30)).join(', ');
      lines.push(`      Samples: ${samples}`);
    }
  });
  lines.push('');

  lines.push('COLUMN RECOMMENDATIONS:');
  lines.push('-'.repeat(100));

  if (result.recommendations.artikelnummer.length > 0) {
    lines.push(`  ARTIKELNUMMER (Article Number): ${result.recommendations.artikelnummer.join(', ')}`);
  } else {
    lines.push('  ARTIKELNUMMER (Article Number): NOT FOUND - manual mapping needed');
  }

  if (result.recommendations.projektnummer.length > 0) {
    lines.push(`  PROJEKTNUMMER (Project Number): ${result.recommendations.projektnummer.join(', ')}`);
  } else {
    lines.push('  PROJEKTNUMMER (Project Number): NOT FOUND - manual mapping needed');
  }

  if (result.recommendations.dates.length > 0) {
    lines.push(`  DATE columns: ${result.recommendations.dates.join(', ')}`);
  }

  if (result.recommendations.quantities.length > 0) {
    lines.push(`  QUANTITY columns: ${result.recommendations.quantities.join(', ')}`);
  }

  if (result.recommendations.status.length > 0) {
    lines.push(`  STATUS columns: ${result.recommendations.status.join(', ')}`);
  }

  if (result.recommendations.other.length > 0) {
    lines.push(`  OTHER important columns: ${result.recommendations.other.join(', ')}`);
  }

  lines.push('');

  if (result.businessRules) {
    lines.push('BUSINESS RULES:');
    lines.push('*'.repeat(100));
    lines.push(`  Filter Column: ${result.businessRules.filterColumn}`);
    lines.push(`  Condition: ${result.businessRules.filterCondition}`);
    lines.push(`  Estimated rows to skip: ${result.businessRules.estimatedRowsToSkip} of ${result.totalRows} (${((result.businessRules.estimatedRowsToSkip || 0) / result.totalRows * 100).toFixed(1)}%)`);
    lines.push('*'.repeat(100));
    lines.push('');
  }

  lines.push('SAMPLE DATA (first few rows):');
  lines.push('-'.repeat(100));
  result.sampleRows.forEach((row, idx) => {
    lines.push(`\nRow ${idx + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        const valueStr = String(value).substring(0, 60);
        lines.push(`  ${key}: ${valueStr}`);
      }
    });
  });

  lines.push('');
  lines.push('='.repeat(100));

  return lines.join('\n');
}
