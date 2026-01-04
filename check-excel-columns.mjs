import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('Sheet Name:', sheetName);
  console.log('Total Rows:', data.length);
  console.log('\nColumn Names:');

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    console.log('\nFirst Row Sample:');
    console.log(JSON.stringify(data[0], null, 2));
  }
} catch (error) {
  console.error('Error:', error.message);
}
