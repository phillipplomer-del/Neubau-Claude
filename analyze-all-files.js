#!/usr/bin/env node
/**
 * Standalone script to analyze all three Excel files
 * Run with: node analyze-all-files.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// File paths
const FILES = {
  'Sales (Offene Lieferungen)': path.join(__dirname, '2025-09-30_Offene_Lieferungen_Stand.xlsx'),
  'Production Planning': path.join(__dirname, '2025-12-10_PP_SollIstVergleich.xlsm'),
  'Project Management (Controlling)': path.join(__dirname, 'Controlling.xlsx'),
};

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

function detectColumnType(values) {
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

  if (dateCount / total > 0.7) return 'date';
  if (numberCount / total > 0.7) return 'number';
  if (booleanCount / total > 0.7) return 'boolean';
  if (stringCount / total > 0.5) return 'string';

  return 'unknown';
}

function isDateString(str) {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
    /^\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
    /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY or MM/DD/YYYY
  ];

  return datePatterns.some((pattern) => pattern.test(str));
}

function analyzeExcelFile(filePath, name) {
  console.log('\n' + '='.repeat(100));
  console.log(`FILE: ${name}`);
  console.log(`Path: ${filePath}`);
  console.log('='.repeat(100));

  try {
    if (!fs.existsSync(filePath)) {
      console.log('\nERROR: File does not exist!');
      return;
    }

    // Read workbook
    const workbook = XLSX.readFile(filePath, { cellDates: true });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log(`\nBASIC INFORMATION:`);
    console.log(`  Sheet name: ${sheetName}`);
    console.log(`  Total sheets in workbook: ${workbook.SheetNames.length}`);
    if (workbook.SheetNames.length > 1) {
      console.log(`  Other sheets: ${workbook.SheetNames.slice(1).join(', ')}`);
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet);

    // Remove empty rows
    const rows = data.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && val !== '')
    );

    console.log(`  Total data rows: ${rows.length}`);

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    console.log(`  Total columns: ${columns.length}`);

    // Display all column names with type info
    console.log(`\nALL COLUMN NAMES (${columns.length} columns):`);
    const columnInfo = columns.map((col, idx) => {
      const values = rows.map((row) => row[col]);
      const type = detectColumnType(values);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
      const uniqueCount = new Set(nonNullValues).size;

      console.log(`  ${String(idx + 1).padStart(2, ' ')}. ${col} (${type})`);

      // Show sample values for first 3 columns
      if (nonNullValues.length > 0 && idx < 3) {
        const samples = nonNullValues.slice(0, 2).map((v) => String(v).substring(0, 40)).join(', ');
        console.log(`      Samples: ${samples}`);
        console.log(`      Unique values: ${uniqueCount}`);
      }

      return { name: col, type, uniqueCount };
    });

    // Display sample data - first 5 rows
    console.log(`\nSAMPLE DATA (First 5 rows):`);
    console.log('-'.repeat(100));

    for (let i = 0; i < Math.min(5, rows.length); i++) {
      console.log(`\nRow ${i + 1}:`);
      const row = rows[i];

      Object.entries(row).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          let valueStr = String(value);

          // Format numbers
          if (typeof value === 'number') {
            valueStr = value % 1 === 0 ? String(Math.floor(value)) : value.toFixed(2);
          }

          // Truncate long values
          if (valueStr.length > 60) {
            valueStr = valueStr.substring(0, 60) + '...';
          }

          console.log(`  ${key}: ${valueStr}`);
        }
      });
    }

    // Column Analysis
    console.log(`\n\nCOLUMN ANALYSIS:`);
    console.log('-'.repeat(100));

    // Article Number columns
    const articleCandidates = columns.filter((col) =>
      COLUMN_KEYWORDS.artikelnummer.some((kw) => col.toLowerCase().includes(kw))
    );

    if (articleCandidates.length > 0) {
      console.log(`\nPotential ARTICLE NUMBER columns:`);
      articleCandidates.forEach((col) => {
        const sampleValues = rows.slice(0, 3).map((row) => row[col]).filter((v) => v);
        const uniqueCount = new Set(rows.map((row) => row[col]).filter((v) => v)).size;
        console.log(`  - ${col}`);
        console.log(`    Sample values: ${sampleValues.join(', ')}`);
        console.log(`    Unique values: ${uniqueCount}`);
      });
    }

    // Project Number columns
    const projectCandidates = columns.filter((col) =>
      COLUMN_KEYWORDS.projektnummer.some((kw) => col.toLowerCase().includes(kw))
    );

    if (projectCandidates.length > 0) {
      console.log(`\nPotential PROJECT NUMBER columns:`);
      projectCandidates.forEach((col) => {
        const sampleValues = rows.slice(0, 3).map((row) => row[col]).filter((v) => v);
        const uniqueCount = new Set(rows.map((row) => row[col]).filter((v) => v)).size;
        console.log(`  - ${col}`);
        console.log(`    Sample values: ${sampleValues.join(', ')}`);
        console.log(`    Unique values: ${uniqueCount}`);
      });
    }

    // Quantity columns
    const qtyCandidates = columns.filter((col) =>
      COLUMN_KEYWORDS.quantity.some((kw) => col.toLowerCase().includes(kw))
    );

    if (qtyCandidates.length > 0) {
      console.log(`\nPotential QUANTITY columns:`);
      qtyCandidates.forEach((col) => {
        const values = rows.map((row) => row[col]).filter((v) => typeof v === 'number');
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          console.log(`  - ${col}`);
          console.log(`    Min: ${min}, Max: ${max}, Average: ${avg.toFixed(2)}`);
        }
      });
    }

    // Date columns
    const dateCandidates = columns.filter((col) =>
      COLUMN_KEYWORDS.date.some((kw) => col.toLowerCase().includes(kw))
    );

    if (dateCandidates.length > 0) {
      console.log(`\nPotential DATE columns:`);
      dateCandidates.forEach((col) => {
        const sampleValue = rows.find((row) => row[col])?.[col];
        console.log(`  - ${col}`);
        console.log(`    Sample value: ${sampleValue}`);
      });
    }

    // Status columns
    const statusCandidates = columns.filter((col) =>
      COLUMN_KEYWORDS.status.some((kw) => col.toLowerCase().includes(kw))
    );

    if (statusCandidates.length > 0) {
      console.log(`\nPotential STATUS columns:`);
      statusCandidates.forEach((col) => {
        const uniqueValues = [...new Set(rows.map((row) => row[col]).filter((v) => v))].slice(0, 5);
        console.log(`  - ${col}`);
        console.log(`    Unique values (first 5): ${uniqueValues.join(', ')}`);
      });
    }

    // Special handling for Sales file - QuantityRem1
    if (columns.includes('QuantityRem1')) {
      console.log('\n' + '*'.repeat(100));
      console.log('IMPORTANT: QuantityRem1 column found (BUSINESS RULE)');
      console.log('*'.repeat(100));

      const zeroCount = rows.filter((row) => row['QuantityRem1'] === 0 || row['QuantityRem1'] === '0').length;
      const nonZeroCount = rows.filter((row) => row['QuantityRem1'] > 0).length;
      const total = rows.length;

      console.log(`  Total rows: ${total}`);
      console.log(`  Rows where QuantityRem1 = 0 (already delivered, SKIP): ${zeroCount} (${((zeroCount / total) * 100).toFixed(1)}%)`);
      console.log(`  Rows where QuantityRem1 > 0 (pending delivery, INCLUDE): ${nonZeroCount} (${((nonZeroCount / total) * 100).toFixed(1)}%)`);
      console.log(`\n  ACTION: Filter out rows where QuantityRem1 == 0 before processing`);
    }

    // Recommendations
    console.log(`\n\nRECOMMENDATIONS:`);
    console.log('-'.repeat(100));

    if (articleCandidates.length > 0) {
      console.log(`  ARTIKELNUMMER (Article Number): Use column '${articleCandidates[0]}'`);
    } else {
      console.log(`  ARTIKELNUMMER (Article Number): NOT FOUND - manual mapping needed`);
      console.log(`    Available columns: ${columns.slice(0, 10).join(', ')}...`);
    }

    if (projectCandidates.length > 0) {
      console.log(`  PROJEKTNUMMER (Project Number): Use column '${projectCandidates[0]}'`);
    } else {
      console.log(`  PROJEKTNUMMER (Project Number): NOT FOUND - manual mapping needed`);
      console.log(`    Available columns: ${columns.slice(0, 10).join(', ')}...`);
    }

    // Additional important columns
    console.log(`\n  Other important columns to consider:`);
    const importantColumns = columns.filter((col) => {
      const lower = col.toLowerCase();
      return (
        !COLUMN_KEYWORDS.artikelnummer.some((kw) => lower.includes(kw)) &&
        !COLUMN_KEYWORDS.projektnummer.some((kw) => lower.includes(kw)) &&
        (COLUMN_KEYWORDS.customer.some((kw) => lower.includes(kw)) ||
          COLUMN_KEYWORDS.description.some((kw) => lower.includes(kw)) ||
          COLUMN_KEYWORDS.price.some((kw) => lower.includes(kw)) ||
          lower.includes('name'))
      );
    });

    if (importantColumns.length > 0) {
      importantColumns.slice(0, 5).forEach((col) => {
        const sampleValue = rows.find((row) => row[col])?.[col];
        console.log(`    - ${col}: ${sampleValue ? String(sampleValue).substring(0, 40) : 'N/A'}`);
      });
    }
  } catch (error) {
    console.log(`\nERROR analyzing file: ${error.message}`);
    console.error(error.stack);
  }
}

function main() {
  console.log('='.repeat(100));
  console.log('EXCEL FILE ANALYZER - ERP Data Analysis');
  console.log('='.repeat(100));

  // Check files exist
  console.log('\nChecking files...');
  Object.entries(FILES).forEach(([name, filepath]) => {
    const exists = fs.existsSync(filepath) ? 'EXISTS' : 'NOT FOUND';
    console.log(`  ${name}: ${exists}`);
  });

  console.log('\n');

  // Analyze each file
  Object.entries(FILES).forEach(([name, filepath]) => {
    if (!fs.existsSync(filepath)) {
      console.log(`\nSKIPPING ${name}: File not found`);
      return;
    }

    analyzeExcelFile(filepath, name);
  });

  console.log('\n' + '='.repeat(100));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(100));
  console.log('\nNext steps:');
  console.log('1. Review the column mappings above');
  console.log('2. Update the TypeScript interfaces if needed');
  console.log('3. Create column mapping configuration for the import process');
  console.log('4. Implement business rules (e.g., filtering QuantityRem1 = 0)');
}

main();
