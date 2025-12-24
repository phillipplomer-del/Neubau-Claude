import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const arrayBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));

  const workbook = XLSX.read(arrayBuffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetName = 'Orderbacklog';
  const sheet = workbook.Sheets[sheetName];

  // Test with raw: false (what the app uses)
  const jsonDataRawFalse = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null,
  });

  // Test with raw: true
  const jsonDataRawTrue = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
  });

  console.log('=== Testing Date Parsing ===\n');

  // Find rows with actual date values
  const rowsWithWunsch = jsonDataRawFalse
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row['Wunsch_Liefertermin'] && row['Wunsch_Liefertermin'] !== '')
    .slice(0, 5);

  const rowsWithErster = jsonDataRawFalse
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => {
      const val = row['erster_Bestaetigter_Liefertermin'];
      return val && val !== '' && val !== '01.01.1900';
    })
    .slice(0, 5);

  console.log('--- Wunsch_Liefertermin (raw: false) ---');
  rowsWithWunsch.forEach(({ row, idx }) => {
    const val = row['Wunsch_Liefertermin'];
    console.log(`Row ${idx + 1}:`);
    console.log(`  Value: "${val}"`);
    console.log(`  Type: ${typeof val}`);
    console.log(`  Is Date: ${val instanceof Date}`);
  });

  console.log('\n--- Wunsch_Liefertermin (raw: true) ---');
  rowsWithWunsch.forEach(({ idx }) => {
    const val = jsonDataRawTrue[idx]['Wunsch_Liefertermin'];
    console.log(`Row ${idx + 1}:`);
    console.log(`  Value: "${val}"`);
    console.log(`  Type: ${typeof val}`);
    console.log(`  Is Date: ${val instanceof Date}`);
  });

  console.log('\n--- erster_Bestaetigter_Liefertermin (raw: false) ---');
  rowsWithErster.forEach(({ row, idx }) => {
    const val = row['erster_Bestaetigter_Liefertermin'];
    console.log(`Row ${idx + 1}:`);
    console.log(`  Value: "${val}"`);
    console.log(`  Type: ${typeof val}`);
    console.log(`  Is Date: ${val instanceof Date}`);
  });

  console.log('\n--- erster_Bestaetigter_Liefertermin (raw: true) ---');
  rowsWithErster.forEach(({ idx }) => {
    const val = jsonDataRawTrue[idx]['erster_Bestaetigter_Liefertermin'];
    console.log(`Row ${idx + 1}:`);
    console.log(`  Value: "${val}"`);
    console.log(`  Type: ${typeof val}`);
    console.log(`  Is Date: ${val instanceof Date}`);
  });

  // Check format function
  console.log('\n=== Testing Date Formatting ===\n');

  const testDates = [
    '10.10.2024',
    '15.08.2025',
    '01.01.1900',
    '',
    null,
    undefined,
    new Date('2024-10-10'),
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('de-DE');
  };

  testDates.forEach(date => {
    const formatted = formatDate(date);
    console.log(`Input: ${JSON.stringify(date).padEnd(30)} => Output: "${formatted}"`);
  });

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
