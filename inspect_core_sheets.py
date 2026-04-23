import pandas as pd

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'
sheets_to_inspect = ['1. Costs Budgeted', '1. Revenues Budgeted']

try:
    for sheet in sheets_to_inspect:
        print(f"\n--- Sheet: {sheet} ---")
        # Reading first 10 rows to see headers and data start
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=10) 
        print(df.to_string())
except Exception as e:
    print(f"Error reading excel file: {e}")
