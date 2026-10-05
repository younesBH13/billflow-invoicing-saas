import pandas as pd
import subprocess

def find_missing_test():
    pmi1207_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207.xlsx"
    classeur3_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\classeur3.xls"
    script_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\generate_pmi_reports.py"
    temp_output_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\temp_classeur3.xlsx"
    
    # 1. Run the script to generate temp_classeur3.xlsx
    subprocess.run(["python", script_path, classeur3_path, temp_output_path], check=True)
    
    # 2. Extract all joints (ISO_TITLE) from temp_classeur3.xlsx
    temp_sheets = pd.ExcelFile(temp_output_path).sheet_names
    gen_joints = set()
    gen_data = []
    
    for sheet in temp_sheets:
        df = pd.read_excel(temp_output_path, sheet_name=sheet)
        if 'ISO_TITLE' in df.columns:
            joints = df['ISO_TITLE'].dropna().unique()
            gen_joints.update(joints)
            for j in joints:
                # save the dataframe part for this joint
                gen_data.append((sheet, j, df[df['ISO_TITLE'] == j]))

    # 3. Extract all joints from PMI1207.xlsx
    pmi_sheets = pd.ExcelFile(pmi1207_path).sheet_names
    pmi_joints = set()
    
    for sheet in pmi_sheets:
        df = pd.read_excel(pmi1207_path, sheet_name=sheet)
        if 'ISO_TITLE' in df.columns:
            pmi_joints.update(df['ISO_TITLE'].dropna().unique())
            
    # 4. Compare
    missing_joints = gen_joints - pmi_joints
    print(f"Total joints in classeur3: {len(gen_joints)}")
    print(f"Total joints in PMI1207: {len(pmi_joints)}")
    print(f"Missing joints: {missing_joints}")
    
    # 5. Create new copy of PMI1207 and add the missing test(s) as separate sheet
    if missing_joints:
        import shutil
        new_pmi_path = r"c:\Users\GIGABYTE\Desktop\WORK\automation rapport\PMI1207_Recovered.xlsx"
        shutil.copy2(pmi1207_path, new_pmi_path)
        
        with pd.ExcelWriter(new_pmi_path, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
            for m_joint in missing_joints:
                # Find the data for this joint
                for sheet, joint_name, df_joint in gen_data:
                    if joint_name == m_joint:
                        # Add it as a separated sheet
                        # Sheet names max 31 chars
                        safe_name = str(m_joint).replace('/', '_').replace('\\', '_')[:31]
                        df_joint.to_excel(writer, sheet_name=safe_name, index=False)
                        print(f"Added missing joint {m_joint} to new sheet '{safe_name}'")
                        break
        print(f"Saved to {new_pmi_path}")
    else:
        print("No missing tests found.")

if __name__ == "__main__":
    find_missing_test()
