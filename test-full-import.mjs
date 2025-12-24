import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

// Copy the parseExcelDate function
function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (value.getFullYear() === 1900 && value.getMonth() === 0 && value.getDate() === 1) {
      return null;
    }
    return value;
  }

  const str = String(value).trim();
  if (!str) return null;

  let date = null;

  // Try DD.MM.YYYY format (German)
  const germanMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Try MM/DD/YYYY or M/D/YYYY format (American)
  const americanMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (americanMatch && !date) {
    const [, first, second, yearStr] = americanMatch;

    let year = Number(yearStr);
    if (year < 100) {
      year += 2000;
    }

    const month = Number(first);
    const day = Number(second);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = new Date(year, month - 1, day);
    }
  }

  if (!date || isNaN(date.getTime())) return null;

  if (date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1) {
    return null;
  }

  return date;
}

// Simulate the mapper
const mappings = [
  { excelColumn: 'PNR', internalField: 'projektnummer' },
  { excelColumn: 'Wunsch_Liefertermin', internalField: 'requestedDeliveryDate', transform: parseExcelDate },
  { excelColumn: 'erster_Bestaetigter_Liefertermin', internalField: 'confirmedDeliveryDate', transform: parseExcelDate },
  { excelColumn: 'Country', internalField: 'country' },
  { excelColumn: 'ProductGroup', internalField: 'productGroup' },
];

function mapRowData(row, mappings) {
  const mapped = {};

  for (const mapping of mappings) {
    const excelValue = row[mapping.excelColumn];

    // Apply transformation if provided
    const value = mapping.transform
      ? mapping.transform(excelValue)
      : excelValue;

    mapped[mapping.internalField] = value;
  }

  return mapped;
}

try {
  const arrayBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));

  // Simulate parseExcelFile
  const workbook = XLSX.read(arrayBuffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheet = workbook.Sheets['Orderbacklog'];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: null,
  });

  console.log(`Total rows: ${jsonData.length}\n`);

  // Map first 10 rows
  console.log('Mapping first 10 rows:\n');
  console.log('='.repeat(80));

  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    const mapped = mapRowData(row, mappings);

    console.log(`\nRow ${i + 1}:`);
    console.log(`  PNR: ${mapped.projektnummer || '(leer)'}`);
    console.log(`  Country: ${mapped.country || '(leer)'}`);
    console.log(`  ProductGroup: ${mapped.productGroup || '(leer)'}`);
    console.log(`  Wunsch: ${mapped.requestedDeliveryDate ? mapped.requestedDeliveryDate.toLocaleDateString('de-DE') : '(leer)'}`);
    console.log(`  Best.: ${mapped.confirmedDeliveryDate ? mapped.confirmedDeliveryDate.toLocaleDateString('de-DE') : '(leer)'}`);

    // Debug: show raw values
    console.log(`  [Raw Wunsch: "${row['Wunsch_Liefertermin']}" (${typeof row['Wunsch_Liefertermin']})]`);
    console.log(`  [Raw Best.: "${row['erster_Bestaetigter_Liefertermin']}" (${typeof row['erster_Bestaetigter_Liefertermin']})]`);
  }

  // Show some rows with actual date values
  console.log('\n\n' + '='.repeat(80));
  console.log('Rows with Wunsch_Liefertermin filled:\n');

  const rowsWithWunsch = jsonData
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row['Wunsch_Liefertermin'])
    .slice(0, 5);

  rowsWithWunsch.forEach(({ row, idx }) => {
    const mapped = mapRowData(row, mappings);
    console.log(`Row ${idx + 1}:`);
    console.log(`  Raw value: "${row['Wunsch_Liefertermin']}" (type: ${typeof row['Wunsch_Liefertermin']})`);
    console.log(`  Mapped: ${mapped.requestedDeliveryDate ? mapped.requestedDeliveryDate.toLocaleDateString('de-DE') : 'NULL'}`);
  });

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
