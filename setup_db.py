"""
Database setup and migration script for the Game Theory Lab application

This script:
1. Creates the necessary database tables if they don't exist
2. Updates the schema if it's outdated (e.g., missing columns)
3. Provides a method to reset the database during development

Usage:
    python setup_db.py         # Create or update tables
    python setup_db.py --reset # Reset database (WARNING: deletes all data)
    python setup_db.py --update # Update schema without resetting data

@author Theodore Mui
@version 1.0.2
@date May 4, 2025
"""

import os
import sys
import json
import logging
from datetime import datetime
import sqlite3

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("db_setup")

# Import app and models
from app import app, db
import models

def create_tables():
    """Create database tables if they don't exist"""
    logger.info("Creating database tables...")
    with app.app_context():
        # First, create all tables according to current models
        db.create_all()
        logger.info("Database tables created!")

def update_schema():
    """Update database schema with missing columns"""
    logger.info("Updating database schema with missing columns...")
    
    # Get database URI from the app config
    database_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    
    # Handle only SQLite for now
    if not database_uri.startswith("sqlite:///"):
        logger.error("Only SQLite databases are supported for schema updates")
        return
    
    # Extract the database file path from the URI
    db_path = database_uri.replace("sqlite:///", "")
    
    # Check if the path is relative (not starting with /)
    if not os.path.isabs(db_path):
        # Try both the current directory and the instance directory
        instance_path = os.path.join("instance", db_path)
        
        if os.path.exists(instance_path) and os.path.getsize(instance_path) > 0:
            db_path = instance_path
            logger.info(f"Using database in instance directory: {db_path}")
        elif os.path.exists(db_path) and os.path.getsize(db_path) > 0:
            logger.info(f"Using database in current directory: {db_path}")
        else:
            # Neither exists with data, prefer instance directory
            db_path = instance_path
            logger.info(f"Using database path: {db_path}")
    
    logger.info(f"Database path: {db_path}")
    
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if simulation_result table exists
        cursor.execute("PRAGMA table_info(simulation_result)")
        columns_info = cursor.fetchall()
        columns = {col[1] for col in columns_info}
        
        logger.info(f"Existing columns in simulation_result: {columns}")
        
        # Add missing columns
        missing_columns = {
            "name": "VARCHAR(100) DEFAULT 'Unnamed Simulation' NOT NULL",
            "description": "TEXT",
            "game_type": "VARCHAR(50) DEFAULT 'unknown' NOT NULL",
            "config_snapshot": "TEXT",
            "total_rounds": "INTEGER",
            "num_agents": "INTEGER",
            "is_complete": "BOOLEAN DEFAULT 1"
        }
        
        for col_name, col_type in missing_columns.items():
            if col_name not in columns:
                logger.info(f"Adding missing column: {col_name}")
                try:
                    cursor.execute(f"ALTER TABLE simulation_result ADD COLUMN {col_name} {col_type}")
                    conn.commit()
                    logger.info(f"Added column {col_name} successfully")
                except Exception as e:
                    logger.error(f"Error adding column {col_name}: {str(e)}")
        
        # Check for NOT NULL constraints on configuration_id
        not_null_constraints = []
        for col in columns_info:
            # col structure: (id, name, type, notnull, default_value, pk)
            col_name = col[1]
            not_null = col[3]
            if col_name == 'configuration_id' and not_null == 1:
                not_null_constraints.append(col_name)
                logger.info(f"Found NOT NULL constraint on {col_name}")
        
        # Unfortunately, SQLite doesn't support dropping NOT NULL constraints directly
        # We need to recreate the table without the constraint
        if 'configuration_id' in not_null_constraints:
            logger.info("Preparing to fix NOT NULL constraint on configuration_id...")
            
            # Get all column definitions
            cursor.execute("PRAGMA table_info(simulation_result)")
            all_columns = cursor.fetchall()
            
            # Generate column list for the new table
            column_defs = []
            column_names = []
            for col in all_columns:
                col_id, col_name, col_type, not_null, default_val, is_pk = col
                
                # Make configuration_id nullable
                if col_name == 'configuration_id':
                    not_null = 0
                
                # Build the column definition
                col_def = f"{col_name} {col_type}"
                
                if is_pk:
                    col_def += " PRIMARY KEY"
                
                if not_null and col_name != 'configuration_id':
                    col_def += " NOT NULL"
                    
                if default_val is not None:
                    col_def += f" DEFAULT {default_val}"
                    
                column_defs.append(col_def)
                column_names.append(col_name)
            
            # Generate SQL to create a new table
            create_temp_table = f"""
            CREATE TABLE simulation_result_new (
                {", ".join(column_defs)}
            )
            """
            
            # Copy data from old table to new
            copy_data = f"""
            INSERT INTO simulation_result_new 
            SELECT {", ".join(column_names)} FROM simulation_result
            """
            
            # Drop old table and rename new one
            try:
                logger.info("Creating temporary table with correct constraints...")
                cursor.execute(create_temp_table)
                
                logger.info("Copying data to new table...")
                cursor.execute(copy_data)
                
                logger.info("Dropping old table...")
                cursor.execute("DROP TABLE simulation_result")
                
                logger.info("Renaming new table...")
                cursor.execute("ALTER TABLE simulation_result_new RENAME TO simulation_result")
                
                conn.commit()
                logger.info("Successfully updated configuration_id to be nullable")
            except Exception as e:
                conn.rollback()
                logger.error(f"Error updating configuration_id constraint: {str(e)}")
        
        logger.info("Schema update completed successfully")
    
    except Exception as e:
        logger.error(f"Error updating schema: {str(e)}")
    
    finally:
        conn.close()

def inspect_tables():
    """Inspect current database schema"""
    from sqlalchemy import inspect
    
    logger.info("Inspecting database tables...")
    with app.app_context():
        inspector = inspect(db.engine)
        for table_name in sorted(inspector.get_table_names()):
            print(f"\nTable: {table_name}")
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append(f"  - {column['name']}: {column['type']}")
            
            print("\n".join(sorted(columns)))

def reset_database():
    """Reset the database (delete all tables and recreate them)"""
    logger.warning("RESETTING DATABASE - This will delete all data!")
    
    with app.app_context():
        # Drop all tables
        db.drop_all()
        logger.info("All tables dropped.")
        
        # Recreate tables
        db.create_all()
        logger.info("Tables recreated.")
        
        # Create sample data if needed
        # create_sample_data()
        
        logger.info("Database reset complete!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--reset":
            # Confirm reset with user
            confirm = input("Are you sure you want to reset the database? This will delete all data! (y/N): ")
            if confirm.lower() == 'y':
                reset_database()
            else:
                logger.info("Reset cancelled.")
        elif sys.argv[1] == "--update":
            # Update schema without resetting data
            update_schema()
    else:
        # Default: create tables and show schema
        create_tables()
        inspect_tables()