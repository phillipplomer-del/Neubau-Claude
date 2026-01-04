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

  const sheet = workbook.Sheets['Orderbacklog'];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: null });

  // Find all rows with PNR P46336
  const rows = data.filter(row => row['PNR'] === 'P46336');

  console.log(`Found ${rows.length} rows with PNR P46336\n`);

  rows.forEach((row, i) => {
    console.log(`Row ${i + 1}:`);
    console.log(`  ProductNumber: ${row['ProductNumber']}`);
    console.log(`  Wunsch_Liefertermin: "${row['Wunsch_Liefertermin']}" (type: ${typeof row['Wunsch_Liefertermin']})`);
    console.log(`  erster_Bestaetigter_Liefertermin: "${row['erster_Bestaetigter_Liefertermin']}" (type: ${typeof row['erster_Bestaetigter_Liefertermin']})`);
    console.log('');
  });

  // Count how many rows have actual date values
  const rowsWithWunsch = data.filter(r => r['Wunsch_Liefertermin'] && r['Wunsch_Liefertermin'] !== '01.01.1900' && r['Wunsch_Liefertermin'] !== null);
  const rowsWithErster = data.filter(r => r['erster_Bestaetigter_Liefertermin'] && r['erster_Bestaetigter_Liefertermin'] !== '01.01.1900' && r['erster_Bestaetigter_Liefertermin'] !== null && r['erster_Bestaetigter_Liefertermin'] !== '');

  console.log(`\n\nTotal rows: ${data.length}`);
  console.log(`Rows with Wunsch_Liefertermin: ${rowsWithWunsch.length}`);
  console.log(`Rows with erster_Bestaetigter_Liefertermin: ${rowsWithErster.length}`);

} catch (error) {
  console.error('Error:', error.message);
}
