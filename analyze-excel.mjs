#!/usr/bin/env node
/**
 * Excel File Analyzer for ERP Data
 * Analyzes three Excel files and extracts column structure and sample data
 */

import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const FILES = {
  'Sales (Offene Lieferungen)': '2025-09-30_Offene_Lieferungen_Stand.xlsx',
  'Production Planning': '2025-12-10_PP_SollIstVergleich.xlsm',
  'Project Management (Controlling)': 'Controlling.xlsx'
};

/**
 * Analyze an Excel file
 */
function analyzeExcelFile(filepath, name) {
  console.log('\n' + '='.repeat(100));
  console.log(`FILE: ${name}`);
  console.log(`Path: ${filepath}`);
  console.log('='.repeat(100));

  try {
    // Check if file exists
    const fullPath = join(__dirname, filepath);
    if (!fs.existsSync(fullPath)) {
      console.log('\nERROR: File does not exist!');
      return;
    }

    // Read the Excel file
    const workbook = XLSX.readFile(fullPath);

    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log(`\nBASIC INFORMATION:`);
    console.log(`  Sheet name: ${sheetName}`);
    console.log(`  Total sheets in workbook: ${workbook.SheetNames.length}`);
    if (workbook.SheetNames.length > 1) {
      console.log(`  Other sheets: ${workbook.SheetNames.slice(1).join(', ')}`);
    }

    // Convert sheet to JSON (with header row as keys)
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`  Total data rows: ${data.length}`);

    // Get column names from the first row
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    console.log(`  Total columns: ${columns.length}`);

    // Display all column names
    console.log(`\nALL COLUMN NAMES (${columns.length} columns):`);
    columns.forEach((col, idx) => {
      console.log(`  ${String(idx + 1).padStart(2, ' ')}. ${col}`);
    });

    // Display sample data - first 5 rows
    console.log(`\nSAMPLE DATA (First ${Math.min(5, data.length)} rows):`);
    console.log('-'.repeat(100));

    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`\nRow ${i + 1}:`);
      const row = data[i];

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
    const articleKeywords = ['art', 'item', 'artikel', 'material', 'nummer'];
    const articleCandidates = columns.filter(col =>
      articleKeywords.some(kw => col.toLowerCase().includes(kw))
    );

    if (articleCandidates.length > 0) {
      console.log(`\nPotential ARTICLE NUMBER columns:`);
      articleCandidates.forEach(col => {
        const sampleValues = data.slice(0, 3).map(row => row[col]).filter(v => v);
        const uniqueCount = new Set(data.map(row => row[col]).filter(v => v)).size;
        console.log(`  - ${col}`);
        console.log(`    Sample values: ${sampleValues.join(', ')}`);
        console.log(`    Unique values: ${uniqueCount}`);
      });
    }

    // Project Number columns
    const projectKeywords = ['proj', 'project', 'auftrag', 'order'];
    const projectCandidates = columns.filter(col =>
      projectKeywords.some(kw => col.toLowerCase().includes(kw))
    );

    if (projectCandidates.length > 0) {
      console.log(`\nPotential PROJECT NUMBER columns:`);
      projectCandidates.forEach(col => {
        const sampleValues = data.slice(0, 3).map(row => row[col]).filter(v => v);
        const uniqueCount = new Set(data.map(row => row[col]).filter(v => v)).size;
        console.log(`  - ${col}`);
        console.log(`    Sample values: ${sampleValues.join(', ')}`);
        console.log(`    Unique values: ${uniqueCount}`);
      });
    }

    // Quantity columns
    const qtyKeywords = ['qty', 'quantity', 'menge', 'anzahl', 'rem'];
    const qtyCandidates = columns.filter(col =>
      qtyKeywords.some(kw => col.toLowerCase().includes(kw))
    );

    if (qtyCandidates.length > 0) {
      console.log(`\nPotential QUANTITY columns:`);
      qtyCandidates.forEach(col => {
        const values = data.map(row => row[col]).filter(v => typeof v === 'number');
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
    const dateKeywords = ['date', 'datum', 'termin', 'deadline'];
    const dateCandidates = columns.filter(col =>
      dateKeywords.some(kw => col.toLowerCase().includes(kw))
    );

    if (dateCandidates.length > 0) {
      console.log(`\nPotential DATE columns:`);
      dateCandidates.forEach(col => {
        const sampleValue = data.find(row => row[col])?.[col];
        console.log(`  - ${col}`);
        console.log(`    Sample value: ${sampleValue}`);
      });
    }

    // Status columns
    const statusKeywords = ['status', 'state', 'zustand'];
    const statusCandidates = columns.filter(col =>
      statusKeywords.some(kw => col.toLowerCase().includes(kw))
    );

    if (statusCandidates.length > 0) {
      console.log(`\nPotential STATUS columns:`);
      statusCandidates.forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]).filter(v => v))].slice(0, 5);
        console.log(`  - ${col}`);
        console.log(`    Unique values (first 5): ${uniqueValues.join(', ')}`);
      });
    }

    // Special handling for Sales file - QuantityRem1
    if (columns.includes('QuantityRem1')) {
      console.log('\n' + '*'.repeat(100));
      console.log('IMPORTANT: QuantityRem1 column found (BUSINESS RULE)');
      console.log('*'.repeat(100));

      const zeroCount = data.filter(row => row['QuantityRem1'] === 0).length;
      const nonZeroCount = data.filter(row => row['QuantityRem1'] > 0).length;
      const total = data.length;

      console.log(`  Total rows: ${total}`);
      console.log(`  Rows where QuantityRem1 = 0 (already delivered, SKIP): ${zeroCount} (${(zeroCount/total*100).toFixed(1)}%)`);
      console.log(`  Rows where QuantityRem1 > 0 (pending delivery, INCLUDE): ${nonZeroCount} (${(nonZeroCount/total*100).toFixed(1)}%)`);
      console.log(`\n  ACTION: Filter out rows where QuantityRem1 == 0 before processing`);
    }

    // Recommendations
    console.log(`\n\nRECOMMENDATIONS:`);
    console.log('-'.repeat(100));

    if (articleCandidates.length > 0) {
      console.log(`  ARTIKELNUMMER (Article Number): Use column '${articleCandidates[0]}'`);
    } else {
      console.log(`  ARTIKELNUMMER (Article Number): Not clearly identified - manual review needed`);
    }

    if (projectCandidates.length > 0) {
      console.log(`  PROJEKTNUMMER (Project Number): Use column '${projectCandidates[0]}'`);
    } else {
      console.log(`  PROJEKTNUMMER (Project Number): Not clearly identified - manual review needed`);
    }

    // Additional important columns
    console.log(`\n  Other important columns to consider:`);
    const importantColumns = columns.filter(col => {
      const lower = col.toLowerCase();
      return !articleKeywords.some(kw => lower.includes(kw)) &&
             !projectKeywords.some(kw => lower.includes(kw)) &&
             (lower.includes('name') || lower.includes('beschreibung') ||
              lower.includes('description') || lower.includes('customer') ||
              lower.includes('kunde'));
    });

    if (importantColumns.length > 0) {
      importantColumns.forEach(col => {
        const sampleValue = data.find(row => row[col])?.[col];
        console.log(`    - ${col}: ${sampleValue ? String(sampleValue).substring(0, 40) : 'N/A'}`);
      });
    }

  } catch (error) {
    console.log(`\nERROR analyzing file: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * Main function
 */
function main() {
  console.log('='.repeat(100));
  console.log('EXCEL FILE ANALYZER - ERP Data Analysis');
  console.log('='.repeat(100));

  // Check files exist
  console.log('\nChecking files...');
  Object.entries(FILES).forEach(([name, filepath]) => {
    const fullPath = join(__dirname, filepath);
    const exists = fs.existsSync(fullPath) ? 'EXISTS' : 'NOT FOUND';
    console.log(`  ${name}: ${exists}`);
  });

  console.log('\n');

  // Analyze each file
  Object.entries(FILES).forEach(([name, filepath]) => {
    const fullPath = join(__dirname, filepath);
    if (!fs.existsSync(fullPath)) {
      console.log(`\nSKIPPING ${name}: File not found`);
      return;
    }

    analyzeExcelFile(filepath, name);
  });

  console.log('\n' + '='.repeat(100));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(100));
}

// Run the analysis
main();
