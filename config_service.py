"""
Configuration Service Module

This module provides a service for loading and managing strategy descriptions
from YAML configuration files. It follows SOLID principles:

- Single Responsibility: Only handles configuration loading and formatting
- Open/Closed: Extensible for new configuration types without modification
- Liskov Substitution: Interfaces can be substituted with implementations
- Interface Segregation: Focused interfaces for specific needs
- Dependency Inversion: Depends on abstractions, not concretions

@author Theodore Mui
@version 1.0.0
@date 2025
"""

import os
import yaml
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path


class ConfigurationError(Exception):
    """Custom exception for configuration-related errors."""
    pass


class ConfigLoaderInterface(ABC):
    """Abstract interface for configuration loaders."""
    
    @abstractmethod
    def load_config(self, file_path: str) -> Dict[str, Any]:
        """Load configuration from a file."""
        pass


class YAMLConfigLoader(ConfigLoaderInterface):
    """YAML configuration loader implementation."""
    
    def load_config(self, file_path: str) -> Dict[str, Any]:
        """
        Load configuration from a YAML file.
        
        Args:
            file_path (str): Path to the YAML configuration file
            
        Returns:
            Dict[str, Any]: Loaded configuration data
            
        Raises:
            ConfigurationError: If file cannot be loaded or parsed
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return yaml.safe_load(file)
        except FileNotFoundError:
            raise ConfigurationError(f"Configuration file not found: {file_path}")
        except yaml.YAMLError as e:
            raise ConfigurationError(f"Error parsing YAML file {file_path}: {str(e)}")
        except Exception as e:
            raise ConfigurationError(f"Unexpected error loading {file_path}: {str(e)}")


class StrategyDescriptionFormatterInterface(ABC):
    """Abstract interface for strategy description formatters."""
    
    @abstractmethod
    def format_description(self, strategy_data: Dict[str, Any]) -> str:
        """Format strategy data into a description string."""
        pass


class HTMLStrategyDescriptionFormatter(StrategyDescriptionFormatterInterface):
    """HTML formatter for strategy descriptions."""
    
    def format_description(self, strategy_data: Dict[str, Any]) -> str:
        """
        Format strategy data into HTML description string.
        
        Args:
            strategy_data (Dict[str, Any]): Strategy data containing name, description, etc.
            
        Returns:
            str: Formatted HTML description
        """
        name = strategy_data.get('name', 'Unknown Strategy')
        description = strategy_data.get('description', '')
        behavior = strategy_data.get('behavior', '')
        strengths = strategy_data.get('strengths', '')
        weaknesses = strategy_data.get('weaknesses', '')
        
        html_parts = [f"<strong>{name}</strong><br>"]
        
        if description:
            html_parts.append(f"{description}<br><br>")
        
        if behavior:
            html_parts.append(f"<strong>Behavior:</strong> {behavior}<br>")
        
        if strengths:
            html_parts.append(f"<strong>Strengths:</strong> {strengths}<br>")
        
        if weaknesses:
            html_parts.append(f"<strong>Weaknesses:</strong> {weaknesses}")
        
        return "".join(html_parts).strip()


class StrategyConfigurationService:
    """
    Service for managing strategy configurations.
    
    This service handles loading strategy descriptions from configuration files
    and formatting them for use in the application.
    """
    
    def __init__(
        self, 
        config_loader: ConfigLoaderInterface,
        formatter: StrategyDescriptionFormatterInterface,
        config_dir: str = "config"
    ):
        """
        Initialize the strategy configuration service.
        
        Args:
            config_loader (ConfigLoaderInterface): Configuration loader implementation
            formatter (StrategyDescriptionFormatterInterface): Description formatter
            config_dir (str): Directory containing configuration files
        """
        self.config_loader = config_loader
        self.formatter = formatter
        self.config_dir = Path(config_dir)
        self.logger = logging.getLogger(__name__)
        self._cached_descriptions: Optional[Dict[str, str]] = None
    
    def get_strategy_descriptions(self, force_reload: bool = False) -> Dict[str, str]:
        """
        Get formatted strategy descriptions.
        
        Args:
            force_reload (bool): Whether to force reload from file (ignore cache)
            
        Returns:
            Dict[str, str]: Dictionary mapping strategy keys to formatted descriptions
            
        Raises:
            ConfigurationError: If configuration cannot be loaded
        """
        if self._cached_descriptions is None or force_reload:
            self._load_strategy_descriptions()
        
        return self._cached_descriptions.copy()
    
    def get_strategy_description(self, strategy_key: str) -> Optional[str]:
        """
        Get a single strategy description by key.
        
        Args:
            strategy_key (str): The strategy identifier
            
        Returns:
            Optional[str]: Formatted description or None if not found
        """
        descriptions = self.get_strategy_descriptions()
        return descriptions.get(strategy_key)
    
    def _load_strategy_descriptions(self) -> None:
        """Load and cache strategy descriptions from configuration file."""
        config_file = self.config_dir / "strategy_descriptions.yaml"
        
        try:
            config_data = self.config_loader.load_config(str(config_file))
            strategies = config_data.get('strategies', {})
            
            self._cached_descriptions = {}
            for strategy_key, strategy_data in strategies.items():
                formatted_desc = self.formatter.format_description(strategy_data)
                self._cached_descriptions[strategy_key] = formatted_desc
            
            self.logger.info(f"Loaded {len(self._cached_descriptions)} strategy descriptions")
            
        except ConfigurationError as e:
            self.logger.error(f"Failed to load strategy descriptions: {str(e)}")
            raise
        except Exception as e:
            error_msg = f"Unexpected error loading strategy descriptions: {str(e)}"
            self.logger.error(error_msg)
            raise ConfigurationError(error_msg)
    
    def reload_configuration(self) -> None:
        """Reload configuration from file, clearing cache."""
        self.get_strategy_descriptions(force_reload=True)


# Factory function for creating the default service instance
def create_strategy_service() -> StrategyConfigurationService:
    """
    Factory function to create a default strategy configuration service.
    
    Returns:
        StrategyConfigurationService: Configured service instance
    """
    config_loader = YAMLConfigLoader()
    formatter = HTMLStrategyDescriptionFormatter()
    return StrategyConfigurationService(config_loader, formatter)


# Global service instance (singleton pattern)
_strategy_service: Optional[StrategyConfigurationService] = None


def get_strategy_service() -> StrategyConfigurationService:
    """
    Get the global strategy configuration service instance.
    
    Returns:
        StrategyConfigurationService: The service instance
    """
    global _strategy_service
    if _strategy_service is None:
        _strategy_service = create_strategy_service()
    return _strategy_service


def get_strategy_descriptions() -> Dict[str, str]:
    """
    Convenience function to get strategy descriptions.
    
    Returns:
        Dict[str, str]: Dictionary mapping strategy keys to formatted descriptions
    """
    service = get_strategy_service()
    return service.get_strategy_descriptions() 