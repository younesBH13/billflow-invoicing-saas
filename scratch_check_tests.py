import pandas as pd

def check_missing_tests():
    pmi1207_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207.xlsx"
    temp_output_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\temp_classeur3_output.xlsx"
    
    # Load all sheets to compare
    pmi_sheets = pd.ExcelFile(pmi1207_path).sheet_names
    
    mapping = {
        'SS316_f_P1': 'F SS316',
        'SS316_f_P2': 'F SS316-2-',
        'SS316_s_P1': 'S SS316'
    }
    
    missing_tests = {}
    
    for gen_sheet, pmi_sheet in mapping.items():
        if pmi_sheet in pmi_sheets:
            df_gen = pd.read_excel(temp_output_path, sheet_name=gen_sheet)
            df_pmi = pd.read_excel(pmi1207_path, sheet_name=pmi_sheet)
            
            # Compare unique tests/joints based on ISO_TITLE or similar
            # We generated sheets with ISO_TITLE. Let's find unique ISO_TITLEs.
            if 'ISO_TITLE' in df_gen.columns and 'ISO_TITLE' in df_pmi.columns:
                gen_tests = set(df_gen['ISO_TITLE'].unique())
                pmi_tests = set(df_pmi['ISO_TITLE'].unique())
                missing = gen_tests - pmi_tests
                if missing:
                    missing_tests[gen_sheet] = missing
        else:
            print(f"Sheet {pmi_sheet} is completely missing in PMI1207.xlsx")
            missing_tests[gen_sheet] = "All missing"
            
    print("Missing tests:")
    for k, v in missing_tests.items():
        print(f"{k} -> {v}")

if __name__ == "__main__":
    check_missing_tests()
