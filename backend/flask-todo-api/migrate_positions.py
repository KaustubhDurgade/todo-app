#!/usr/bin/env python3
"""
Migration script to add position columns to existing todos table
"""

import os
import sys
import sqlite3
from pathlib import Path

def migrate_database():
    # Get the database path
    db_path = Path(__file__).parent / 'todos.db'
    
    print(f"Migrating database at: {db_path}")
    
    if not db_path.exists():
        print("Database doesn't exist yet. No migration needed.")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if position columns already exist
        cursor.execute("PRAGMA table_info(todo)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'position_x' in columns and 'position_y' in columns:
            print("Position columns already exist. No migration needed.")
            return
        
        print("Adding position columns to todo table...")
        
        # Add new columns
        cursor.execute("ALTER TABLE todo ADD COLUMN position_x REAL")
        cursor.execute("ALTER TABLE todo ADD COLUMN position_y REAL")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Show updated table structure
        cursor.execute("PRAGMA table_info(todo)")
        columns = cursor.fetchall()
        print("\nUpdated table structure:")
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
