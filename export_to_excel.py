import sqlite3
import pandas as pd
import os

DB_PATH = 'local.db'
EXPORT_PATH = 'SafetyAI_Database_Export.xlsx'

def export_db_to_excel():
    if not os.path.exists(DB_PATH):
        print(f"Error: Could not find database at {DB_PATH}")
        return

    # Connect to the SQLite database
    conn = sqlite3.connect(DB_PATH)
    
    # Get a list of all tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    
    if not tables:
        print("Database is empty or has no tables.")
        return

    print(f"Found {len(tables)} tables: {', '.join(tables)}")
    
    for table in tables:
        # We skip sqlite_sequence as it's an internal SQLite table
        if table == 'sqlite_sequence':
            continue
            
        print(f"Exporting table: {table}")
        df = pd.read_sql_query(f"SELECT * from {table}", conn)
        
        # Create a separate Excel file for this table
        export_path = f"db_{table}.xlsx"
        df.to_excel(export_path, index=False)
        print(f"Saved to {export_path}")
            
    conn.close()
    print("\nSuccessfully exported all tables to separate Excel files!")

if __name__ == "__main__":
    export_db_to_excel()
