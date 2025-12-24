import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Orderbacklog';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length > 0) {
    const columns = Object.keys(data[0]);

    console.log('Checking for date-related columns:\n');

    columns.forEach((col, idx) => {
      if (col.toLowerCase().includes('termin') ||
          col.toLowerCase().includes('wunsch') ||
          col.toLowerCase().includes('bestaetig')) {
        console.log(`Column ${idx + 1}:`);
        console.log(`  Name: "${col}"`);
        console.log(`  Length: ${col.length}`);
        console.log(`  Starts with space: ${col[0] === ' '}`);
        console.log(`  Ends with space: ${col[col.length - 1] === ' '}`);
        console.log(`  First 3 rows values:`);
        for (let i = 0; i < Math.min(3, data.length); i++) {
          console.log(`    Row ${i + 1}: "${data[i][col]}"`);
        }
        console.log('');
      }
    });

    // Also check for PNR column
    console.log('\nChecking for PNR column:');
    const pnrRelated = columns.filter(col =>
      col.toLowerCase().includes('pnr') ||
      col.toLowerCase().includes('projekt')
    );
    console.log('PNR-related columns:', pnrRelated);
  }
} catch (error) {
  console.error('Error:', error.message);
}
