import pandas as pd

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'
sheets_to_inspect = ['2. Budget', '3. Actuals']

try:
    for sheet in sheets_to_inspect:
        print(f"\n--- Sheet: {sheet} ---")
        # Skipping first few rows to get to the main data table
        df = pd.read_excel(file_path, sheet_name=sheet, skiprows=4, nrows=20) 
        print(df.to_string())
except Exception as e:
    print(f"Error reading excel file: {e}")
