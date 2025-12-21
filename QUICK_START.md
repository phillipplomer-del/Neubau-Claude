# Quick Start Guide - Excel Analysis

## 🚀 Fastest Way to Analyze Your Files

### Step 1: Open the Browser Analyzer
**Double-click this file**: `excel-analyzer.html`

### Step 2: Analyze Each File
1. Click "Choose File"
2. Select one of these files:
   - `2025-09-30_Offene_Lieferungen_Stand.xlsx` (Sales)
   - `2025-12-10_PP_SollIstVergleich.xlsm` (Production)
   - `Controlling.xlsx` (Project Management)
3. Click "Analyze File"
4. Copy the results to a text file

### Step 3: Repeat for All Three Files
Analyze all three files and save the results.

## 📝 What to Look For

### In EVERY file, find these two columns:

1. **Artikelnummer** (Article Number)
   - Could be named: ArtNr, Artikel, ItemNo, Material
   - Write it down: `Artikelnummer column = ___________`

2. **Projektnummer** (Project Number)
   - Could be named: ProjektNr, Project, Auftrag, OrderNo
   - Write it down: `Projektnummer column = ___________`

### In the SALES file specifically:

3. **QuantityRem1** - IMPORTANT!
   - If this column exists and equals 0, SKIP that row
   - Write down: `Found QuantityRem1? YES / NO`
   - Write down: `How many rows to skip? ___________`

## ✅ Alternative: Command Line

If you prefer terminal:

```bash
cd "/Users/phillipplomer/Desktop/Programme/Neubau Claude"
node analyze-all-files.js > analysis-results.txt
```

Then open `analysis-results.txt` to see all results at once.

## 📋 Template to Fill Out

After analysis, fill this out:

```
SALES FILE (Offene Lieferungen):
  Artikelnummer column: _____________
  Projektnummer column: _____________
  QuantityRem1 filtering needed: YES/NO
  Rows to skip (QuantityRem1=0): _____________

PRODUCTION FILE (PP_SollIstVergleich):
  Artikelnummer column: _____________
  Projektnummer column: _____________
  Important date columns: _____________
  Soll vs Ist columns: _____________

CONTROLLING FILE:
  Artikelnummer column: _____________
  Projektnummer column: _____________
  Budget column: _____________
  Cost column: _____________
```

## 🆘 Need Help?

- Read: `ANALYSIS_SUMMARY.md` (full documentation)
- Read: `EXCEL_ANALYSIS_README.md` (detailed instructions)

## 🎯 Next Step

Once you have the column names, you'll create mapping configurations in your TypeScript code.
