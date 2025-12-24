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

  console.log('Testing with raw: true\n');
  console.log('='.repeat(60));

  // Find row with all date fields populated
  const goodRow = data.find(row =>
    row['BookingDate'] &&
    row['DeliveryDate'] &&
    row['Wunsch_Liefertermin'] &&
    row['erster_Bestaetigter_Liefertermin'] &&
    row['erster_Bestaetigter_Liefertermin'] !== '01.01.1900'
  );

  if (goodRow) {
    const idx = data.indexOf(goodRow);
    console.log(`\nRow ${idx + 1} (has all date fields):\n`);

    const fields = [
      'BookingDate',
      'DeliveryDate',
      'Wunsch_Liefertermin',
      'erster_Bestaetigter_Liefertermin'
    ];

    fields.forEach(field => {
      const val = goodRow[field];
      console.log(`${field}:`);
      console.log(`  Value: ${val}`);
      console.log(`  Type: ${typeof val}`);
      console.log(`  Is Date: ${val instanceof Date}`);
      if (val instanceof Date) {
        console.log(`  Formatted: ${val.toLocaleDateString('de-DE')}`);
      }
      console.log('');
    });
  } else {
    console.log('No row found with all date fields populated');

    // Show samples for each field
    console.log('\nBookingDate (first 3):');
    data.slice(0, 3).forEach((row, i) => {
      const val = row['BookingDate'];
      console.log(`  ${i + 1}. ${val} (${typeof val}, isDate: ${val instanceof Date})`);
    });

    console.log('\nWunsch_Liefertermin (first 3 non-empty):');
    const wunschRows = data.filter(r => r['Wunsch_Liefertermin']).slice(0, 3);
    wunschRows.forEach((row) => {
      const val = row['Wunsch_Liefertermin'];
      console.log(`  ${val} (${typeof val}, isDate: ${val instanceof Date})`);
    });

    console.log('\nerster_Bestaetigter_Liefertermin (first 3 valid):');
    const ersterRows = data.filter(r => r['erster_Bestaetigter_Liefertermin'] && r['erster_Bestaetigter_Liefertermin'] !== '01.01.1900').slice(0, 3);
    ersterRows.forEach((row) => {
      const val = row['erster_Bestaetigter_Liefertermin'];
      console.log(`  ${val} (${typeof val}, isDate: ${val instanceof Date})`);
    });
  }

} catch (error) {
  console.error('Error:', error.message);
}
