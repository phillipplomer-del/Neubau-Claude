import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Orderbacklog';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length > 0) {
    console.log('Checking ProductNumber column for project references:\n');

    // Show first 20 ProductNumbers
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const productNum = data[i]['ProductNumber'];
      const orderNum = data[i]['OrderNumber'];
      console.log(`${i + 1}. Order: ${orderNum} | Product: ${productNum}`);
    }

    // Also check if there's any column that might be PNR
    console.log('\n\nAll columns for reference:');
    const columns = Object.keys(data[0]);
    columns.forEach((col, idx) => {
      console.log(`${String(idx + 1).padStart(2)}. ${col}`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
