import pandas as pd
import json
import os

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'
output_path = 'dashboard/public/data.json'

def extract_financial_data(sheet_name):
    try:
        # Read the sheet, skipping initial rows to align headers
        # Headers are on row 6 in Excel (index 5)
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=5)
        
        # Rename columns for clarity based on inspection
        # The dataframe columns will be named after the values in row 5
        # We need to map them to standard keys
        
        # Identify the 'Description' column (usually Unnamed: 2 if header is row 5)
        # However, since we used header=5, the columns should be the actual names from that row.
        # Let's look at the columns: 'GFB Code', 'Description', 'Feb', 'Mar', ...
        
        # Let's inspect columns first to be safe
        # print(f"Columns for {sheet_name}: {df.columns.tolist()}")
        
        # Filter valid rows: Description should not be NaN
        # The column name for Description might be 'Description' or similar. 
        # Based on previous output: 'Unnamed: 1' was GFB Code, 'Unnamed: 2' was Description.
        # So if we load with header=5, 'Unnamed: 2' should become the column name if the cell was empty?
        # Wait, in the inspection output:
        # Row 5 had "GFB Code", "Description" (actually it was "ELD Products..." in one cell).
        # Let's assume standard columns:
        # Col 2 (index 2): Description
        # Col 3 (index 3) to 14 (index 14): Months (Feb - Jan)
        
        # It's safer to read without header and slice
        df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        data = []
        months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
        
        # Data starts from row 6 (index 6)
        for i in range(6, len(df_raw)):
            row = df_raw.iloc[i]
            description = row[2]
            
            if pd.isna(description):
                continue
            
            description = str(description).strip()
            
            # Check if it's a valid data row (has numbers in month columns)
            # Sometimes there are section headers or totals.
            # We want rows that have numerical data or represent a line item.
            
            item = {
                "description": description,
                "values": {}
            }
            
            total = 0
            has_data = False
            for j, month in enumerate(months):
                col_idx = 3 + j
                val = row[col_idx]
                
                # Coerce to numeric, errors='coerce' turns non-numeric to NaN
                val_numeric = pd.to_numeric(val, errors='coerce')
                
                if pd.isna(val_numeric):
                    val_numeric = 0
                
                item["values"][month] = float(val_numeric)
                total += float(val_numeric)
                if val_numeric != 0:
                    has_data = True
            
            item["total"] = total
            
            # Include item if it has a description, even if values are 0 (it might be budget/actuals with no spend yet)
            # We filter out only if description implies it's not a line item (optional, but "Advertising" etc are valid)
            if description:
                data.append(item)
                
        return data
    except Exception as e:
        print(f"Error processing {sheet_name}: {e}")
        return []

def extract_exchange_goals():
    sheet_name = '2. Exchange Goals'
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        goals = {
            "opens": {},
            "approvals": {},
            "realizations": {}
        }

        # Programs start at row 11 (index 11) and repeat every 5 rows
        # 11: oGV, 16: oGTa, 21: oGTe, 26: iGV, 31: iGTa, 36: iGTe
        # Actually check if program name matches to be safe
        
        # Row offsets from start of block:
        # 0: Header (Program Name)
        # 1: Opens
        # 2: Approvals
        # 3: Realizations
        
        start_row = 11
        block_size = 5
        programs = ['oGV', 'oGTa', 'oGTe', 'iGV', 'iGTa', 'iGTe']
        
        for i, prog in enumerate(programs):
            row_idx = start_row + (i * block_size)
            
            # Verify program name (col 1)
            sheet_prog = df.iloc[row_idx, 1]
            if str(sheet_prog).strip() != prog:
                print(f"Warning: Expected {prog} at row {row_idx}, found {sheet_prog}")
            
            # Total is at col 16 (Q)
            col_total = 16
            
            # Read values
            opens_val = pd.to_numeric(df.iloc[row_idx + 1, col_total], errors='coerce')
            approvals_val = pd.to_numeric(df.iloc[row_idx + 2, col_total], errors='coerce')
            realizations_val = pd.to_numeric(df.iloc[row_idx + 3, col_total], errors='coerce')
            
            goals["opens"][prog] = float(opens_val) if not pd.isna(opens_val) else 0
            goals["approvals"][prog] = float(approvals_val) if not pd.isna(approvals_val) else 0
            goals["realizations"][prog] = float(realizations_val) if not pd.isna(realizations_val) else 0
            
        return goals
    except Exception as e:
        print(f"Error processing {sheet_name}: {e}")
        return {}

def extract_pl_summary(sheet_name):
    # Extracts monthly totals from ProfitLoss Forecast/Analysis
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        
        # We need to find rows for "Total Revenue", "Total Costs", "Surplus/Deficit"
        # This is harder without visual inspection of the whole sheet.
        # But we can calculate it from the detailed sheets if needed.
        # Alternatively, we just look for specific strings in column 1 (Description)
        
        summary = {
            "months": ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
            "revenue": [],
            "costs": [],
            "profit": []
        }
        
        # Search for key rows
        for i in range(len(df)):
            row = df.iloc[i]
            desc = str(row[1]).lower() # Description usually in col 1 for PL sheet
            
            # This is speculative. Let's stick to calculating from the detailed sheets for reliability
            # OR inspect this sheet first.
            pass
            
        return {} # Placeholder
    except Exception as e:
        return {}

def main():
    final_data = {
        "budget": {
            "costs": extract_financial_data('1. Costs Budgeted'),
            "revenues": extract_financial_data('1. Revenues Budgeted')
        },
        "actuals": {
            "costs": extract_financial_data('3. Costs Executed'),
            "revenues": extract_financial_data('3. Revenues Executed')
        },
        "goals": extract_exchange_goals()
    }
    
    # Create directory if not exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Data successfully extracted to {output_path}")

if __name__ == "__main__":
    main()
