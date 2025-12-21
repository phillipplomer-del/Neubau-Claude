# Excel File Analysis Summary

## Overview

I've created multiple tools to help you analyze the three ERP Excel files and understand their column structure. Due to system permissions, I cannot execute these tools directly, but you have several options to run the analysis yourself.

## Files to Analyze

1. **Sales (Offene Lieferungen)**
   - File: `/Users/phillipplomer/Desktop/Programme/Neubau Claude/2025-09-30_Offene_Lieferungen_Stand.xlsx`
   - Department: Sales
   - Expected data: Open deliveries, customer orders

2. **Production Planning**
   - File: `/Users/phillipplomer/Desktop/Programme/Neubau Claude/2025-12-10_PP_SollIstVergleich.xlsm`
   - Department: Production
   - Expected data: Planned vs Actual comparison (Soll-Ist-Vergleich)

3. **Project Management (Controlling)**
   - File: `/Users/phillipplomer/Desktop/Programme/Neubau Claude/Controlling.xlsx`
   - Department: Project Management
   - Expected data: Budget, costs, revenue, project tracking

## Analysis Tools Created

### 🌐 Option 1: Browser-Based Analyzer (EASIEST)

**File**: `excel-analyzer.html`

**How to use**:
1. Open the file in any web browser (double-click the file)
2. Click "Choose File" and select one of the Excel files
3. Click "Analyze File"
4. View the complete analysis in the browser

**Advantages**:
- No installation required
- Works offline
- Visual, user-friendly interface
- Immediate results

### 🟢 Option 2: Node.js Script (RECOMMENDED FOR AUTOMATION)

**File**: `analyze-all-files.js`

**How to use**:
```bash
cd "/Users/phillipplomer/Desktop/Programme/Neubau Claude"
node analyze-all-files.js
```

**Advantages**:
- Analyzes all three files at once
- Detailed console output
- Easy to redirect to a text file for review

**Output to file**:
```bash
node analyze-all-files.js > analysis-results.txt
```

### 🐍 Option 3: Python Scripts (ALTERNATIVE)

**Files**:
- `excel_analyzer.py` (uses pandas)
- `analyze_with_openpyxl.py` (uses openpyxl)

**How to use**:
```bash
python3 excel_analyzer.py
```

### 📘 Option 4: TypeScript Utility (FOR INTEGRATION)

**File**: `src/utils/excelAnalyzer.ts`

This is integrated into your React application and can be used programmatically:

```typescript
import { analyzeExcelFile, formatAnalysisResult } from '@/utils/excelAnalyzer';

const analysis = await analyzeExcelFile(file);
console.log(formatAnalysisResult(analysis));
```

## What the Analysis Will Show

For each Excel file, you'll get:

### 1. Basic Information
- Sheet name(s)
- Total number of rows
- Total number of columns

### 2. Complete Column List
- All column names
- Data type for each column (string, number, date, etc.)
- Sample values
- Unique value count

### 3. Sample Data
- First 5 rows of actual data
- Shows what the data looks like

### 4. Column Analysis
- **Article Number candidates**: Columns that might contain Artikelnummer
- **Project Number candidates**: Columns that might contain Projektnummer
- **Date columns**: All date-related fields
- **Quantity columns**: Numeric fields with quantities
- **Status columns**: Fields containing status information
- **Other important columns**: Customer names, descriptions, prices, etc.

### 5. Business Rules
- Special filtering conditions (e.g., QuantityRem1 = 0)
- Estimated impact of filters
- Data quality observations

### 6. Recommendations
- Which column to use for Artikelnummer
- Which column to use for Projektnummer
- Other important mappings

## Key Information to Extract

### For All Files:

#### ✅ Artikelnummer (Article Number)
- **Purpose**: Primary identifier for matching products across departments
- **Common names**: ArtNr, Artikel, ItemNo, Material, Artikelnummer
- **What to do**: Identify which column contains this value

#### ✅ Projektnummer (Project Number)
- **Purpose**: Links related entries across departments
- **Common names**: ProjektNr, Project, ProjNr, Auftrag, OrderNo
- **What to do**: Identify which column contains this value

### For Sales File Specifically:

