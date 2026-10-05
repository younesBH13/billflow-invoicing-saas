import pandas as pd
import subprocess

def find_missing_sheet():
    pmi1207_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207.xlsx"
    temp_output_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\temp_classeur3.xlsx"
    
    temp_sheets = pd.ExcelFile(temp_output_path).sheet_names
    pmi_sheets = pd.ExcelFile(pmi1207_path).sheet_names
    
    pmi_joints = set()
    for sheet in pmi_sheets:
        df = pd.read_excel(pmi1207_path, sheet_name=sheet)
        if 'ISO_TITLE' in df.columns:
            pmi_joints.update(df['ISO_TITLE'].dropna().unique())
            
    print("Missing sheets analysis:")
    missing_sheet_name = None
    for sheet in temp_sheets:
        df = pd.read_excel(temp_output_path, sheet_name=sheet)
        if 'ISO_TITLE' in df.columns:
            joints = set(df['ISO_TITLE'].dropna().unique())
            missing = joints - pmi_joints
            if len(missing) == len(joints):
                print(f"Sheet {sheet} is completely missing! ({len(missing)} joints)")
                missing_sheet_name = sheet
            elif len(missing) > 0:
                print(f"Sheet {sheet} is partially missing. {len(missing)} out of {len(joints)} joints missing.")
                print(f"Missing: {missing}")

    if missing_sheet_name:
        import shutil
        new_pmi_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207_Recovered.xlsx"
        shutil.copy2(pmi1207_path, new_pmi_path)
        
        with pd.ExcelWriter(new_pmi_path, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
            df = pd.read_excel(temp_output_path, sheet_name=missing_sheet_name)
            df.to_excel(writer, sheet_name=missing_sheet_name, index=False)
            print(f"Successfully recovered the missing sheet '{missing_sheet_name}' into {new_pmi_path}")
                
if __name__ == "__main__":
    find_missing_sheet()
