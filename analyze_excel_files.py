import pandas as pd
import sys

# File paths
files = {
    'Sales (Offene Lieferungen)': '2025-09-30_Offene_Lieferungen_Stand.xlsx',
    'Production Planning': '2025-12-10_PP_SollIstVergleich.xlsm',
    'Project Management (Controlling)': 'Controlling.xlsx'
}

for name, filepath in files.items():
    print(f"\n{'='*80}")
    print(f"FILE: {name}")
    print(f"Path: {filepath}")
    print('='*80)

    try:
        # Read the Excel file
        if filepath.endswith('.xlsm'):
            df = pd.read_excel(filepath, engine='openpyxl')
        else:
            df = pd.read_excel(filepath)

        # Display basic info
        print(f"\nTotal rows: {len(df)}")
        print(f"Total columns: {len(df.columns)}")

        # Display all column names
        print("\nALL COLUMN NAMES:")
        for i, col in enumerate(df.columns, 1):
            print(f"  {i}. {col}")

        # Display first 5 rows
        print("\nFIRST 5 ROWS (SAMPLE DATA):")
        print(df.head(5).to_string())

        # Check for specific columns
        print("\n\nCOLUMN ANALYSIS:")

        # Look for Article Number columns
        article_candidates = [col for col in df.columns if any(x in col.lower() for x in ['art', 'item', 'artikel', 'material'])]
        if article_candidates:
            print(f"  Potential Article Number columns: {article_candidates}")

        # Look for Project Number columns
        project_candidates = [col for col in df.columns if any(x in col.lower() for x in ['proj', 'project', 'auftrag'])]
        if project_candidates:
            print(f"  Potential Project Number columns: {project_candidates}")

        # Look for quantity columns
        qty_candidates = [col for col in df.columns if any(x in col.lower() for x in ['qty', 'quantity', 'menge', 'anzahl'])]
        if qty_candidates:
            print(f"  Potential Quantity columns: {qty_candidates}")

        # Look for date columns
        date_candidates = [col for col in df.columns if any(x in col.lower() for x in ['date', 'datum', 'termin'])]
        if date_candidates:
            print(f"  Potential Date columns: {date_candidates}")

        # Look for status columns
        status_candidates = [col for col in df.columns if any(x in col.lower() for x in ['status', 'state', 'zustand'])]
        if status_candidates:
            print(f"  Potential Status columns: {status_candidates}")

        # Special check for Sales file - QuantityRem1
        if 'QuantityRem1' in df.columns:
            print(f"\n  *** IMPORTANT: Found 'QuantityRem1' column ***")
            print(f"      - Rows where QuantityRem1 = 0: {len(df[df['QuantityRem1'] == 0])}")
            print(f"      - Rows where QuantityRem1 > 0: {len(df[df['QuantityRem1'] > 0])}")
            print(f"      - These rows with 0 should be skipped (already delivered)")

    except Exception as e:
        print(f"\nERROR reading file: {str(e)}")
        import traceback
        traceback.print_exc()

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)