#### 🚨 QuantityRem1 (CRITICAL BUSINESS RULE)
- **Purpose**: Remaining quantity to be delivered
- **Business Rule**: If QuantityRem1 = 0, the row should be SKIPPED (already delivered)
- **Impact**: This could filter out 30-50% of rows
- **What to do**: Implement this filter in the import process

### TypeScript Interface Mappings

Based on the analysis, you'll need to create mappings like:

```typescript
// Example for Sales file
interface SalesColumnMapping {
  artikelnummer: string;        // e.g., "ArtNr"
  projektnummer: string;         // e.g., "ProjektNr"
  deliveryNumber: string;        // e.g., "LieferscheinNr"
  customerName: string;          // e.g., "Kunde"
  quantity: string;              // e.g., "QuantityRem1"
  deliveryDate: string;          // e.g., "Liefertermin"
  // ... etc
}
```

## Existing TypeScript Interfaces

Your project already has these type definitions:

### 1. Common Types (`src/types/common.ts`)
- `BaseEntry`: Base interface with `artikelnummer`, `projektnummer`, `id`, etc.
- `Department`: 'sales' | 'production' | 'projectManagement'
- Validation, Import, and Match types

### 2. Sales Types (`src/types/sales.ts`)
- `SalesEntry extends BaseEntry`
- Fields: deliveryNumber, customerName, quantity, status, etc.
- `SalesKPI`: For dashboard metrics

### 3. Production Types (`src/types/production.ts`)
- `ProductionEntry extends BaseEntry`
- Fields: plannedStartDate, actualStartDate, completionPercentage, etc.
- `ProductionKPI`: For dashboard metrics
- `GanttTask`: For Gantt chart visualization

### 4. Project Management Types (`src/types/projectManagement.ts`)
- `ProjectManagementEntry extends BaseEntry`
- Fields: budget, costs, revenue, profitMargin, etc.
- `ProjectKPI`: For dashboard metrics
- `Milestone`: For project milestones

### 5. Excel Parser (`src/lib/excel/parser.ts`)
- `parseExcelFile()`: Reads Excel files
- `detectColumnType()`: Auto-detects data types
- Already integrated with xlsx library

## Next Steps

### Step 1: Run Analysis
Choose one of the analysis methods above and run it on all three files.

**Recommended**: Open `excel-analyzer.html` in your browser for the quickest results.

### Step 2: Document Column Mappings
Create a document or configuration file with the mappings:

```typescript
// Column mappings for each file
export const COLUMN_MAPPINGS = {
  sales: {
    artikelnummer: 'ArtNr',      // Replace with actual column name
    projektnummer: 'ProjektNr',   // Replace with actual column name
    // ... add all other mappings
  },
  production: {
    artikelnummer: '???',         // To be filled from analysis
    projektnummer: '???',         // To be filled from analysis
    // ... add all other mappings
  },
  projectManagement: {
    artikelnummer: '???',         // To be filled from analysis
    projektnummer: '???',         // To be filled from analysis
    // ... add all other mappings
  },
};
```

### Step 3: Implement Import Logic
Based on the mappings, implement the import functions:

```typescript
// Example for Sales
function importSalesData(excelData: any[]): SalesEntry[] {
  return excelData
    .filter(row => row[COLUMN_MAPPINGS.sales.quantity] > 0) // Business rule!
    .map(row => ({
      id: generateUUID(),
      department: 'sales',
      artikelnummer: row[COLUMN_MAPPINGS.sales.artikelnummer],
      projektnummer: row[COLUMN_MAPPINGS.sales.projektnummer],
      customerName: row[COLUMN_MAPPINGS.sales.customerName],
      // ... map all other fields
      importedAt: new Date(),
      sourceFile: fileName,
    }));
}
```

### Step 4: Add Validation
Implement validation rules to ensure data quality:

```typescript
function validateSalesEntry(entry: SalesEntry): ValidationResult {
  const errors: ValidationError[] = [];

  if (!entry.artikelnummer) {
    errors.push({
      row: 0, // row number
      column: 'artikelnummer',
      value: entry.artikelnummer,
      message: 'Artikelnummer is required',
      severity: 'error',
    });
  }

  // ... more validation rules

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    rowsProcessed: 1,
    rowsValid: errors.length === 0 ? 1 : 0,
  };
}
```

