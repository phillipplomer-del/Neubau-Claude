import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-3.xlsx';

console.log('Reading Excel file:', filePath);

const buffer = readFileSync(filePath);
const workbook = XLSX.read(buffer, {
  type: 'buffer',
  cellDates: true,
  cellNF: false,
  cellText: false,
});

console.log('\n=== WORKBOOK INFO ===');
console.log('Sheet Names:', workbook.SheetNames);
console.log('Number of sheets:', workbook.SheetNames.length);

// Analyze each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== SHEET ${index + 1}: "${sheetName}" ===`);

  const sheet = workbook.Sheets[sheetName];

  // Get sheet range
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log('Range:', sheet['!ref']);
  console.log('Rows:', range.e.r - range.s.r + 1);
  console.log('Columns:', range.e.c - range.s.c + 1);

  // Try different parsing methods
  console.log('\n--- Method 1: sheet_to_json (default) ---');
  const jsonData1 = XLSX.utils.sheet_to_json(sheet);
  console.log('Rows parsed:', jsonData1.length);
  if (jsonData1.length > 0) {
    console.log('First row keys:', Object.keys(jsonData1[0]));
    console.log('First row:', jsonData1[0]);
  }

  console.log('\n--- Method 2: sheet_to_json (raw: false, defval: null) ---');
  const jsonData2 = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null,
  });
  console.log('Rows parsed:', jsonData2.length);

  console.log('\n--- Method 3: sheet_to_json (blankrows: true) ---');
  const jsonData3 = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null,
    blankrows: true,
  });
  console.log('Rows parsed:', jsonData3.length);

  console.log('\n--- Method 4: sheet_to_json (header: 1) - Raw array ---');
  const jsonData4 = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: null,
    blankrows: true,
  });
  console.log('Rows parsed:', jsonData4.length);
  if (jsonData4.length > 0) {
    console.log('First row (headers):', jsonData4[0]);
    console.log('Second row (data):', jsonData4[1]);
  }
});
