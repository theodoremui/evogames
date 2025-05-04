"""
Main entry point for the Social Dilemmas Simulation application

This module serves as the entry point for the Flask web application,
importing the necessary modules and providing a way to run the server directly.

@author Theodore Mui
@version 1.0.1
@date May 4, 2025
"""
from dotenv import load_dotenv, find_dotenv
from app import app  # noqa: F401
import routes  # noqa: F401

load_dotenv(find_dotenv())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
