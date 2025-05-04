"""
Main entry point for the Social Dilemmas Simulation application

This module serves as the entry point for the Flask web application,
importing the necessary modules and providing a way to run the server directly.

@author Theodore Mui
@version 1.0.1
@date May 4, 2025
"""

import os
import logging

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-dev-secret-key")

# Configure database for storing simulation results
# Default to SQLite if no DATABASE_URL is provided
database_url = os.environ.get("DATABASE_URL", "sqlite:///simulation.db")

# If using PostgreSQL URL but want to force SQLite
if database_url.startswith("postgresql://"):
    # Converting to SQLite - this creates a file in the current directory
    database_url = "sqlite:///simulation.db"
    print("Notice: Converting PostgreSQL URL to SQLite for local development")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Create data directory if it doesn't exist
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

with app.app_context():
    # Import models here so their tables are created
    import models  # noqa: F401
    db.create_all()
