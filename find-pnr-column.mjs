import XLSX from 'xlsx';

const filePath = './2025-09-30_Offene_Lieferungen_Stand-5.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'Orderbacklog';
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length > 0) {
    const columns = Object.keys(data[0]);

    console.log('Looking for project-number-like columns:\n');
    console.log('Sample row data:');

    // Look at first row
    const row = data[0];

    columns.forEach((col, idx) => {
      const value = row[col];
      // Check if value looks like a project number (starts with P followed by numbers)
      const stringValue = String(value);

      if (stringValue.match(/^P\d+/) ||
          col.toLowerCase().includes('representative') ||
          col.toLowerCase().includes('rep')) {
        console.log(`\nColumn ${idx + 1}: "${col}"`);
        console.log(`  Value: "${value}"`);
        console.log(`  Type: ${typeof value}`);

        // Show first 5 values
        console.log(`  First 5 values:`);
        for (let i = 0; i < Math.min(5, data.length); i++) {
          console.log(`    ${i + 1}. "${data[i][col]}"`);
        }
      }
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
