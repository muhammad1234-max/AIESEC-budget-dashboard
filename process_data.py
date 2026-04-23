import pandas as pd
import json
import os
import re

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'
output_path = 'dashboard/public/data.json'

MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

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
        months = MONTHS
        
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

def _normalize(text):
    if text is None:
        return ''
    return re.sub(r'[^a-z0-9]+', ' ', str(text).lower()).strip()

def _sum_matching_items(items, label):
    label_norm = _normalize(label)
    if not label_norm:
        return {"values": {m: 0.0 for m in MONTHS}, "total": 0.0}

    matches = []
    for item in items:
        desc_norm = _normalize(item.get('description'))
        if not desc_norm:
            continue
        if desc_norm == label_norm:
            matches.append(item)
            continue
        tokens = desc_norm.split()
        if label_norm in tokens:
            matches.append(item)
            continue
        if desc_norm.startswith(label_norm + ' '):
            matches.append(item)
            continue

    summed = {"values": {m: 0.0 for m in MONTHS}, "total": 0.0}
    for item in matches:
        for m in MONTHS:
            summed["values"][m] += float(item.get("values", {}).get(m, 0) or 0)
        summed["total"] += float(item.get("total", 0) or 0)
    return summed

def _build_financial_node(name, children_template, budget_items, actual_items):
    children = []
    if isinstance(children_template, dict) and children_template:
        for child_name, child_children in children_template.items():
            children.append(_build_financial_node(child_name, child_children, budget_items, actual_items))
        budget = {"values": {m: 0.0 for m in MONTHS}, "total": 0.0}
        actual = {"values": {m: 0.0 for m in MONTHS}, "total": 0.0}
        for child in children:
            for m in MONTHS:
                budget["values"][m] += child["budget"]["values"][m]
                actual["values"][m] += child["actual"]["values"][m]
            budget["total"] += child["budget"]["total"]
            actual["total"] += child["actual"]["total"]
    else:
        budget = _sum_matching_items(budget_items, name)
        actual = _sum_matching_items(actual_items, name)

    return {
        "name": name,
        "budget": budget,
        "actual": actual,
        "children": children
    }

def build_financial_structure(budget_data, actual_data):
    revenue_template = {
        "ELD Products": {
            "OGTA": {},
            "OGTE": {},
            "OGV": {},
            "IGTA": {},
            "EWA": {},
            "YSF": {},
            "EWA Initiatives": {},
            "Partner Fees": {},
            "Participant Fees": {},
            "Others": {}
        },
        "YSF": {
            "YSF Partner Fees": {},
            "YSF Participant Fees": {},
            "YSF Others": {}
        },
        "Other Portfolios and Initiatives": {
            "Participant Fees": {},
            "Partner Fees": {}
        }
    }

    costs_template = {
        "ELD Products": {
            "OGV": {},
            "Others": {}
        },
        "OPS": {
            "OGTA": {},
            "Others": {},
            "OGTE": {},
            "IGTA": {},
            "EWA": {}
        }
    }

    return {
        "revenues": [_build_financial_node(name, children, budget_data.get("revenues", []), actual_data.get("revenues", [])) for name, children in revenue_template.items()],
        "costs": [_build_financial_node(name, children, budget_data.get("costs", []), actual_data.get("costs", [])) for name, children in costs_template.items()]
    }

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
    budget = {
        "costs": extract_financial_data('1. Costs Budgeted'),
        "revenues": extract_financial_data('1. Revenues Budgeted')
    }

    actuals = {
        "costs": extract_financial_data('3. Costs Executed'),
        "revenues": extract_financial_data('3. Revenues Executed')
    }

    final_data = {
        "budget": budget,
        "actuals": actuals,
        "financials": build_financial_structure(budget, actuals),
        "financialRatios": []
    }
    
    # Create directory if not exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Data successfully extracted to {output_path}")

if __name__ == "__main__":
    main()
