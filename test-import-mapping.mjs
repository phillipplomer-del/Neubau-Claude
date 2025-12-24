import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  // Simulate exactly what parseExcelFile does
  const arrayBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));

  const workbook = XLSX.read(arrayBuffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetName = 'Orderbacklog';
  const sheet = workbook.Sheets[sheetName];

  // This is what the parser does
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null,
  });

  console.log(`Total rows: ${jsonData.length}\n`);

  // Check specific fields we care about
  const firstRow = jsonData[0];
  const columns = Object.keys(firstRow);

  console.log(`Total columns: ${columns.length}\n`);

  console.log('Checking critical columns:\n');

  const criticalColumns = [
    'PNR',
    'Wunsch_Liefertermin',
    'erster_Bestaetigter_Liefertermin',
    'Projekt_Verantwortlich',
    'Country',
    'ProductGroup'
  ];

  criticalColumns.forEach(col => {
    const exists = columns.includes(col);
    console.log(`${col.padEnd(35)}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);

    if (exists) {
      // Show first 5 non-empty values
      console.log('  First 5 values:');
      let count = 0;
      for (let i = 0; i < jsonData.length && count < 5; i++) {
        const val = jsonData[i][col];
        if (val !== null && val !== '' && val !== undefined) {
          console.log(`    ${i + 1}. "${val}"`);
          count++;
        }
      }
      if (count === 0) {
        console.log('    (all values are empty)');
      }
    }
    console.log('');
  });

  // Test the mapping
  console.log('\n--- Testing Mapper Logic ---\n');

  const mappings = [
    { excelColumn: 'PNR', internalField: 'projektnummer' },
    { excelColumn: 'Wunsch_Liefertermin', internalField: 'requestedDeliveryDate' },
    { excelColumn: 'erster_Bestaetigter_Liefertermin', internalField: 'confirmedDeliveryDate' },
    { excelColumn: 'Projekt_Verantwortlich', internalField: 'projectManager' },
    { excelColumn: 'Country', internalField: 'country' },
    { excelColumn: 'ProductGroup', internalField: 'productGroup' },
  ];

  // Map first row
  const mapped = {};
  for (const mapping of mappings) {
    const excelValue = firstRow[mapping.excelColumn];
    mapped[mapping.internalField] = excelValue;
  }

  console.log('First row after mapping:');
  console.log(JSON.stringify(mapped, null, 2));

} catch (error) {
  console.error('Error:', error.message);
}
