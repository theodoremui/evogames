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
import platform
import sys

load_dotenv(find_dotenv())

def run_server():
    """Run the server using the appropriate WSGI server based on the platform."""
    if platform.system() == "Windows":
        try:
            from waitress import serve
            print("Starting Waitress server on Windows...")
            serve(app, host="0.0.0.0", port=8000)
        except ImportError:
            print("Waitress not installed. Please install it using: pip install waitress")
            sys.exit(1)
    else:
        # For Unix-based systems (Linux/Mac)
        print("Starting Flask development server...")
        app.run(host="0.0.0.0", port=8000, debug=True)

if __name__ == "__main__":
    run_server()

# This is needed for Gunicorn and Waitress when running from command line
application = app
