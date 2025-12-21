# Excel File Analysis Guide

## Overview

This document provides information about analyzing the three ERP Excel files to understand their column structure and map them to the TypeScript interfaces.

## Files to Analyze

1. **Sales (Offene Lieferungen)**: `2025-09-30_Offene_Lieferungen_Stand.xlsx`
2. **Production Planning**: `2025-12-10_PP_SollIstVergleich.xlsm`
3. **Project Management (Controlling)**: `Controlling.xlsx`

## How to Run the Analysis

### Option 1: Using Node.js (Recommended)

```bash
# Make sure you're in the project directory
cd "/Users/phillipplomer/Desktop/Programme/Neubau Claude"

# Run the analysis script
node analyze-all-files.js
```

This will output:
- All column names from each file
- Sample data (first 5 rows)
- Column type detection (string, number, date, etc.)
- Recommendations for Artikelnummer and Projektnummer mappings
- Business rules (like QuantityRem1 filtering)

### Option 2: Using the TypeScript Utility

The `src/utils/excelAnalyzer.ts` file provides a TypeScript utility that can be integrated into your React application. You can use it to analyze files during the import process.

```typescript
import { analyzeExcelFile, formatAnalysisResult } from '@/utils/excelAnalyzer';

// In a file input handler
const handleFileAnalysis = async (file: File) => {
  const analysis = await analyzeExcelFile(file);
  console.log(formatAnalysisResult(analysis));
};
```

### Option 3: Using Python (Alternative)

If you prefer Python:

```bash
python3 excel_analyzer.py
```

## Key Information Needed

For each Excel file, we need to identify:

### 1. Artikelnummer (Article Number)
- Possible column names: "ArtNr", "Artikel", "ItemNo", "Material", "Artikelnummer"
- This is the primary identifier for matching products across different departments

### 2. Projektnummer (Project Number)
- Possible column names: "ProjektNr", "Project", "ProjNr", "Auftrag", "OrderNo"
- This is used to link related entries across departments

### 3. Important Data Fields

#### For Sales File (Offene Lieferungen):
- **QuantityRem1**: CRITICAL - if this is 0, skip the row (already delivered)
- Delivery dates
- Customer information
- Quantities
- Status information

#### For Production Planning File:
- Planned vs Actual dates (Soll vs Ist)
- Work order numbers
- Resource allocation
- Completion status

#### For Controlling File:
- Budget information
- Actual costs
- Revenue data
- Project status

## Expected Output Format

The analysis script will provide output in this format for each file:

```
================================================================================
FILE: Sales (Offene Lieferungen)
Path: 2025-09-30_Offene_Lieferungen_Stand.xlsx
================================================================================

BASIC INFORMATION:
  Sheet name: Sheet1
  Total data rows: 1234
  Total columns: 25

ALL COLUMN NAMES (25 columns):
   1. Column1 (string)
   2. Column2 (number)
   ...

SAMPLE DATA (First 5 rows):

Row 1:
  Column1: Value1
  Column2: Value2
  ...

COLUMN ANALYSIS:
--------------------------------------------------------------------------------

Potential ARTICLE NUMBER columns:
  - ArtNr
    Sample values: ABC123, DEF456, GHI789
    Unique values: 456

Potential PROJECT NUMBER columns:
  - ProjektNr
    Sample values: P001, P002, P003
    Unique values: 89

Potential QUANTITY columns:
  - QuantityRem1
    Min: 0, Max: 1000, Average: 125.50

********************************************************************************
IMPORTANT: QuantityRem1 column found (BUSINESS RULE)
********************************************************************************
  Total rows: 1234
  Rows where QuantityRem1 = 0 (already delivered, SKIP): 456 (37.0%)
  Rows where QuantityRem1 > 0 (pending delivery, INCLUDE): 778 (63.0%)

  ACTION: Filter out rows where QuantityRem1 == 0 before processing

RECOMMENDATIONS:
--------------------------------------------------------------------------------
  ARTIKELNUMMER (Article Number): Use column 'ArtNr'
  PROJEKTNUMMER (Project Number): Use column 'ProjektNr'

  Other important columns to consider:
    - CustomerName: Customer ABC
    - DeliveryDate: 2025-09-30
    ...
```

## TypeScript Interface Mappings

Once you have the column names, you'll need to create mapping configurations:

```typescript
// Example mapping for Sales file
const salesColumnMapping = {
  artikelnummer: 'ArtNr',           // Map to artikelnummer
  projektnummer: 'ProjektNr',        // Map to projektnummer
  deliveryNumber: 'LieferscheinNr',
  customerName: 'Kunde',
  quantity: 'QuantityRem1',
  // ... etc
};
```

## Business Rules to Implement

### Sales File (Offene Lieferungen)
```typescript
// Filter condition
const shouldIncludeRow = (row: any) => {
  // Skip rows where QuantityRem1 is 0 (already delivered)
  return row.QuantityRem1 && row.QuantityRem1 > 0;
};
```

## Next Steps

1. **Run the Analysis**: Execute `node analyze-all-files.js` to get the column structure
2. **Review Output**: Check the recommendations for Artikelnummer and Projektnummer
3. **Create Mappings**: Based on the output, create column mapping configurations
4. **Update Interfaces**: If needed, update the TypeScript interfaces in `src/types/`
5. **Implement Parsers**: Create parser functions that map Excel columns to TypeScript interfaces
6. **Add Validation**: Implement validation rules based on the business requirements
7. **Test Import**: Test the import process with the actual Excel files

## Troubleshooting

### If columns are not auto-detected:
- Review all column names in the "ALL COLUMN NAMES" section
- Manually identify which columns contain Artikelnummer and Projektnummer
- Look for similar column names in your language (German/English)

### If data types are wrong:
- Check the sample values
- The type detection is based on the first 100 rows
- You may need to explicitly cast types during import

### If business rules are complex:
- Document all filtering conditions
- Implement custom validation functions
- Test with edge cases

## Support Files Created

1. `analyze-all-files.js` - Standalone Node.js script for analysis
2. `src/utils/excelAnalyzer.ts` - TypeScript utility for runtime analysis
3. `excel_analyzer.py` - Python alternative (if needed)
4. `analyze_excel_files.py` - Python script using pandas
5. `analyze_with_openpyxl.py` - Python script using openpyxl

Choose the one that works best for your environment.
