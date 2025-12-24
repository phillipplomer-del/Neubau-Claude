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
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

  console.log('BookingDate samples:\n');
  for (let i = 0; i < 10; i++) {
    const val = data[i]['BookingDate'];
    console.log(`Row ${i + 1}: "${val}" (type: ${typeof val})`);
  }

  // Also check with raw: true
  const dataRaw = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: null });
  console.log('\n\nBookingDate samples (raw: true):\n');
  for (let i = 0; i < 10; i++) {
    const val = dataRaw[i]['BookingDate'];
    console.log(`Row ${i + 1}: ${val} (type: ${typeof val})`);
  }

} catch (error) {
  console.error('Error:', error.message);
}
