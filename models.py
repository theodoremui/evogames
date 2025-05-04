"""
Database models for the social dilemmas simulation platform

This module defines the database schema for storing simulation configurations,
results, and related data. It provides models for:
- Configuration: Store simulation parameter settings
- SimulationResult: Store results from simulation runs
- AgentStrategy: Store agent strategy information

@author Theodore Mui
@version 1.0.1
@date May 4, 2025
"""

from datetime import datetime
from app import db
import json

class Configuration(db.Model):
    """Model for storing simulation configurations"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    game_type = db.Column(db.String(50), nullable=False)
    config_data = db.Column(db.Text, nullable=False)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Configuration {self.name}>"
    
    @property
    def formatted_date(self):
        """Return a nicely formatted date string"""
        return self.created_at.strftime("%Y-%m-%d %H:%M:%S")
    
    @property
    def config_json(self):
        """Return the config data as a Python object"""
        try:
            return json.loads(self.config_data)
        except:
            return {}

class SimulationResult(db.Model):
    """Model for storing simulation results"""
    id = db.Column(db.Integer, primary_key=True)
    # Allow nullable configuration_id for ad-hoc simulations
    configuration_id = db.Column(db.Integer, db.ForeignKey('configuration.id'), nullable=True)
    result_data = db.Column(db.Text, nullable=False)  # JSON string
    stats_summary = db.Column(db.Text, nullable=True)  # JSON string for summary statistics
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # New fields for better history tracking
    name = db.Column(db.String(100), nullable=False, default="Unnamed Simulation")
    description = db.Column(db.Text, nullable=True)
    game_type = db.Column(db.String(50), nullable=False, default="unknown")
    config_snapshot = db.Column(db.Text, nullable=True)  # Store a snapshot of the configuration at run time
    total_rounds = db.Column(db.Integer, nullable=True)
    num_agents = db.Column(db.Integer, nullable=True)
    is_complete = db.Column(db.Boolean, default=True)
    
    configuration = db.relationship('Configuration', backref=db.backref('results', lazy=True))

    def __repr__(self):
        return f"<SimulationResult {self.id}: {self.name}>"
    
    @property
    def formatted_date(self):
        """Return a nicely formatted date string"""
        return self.created_at.strftime("%Y-%m-%d %H:%M:%S")
    
    @property
    def short_description(self):
        """Return a short description for listings"""
        if self.description and len(self.description) > 100:
            return self.description[:97] + "..."
        return self.description or f"{self.game_type} simulation"
    
    @property
    def result_json(self):
        """Return the result data as a Python object"""
        try:
            return json.loads(self.result_data)
        except:
            return {}
    
    @property
    def config_json(self):
        """Return the config snapshot as a Python object"""
        try:
            return json.loads(self.config_snapshot)
        except:
            return {}
    
    @property
    def summary_json(self):
        """Return the stats summary as a Python object"""
        try:
            return json.loads(self.stats_summary)
        except:
            return {}
