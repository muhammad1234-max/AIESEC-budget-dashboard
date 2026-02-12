import pandas as pd

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    print("Sheet names:", xl.sheet_names)
except Exception as e:
    print(f"Error reading excel file: {e}")