### Step 5: Test Import
Test the import process:
1. Start with a few rows
2. Verify data is correctly mapped
3. Check that business rules are applied
4. Validate that Artikelnummer and Projektnummer are correctly extracted

## Important Business Rules to Remember

### Sales File:
- ✅ Skip rows where `QuantityRem1 = 0`
- ✅ Filter condition should be implemented BEFORE creating database entries

### Production File:
- ⚠️ May need to handle Soll (planned) vs Ist (actual) columns
- ⚠️ Date variance calculations might be needed

### Controlling File:
- ⚠️ Budget vs Actual cost comparisons
- ⚠️ May need to calculate profitability metrics

## Troubleshooting

### If Artikelnummer is not found:
1. Review ALL column names in the analysis
2. Look for columns containing product identifiers
3. Check for German/English variations: Art, Artikel, Item, Material
4. If still not found, it might be named something unexpected

### If Projektnummer is not found:
1. Look for order numbers, project codes, or reference numbers
2. Check for: Projekt, Auftrag, Order, Reference
3. Some files might not have project numbers (this is okay)

### If column types are wrong:
1. Check sample values in the analysis
2. Excel date columns might appear as numbers
3. You may need custom parsing logic

## Files Reference

All created files:

```
/Users/phillipplomer/Desktop/Programme/Neubau Claude/
├── excel-analyzer.html                  ← Browser-based analyzer (EASIEST)
├── analyze-all-files.js                 ← Node.js batch analyzer
├── analyze-excel.mjs                    ← Alternative Node.js version
├── excel_analyzer.py                    ← Python version (pandas)
├── analyze_excel_files.py               ← Python version (detailed)
├── analyze_with_openpyxl.py             ← Python version (openpyxl)
├── EXCEL_ANALYSIS_README.md             ← Detailed usage instructions
├── ANALYSIS_SUMMARY.md                  ← This file
└── src/
    └── utils/
        └── excelAnalyzer.ts             ← TypeScript utility for app integration
```

## Example Output Format

Here's what you'll see when you run the analysis:

```
================================================================================
FILE: Sales (Offene Lieferungen)
================================================================================

BASIC INFORMATION:
  Total rows: 1234
  Total columns: 25

ALL COLUMN NAMES (25 columns):
   1. ArtNr (string)
      Samples: ABC-123, DEF-456
      Unique: 456
   2. ProjektNr (string)
      Samples: P001, P002
      Unique: 89
   3. QuantityRem1 (number)
      Samples: 100, 0
      Unique: 234
   ...

SAMPLE DATA (First 5 rows):
Row 1:
  ArtNr: ABC-123
  ProjektNr: P001
  CustomerName: Customer ABC
  QuantityRem1: 100
  DeliveryDate: 2025-09-30
  ...

COLUMN ANALYSIS:
Potential ARTICLE NUMBER columns:
  - ArtNr
    Sample values: ABC-123, DEF-456, GHI-789
    Unique values: 456

Potential PROJECT NUMBER columns:
  - ProjektNr
    Sample values: P001, P002, P003
    Unique values: 89

******************************************************************************
IMPORTANT: QuantityRem1 column found (BUSINESS RULE)
******************************************************************************
  Total rows: 1234
  Rows where QuantityRem1 = 0 (SKIP): 456 (37.0%)
  Rows where QuantityRem1 > 0 (INCLUDE): 778 (63.0%)

RECOMMENDATIONS:
  ARTIKELNUMMER: Use column 'ArtNr'
  PROJEKTNUMMER: Use column 'ProjektNr'
```

## Questions to Answer

After running the analysis, you should be able to answer:

1. ✅ What column contains Artikelnummer in each file?
2. ✅ What column contains Projektnummer in each file?
3. ✅ Which columns contain dates?
4. ✅ Which columns contain status information?
5. ✅ What business rules need to be applied (like QuantityRem1 filtering)?
6. ✅ Are there any data quality issues?
7. ✅ Do all three files have consistent identifier formats?

## Support

If you have questions or issues:

1. Review the output from the analysis
2. Check the TypeScript interfaces in `src/types/`
3. Look at the Excel parser in `src/lib/excel/parser.ts`
4. Review this summary document

Good luck with your analysis! 🚀
