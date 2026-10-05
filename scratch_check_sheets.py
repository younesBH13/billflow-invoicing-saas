import pandas as pd
import sys
import os
from openpyxl import load_workbook
import subprocess

def recover_missing_sheet():
    pmi1207_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207.xlsx"
    classeur3_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\classeur3.xls"
    script_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\generate_pmi_reports.py"
    temp_output_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\temp_classeur3_output.xlsx"
    new_pmi1207_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207_Recovered.xlsx"
    
    # Run the generator to get the sheets from classeur3
    subprocess.run(["python", script_path, classeur3_path, temp_output_path], check=True)
    
    try:
        # Load sheets to check
        pmi_sheets = pd.ExcelFile(pmi1207_path).sheet_names
        temp_sheets = pd.ExcelFile(temp_output_path).sheet_names
        
        print(f"Sheets in PMI1207: {pmi_sheets}")
        print(f"Sheets in Classeur3 generation: {temp_sheets}")
        
        missing = [s for s in temp_sheets if s not in pmi_sheets]
        print(f"Missing sheets to copy: {missing}")
        
        if not missing:
            print("No missing sheets found.")
            return

        # Copy original PMI1207 to new file using pandas/openpyxl
        # Using openpyxl to append sheet to the original workbook structure if possible
        # Actually it's better to copy the file with shutil, then use openpyxl to append the sheet
        import shutil
        shutil.copy2(pmi1207_path, new_pmi1207_path)
        
        with pd.ExcelWriter(new_pmi1207_path, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
            for m_sheet in missing:
                df = pd.read_excel(temp_output_path, sheet_name=m_sheet)
                df.to_excel(writer, sheet_name=m_sheet, index=False)
                print(f"Successfully copied sheet {m_sheet} to {new_pmi1207_path}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)

if __name__ == "__main__":
    recover_missing_sheet()
