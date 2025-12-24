/**
 * Test the parseExcelDate function
 */

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    // Filter out placeholder dates
    if (value.getFullYear() === 1900 && value.getMonth() === 0 && value.getDate() === 1) {
      return null;
    }
    return value;
  }

  const str = String(value).trim();
  if (!str) return null;

  let date = null;

  // Try DD.MM.YYYY format (German)
  const germanMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    date = new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Try MM/DD/YYYY or M/D/YYYY format (American)
  const americanMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (americanMatch && !date) {
    const [, first, second, yearStr] = americanMatch;

    // Handle 2-digit or 4-digit year
    let year = Number(yearStr);
    if (year < 100) {
      // Assume 20xx for years 00-99
      year += 2000;
    }

    // Try as MM/DD/YYYY first
    const month = Number(first);
    const day = Number(second);

    // Basic validation: month should be 1-12, day should be 1-31
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = new Date(year, month - 1, day);
    }
  }

  // Validate the date
  if (!date || isNaN(date.getTime())) return null;

  // Filter out placeholder dates
  if (date.getFullYear() === 1900 && date.getMonth() === 0 && date.getDate() === 1) {
    return null; // "01.01.1900" is a placeholder
  }

  return date;
}

console.log('Testing parseExcelDate function:\n');

const testCases = [
  // German format
  '10.10.2024',
  '15.08.2025',
  '04.06.2025',
  '1.1.2024',

  // American format
  '10/10/2024',
  '10/10/24',
  '8/1/23',
  '12/31/2024',

  // Placeholder
  '01.01.1900',

  // Empty/null
  '',
  null,
  undefined,

  // Date objects
  new Date('2024-10-10'),
  new Date('1900-01-01'),
];

testCases.forEach((input) => {
  const result = parseExcelDate(input);
  const formatted = result ? result.toLocaleDateString('de-DE') : 'null';
  console.log(`Input: ${String(input).padEnd(30)} => ${formatted}`);
});
