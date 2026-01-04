import * as XLSX from 'xlsx';
import { readFileSync, readdirSync } from 'fs';

// Find Controlling file
const files = readdirSync('.');
const controllingFile = files.find(f => f.toLowerCase().includes('controlling') && f.endsWith('.xlsx'));

if (!controllingFile) {
  console.log('No Controlling.xlsx file found');
  process.exit(1);
}

console.log('Reading:', controllingFile);

const buffer = readFileSync(controllingFile);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('\nSheet names:', workbook.SheetNames);

if (workbook.SheetNames.length >= 2) {
  const sheet2Name = workbook.SheetNames[1];
  console.log('\n--- Sheet 2:', sheet2Name, '---');

  const sheet = workbook.Sheets[sheet2Name];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: true });

  console.log('\nColumn names:');
  if (data.length > 0) {
    console.log(Object.keys(data[0]));
  }

  console.log('\nFirst 3 rows:');
  data.slice(0, 3).forEach((row, i) => {
    console.log(`\nRow ${i}:`, row);
  });

  console.log('\nTotal rows:', data.length);
} else {
  console.log('No second sheet found');
}
