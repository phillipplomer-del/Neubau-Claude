import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellNF: false,
    cellText: false
  });

  const sheetName = 'Orderbacklog';
  const worksheet = workbook.Sheets[sheetName];

  // Get the range to see all columns
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log(`Sheet has ${range.e.c + 1} columns (A to ${XLSX.utils.encode_col(range.e.c)})`);
  console.log(`Sheet has ${range.e.r + 1} rows\n`);

  // Read with header to get all column names
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`Total columns found: ${columns.length}\n`);

    // List ALL columns with their Excel letter
    columns.forEach((col, idx) => {
      const excelLetter = XLSX.utils.encode_col(idx);
      console.log(`${excelLetter.padStart(3)} (${String(idx + 1).padStart(2)}): ${col}`);
    });

    console.log('\n\nChecking for delivery date columns:');
    const deliveryColumns = columns.filter(col =>
      col.toLowerCase().includes('termin') ||
      col.toLowerCase().includes('wunsch') ||
      col.toLowerCase().includes('liefer')
    );

    deliveryColumns.forEach(col => {
      const idx = columns.indexOf(col);
      const excelLetter = XLSX.utils.encode_col(idx);
      console.log(`\n${excelLetter}: "${col}"`);
      console.log('  First 5 values:');
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const val = data[i][col];
        console.log(`    ${i + 1}. ${val}`);
      }
    });
  }

} catch (error) {
  console.error('Error:', error.message);
}
