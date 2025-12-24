import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Orderbacklog';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Sheet: ${sheetName}`);
  console.log(`Total Rows: ${data.length}\n`);

  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`All ${columns.length} columns:\n`);
    columns.forEach((col, idx) => {
      // Show with value from first row
      const value = data[0][col];
      const displayValue = value !== null && value !== undefined ? String(value).substring(0, 30) : '(empty)';
      console.log(`${String(idx + 1).padStart(2)}. ${col.padEnd(40)} | ${displayValue}`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
