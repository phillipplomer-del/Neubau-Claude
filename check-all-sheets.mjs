import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);

  console.log('All Sheet Names:', workbook.SheetNames);
  console.log('');

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`\n========================================`);
    console.log(`Sheet: ${sheetName}`);
    console.log(`Total Rows: ${data.length}`);

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`\nColumn Names (${columns.length} columns):`);
      columns.forEach((col, idx) => {
        console.log(`  ${idx + 1}. ${col}`);
      });

      console.log('\nFirst Row Sample (partial):');
      const firstRow = data[0];
      // Show only fields related to dates
      const dateFields = columns.filter(col =>
        col.toLowerCase().includes('termin') ||
        col.toLowerCase().includes('date') ||
        col.toLowerCase().includes('datum') ||
        col.toLowerCase().includes('wunsch') ||
        col.toLowerCase().includes('liefer')
      );
      console.log('Date-related fields:');
      dateFields.forEach(field => {
        console.log(`  ${field}: ${firstRow[field]}`);
      });
    }
  });
} catch (error) {
  console.error('Error:', error.message);
}
