"""
Unit tests for the configuration service module.

This test suite provides comprehensive coverage of the configuration service
functionality, including YAML loading, strategy description formatting,
error handling, and service lifecycle management.

The tests follow best practices:
- Comprehensive coverage of all public methods
- Edge case testing
- Error condition testing
- Mock usage for external dependencies
- Clear test documentation

@author Theodore Mui
@version 1.0.0
@date 2025
"""

import unittest
import tempfile
import os
import yaml
from unittest.mock import Mock, patch, mock_open
from pathlib import Path

# Add the parent directory to sys.path to import the module
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config_service import (
    ConfigurationError,
    ConfigLoaderInterface,
    YAMLConfigLoader,
    StrategyDescriptionFormatterInterface,
    HTMLStrategyDescriptionFormatter,
    StrategyConfigurationService,
    create_strategy_service,
    get_strategy_service,
    get_strategy_descriptions
)


class TestConfigurationError(unittest.TestCase):
    """Test cases for ConfigurationError exception."""
    
    def test_configuration_error_creation(self):
        """Test that ConfigurationError can be created and raised."""
        error_message = "Test configuration error"
        error = ConfigurationError(error_message)
        
        self.assertEqual(str(error), error_message)
        self.assertIsInstance(error, Exception)
        
        # Test raising the exception
        with self.assertRaises(ConfigurationError) as context:
            raise ConfigurationError(error_message)
        
        self.assertEqual(str(context.exception), error_message)


class TestYAMLConfigLoader(unittest.TestCase):
    """Test cases for YAMLConfigLoader class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.loader = YAMLConfigLoader()
        self.test_data = {
            'strategies': {
                'test_strategy': {
                    'name': 'Test Strategy',
                    'description': 'A test strategy',
                    'behavior': 'Test behavior',
                    'strengths': 'Test strengths',
                    'weaknesses': 'Test weaknesses'
                }
            }
        }
    
    def test_load_config_success(self):
        """Test successful YAML configuration loading."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(self.test_data, f)
            temp_file = f.name
        
        try:
            result = self.loader.load_config(temp_file)
            self.assertEqual(result, self.test_data)
        finally:
            os.unlink(temp_file)
    
    def test_load_config_file_not_found(self):
        """Test ConfigurationError when file doesn't exist."""
        non_existent_file = "/path/that/does/not/exist.yaml"
        
        with self.assertRaises(ConfigurationError) as context:
            self.loader.load_config(non_existent_file)
        
        self.assertIn("Configuration file not found", str(context.exception))
        self.assertIn(non_existent_file, str(context.exception))
    
    def test_load_config_invalid_yaml(self):
        """Test ConfigurationError when YAML is malformed."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("invalid: yaml: content: [unclosed")
            temp_file = f.name
        
        try:
            with self.assertRaises(ConfigurationError) as context:
                self.loader.load_config(temp_file)
            
            self.assertIn("Error parsing YAML file", str(context.exception))
        finally:
            os.unlink(temp_file)
    
    @patch('builtins.open', side_effect=PermissionError("Permission denied"))
    def test_load_config_permission_error(self, mock_open):
        """Test ConfigurationError when file cannot be read due to permissions."""
        with self.assertRaises(ConfigurationError) as context:
            self.loader.load_config("test.yaml")
        
        self.assertIn("Unexpected error loading", str(context.exception))
        self.assertIn("Permission denied", str(context.exception))


class TestHTMLStrategyDescriptionFormatter(unittest.TestCase):
    """Test cases for HTMLStrategyDescriptionFormatter class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.formatter = HTMLStrategyDescriptionFormatter()
        self.complete_strategy_data = {
            'name': 'Test Strategy',
            'description': 'A comprehensive test strategy',
            'behavior': 'Always cooperates in tests',
            'strengths': 'Reliable and predictable',
            'weaknesses': 'May be exploited by defectors'
        }
    
    def test_format_complete_description(self):
        """Test formatting with all fields present."""
        result = self.formatter.format_description(self.complete_strategy_data)
        
        # Check that all components are present
        self.assertIn('<strong>Test Strategy</strong>', result)
        self.assertIn('A comprehensive test strategy', result)
        self.assertIn('<strong>Behavior:</strong> Always cooperates in tests', result)
        self.assertIn('<strong>Strengths:</strong> Reliable and predictable', result)
        self.assertIn('<strong>Weaknesses:</strong> May be exploited by defectors', result)
        
        # Check HTML structure
        self.assertTrue(result.startswith('<strong>Test Strategy</strong><br>'))
        self.assertTrue(result.endswith('May be exploited by defectors'))
    
    def test_format_minimal_description(self):
        """Test formatting with only name field."""
        minimal_data = {'name': 'Minimal Strategy'}
        result = self.formatter.format_description(minimal_data)
        
        self.assertEqual(result, '<strong>Minimal Strategy</strong><br>')
    
    def test_format_empty_description(self):
        """Test formatting with empty data."""
        result = self.formatter.format_description({})
        
        self.assertEqual(result, '<strong>Unknown Strategy</strong><br>')
    
    def test_format_partial_description(self):
        """Test formatting with some fields missing."""
        partial_data = {
            'name': 'Partial Strategy',
            'description': 'Only has name and description',
            'strengths': 'Has some strengths'
        }
        result = self.formatter.format_description(partial_data)
        
        self.assertIn('<strong>Partial Strategy</strong>', result)
        self.assertIn('Only has name and description', result)
        self.assertIn('<strong>Strengths:</strong> Has some strengths', result)
        self.assertNotIn('<strong>Behavior:</strong>', result)
        self.assertNotIn('<strong>Weaknesses:</strong>', result)
    
    def test_format_with_none_values(self):
        """Test formatting when some values are None."""
        data_with_none = {
            'name': 'Strategy with None',
            'description': None,
            'behavior': 'Some behavior',
            'strengths': None,
            'weaknesses': 'Some weaknesses'
        }
        result = self.formatter.format_description(data_with_none)
        
        self.assertIn('<strong>Strategy with None</strong>', result)
        self.assertIn('<strong>Behavior:</strong> Some behavior', result)
        self.assertIn('<strong>Weaknesses:</strong> Some weaknesses', result)
        self.assertNotIn('None', result)


class TestStrategyConfigurationService(unittest.TestCase):
    """Test cases for StrategyConfigurationService class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_loader = Mock(spec=ConfigLoaderInterface)
        self.mock_formatter = Mock(spec=StrategyDescriptionFormatterInterface)
        self.service = StrategyConfigurationService(
            self.mock_loader, 
            self.mock_formatter, 
            config_dir="test_config"
        )
        
        self.test_config_data = {
            'strategies': {
                'strategy1': {
                    'name': 'Strategy One',
                    'description': 'First test strategy'
                },
                'strategy2': {
                    'name': 'Strategy Two',
                    'description': 'Second test strategy'
                }
            }
        }
    
    def test_initialization(self):
        """Test service initialization."""
        self.assertEqual(self.service.config_loader, self.mock_loader)
        self.assertEqual(self.service.formatter, self.mock_formatter)
        self.assertEqual(self.service.config_dir, Path("test_config"))
        self.assertIsNone(self.service._cached_descriptions)
    
    def test_get_strategy_descriptions_first_call(self):
        """Test getting strategy descriptions on first call (loads from file)."""
        # Setup mocks
        self.mock_loader.load_config.return_value = self.test_config_data
        self.mock_formatter.format_description.side_effect = [
            "Formatted Strategy One",
            "Formatted Strategy Two"
        ]
        
        result = self.service.get_strategy_descriptions()
        
        # Verify loader was called with correct path
        expected_path = str(Path("test_config") / "strategy_descriptions.yaml")
        self.mock_loader.load_config.assert_called_once_with(expected_path)
        
        # Verify formatter was called for each strategy
        self.assertEqual(self.mock_formatter.format_description.call_count, 2)
        
        # Verify result
        expected_result = {
            'strategy1': 'Formatted Strategy One',
            'strategy2': 'Formatted Strategy Two'
        }
        self.assertEqual(result, expected_result)
    
    def test_get_strategy_descriptions_cached(self):
        """Test getting strategy descriptions from cache on subsequent calls."""
        # First call to populate cache
        self.mock_loader.load_config.return_value = self.test_config_data
        self.mock_formatter.format_description.side_effect = [
            "Formatted Strategy One",
            "Formatted Strategy Two"
        ]
        
        first_result = self.service.get_strategy_descriptions()
        
        # Reset mocks
        self.mock_loader.reset_mock()
        self.mock_formatter.reset_mock()
        
        # Second call should use cache
        second_result = self.service.get_strategy_descriptions()
        
        # Verify no additional calls to loader or formatter
        self.mock_loader.load_config.assert_not_called()
        self.mock_formatter.format_description.assert_not_called()
        
        # Results should be identical
        self.assertEqual(first_result, second_result)
    
    def test_get_strategy_descriptions_force_reload(self):
        """Test force reloading strategy descriptions."""
        # First call to populate cache
        self.mock_loader.load_config.return_value = self.test_config_data
        self.mock_formatter.format_description.side_effect = [
            "Formatted Strategy One",
            "Formatted Strategy Two"
        ]
        
        first_result = self.service.get_strategy_descriptions()
        
        # Reset mocks for second call
        self.mock_loader.reset_mock()
        self.mock_formatter.reset_mock()
        
        # Update mock data for reload
        updated_data = {
            'strategies': {
                'strategy1': {'name': 'Updated Strategy One'}
            }
        }
        self.mock_loader.load_config.return_value = updated_data
        self.mock_formatter.format_description.return_value = "Updated Formatted Strategy"
        
        # Force reload
        second_result = self.service.get_strategy_descriptions(force_reload=True)
        
        # Verify loader was called again
        self.mock_loader.load_config.assert_called_once()
        self.mock_formatter.format_description.assert_called_once()
        
        # Result should be updated
        expected_result = {'strategy1': 'Updated Formatted Strategy'}
        self.assertEqual(second_result, expected_result)
    
    def test_get_strategy_description_single(self):
        """Test getting a single strategy description."""
        # Setup cache
        self.mock_loader.load_config.return_value = self.test_config_data
        self.mock_formatter.format_description.side_effect = [
            "Formatted Strategy One",
            "Formatted Strategy Two"
        ]
        
        # Test existing strategy
        result = self.service.get_strategy_description('strategy1')
        self.assertEqual(result, 'Formatted Strategy One')
        
        # Test non-existent strategy
        result = self.service.get_strategy_description('nonexistent')
        self.assertIsNone(result)
    
    def test_reload_configuration(self):
        """Test reloading configuration."""
        # Initial load
        self.mock_loader.load_config.return_value = self.test_config_data
        self.mock_formatter.format_description.side_effect = [
            "Formatted Strategy One",
            "Formatted Strategy Two"
        ]
        
        self.service.get_strategy_descriptions()
        
        # Reset mocks
        self.mock_loader.reset_mock()
        self.mock_formatter.reset_mock()
        
        # Setup for reload
        self.mock_loader.load_config.return_value = {'strategies': {}}
        
        # Reload
        self.service.reload_configuration()
        
        # Verify reload was called
        self.mock_loader.load_config.assert_called_once()
    
    def test_load_strategy_descriptions_configuration_error(self):
        """Test handling of ConfigurationError during loading."""
        self.mock_loader.load_config.side_effect = ConfigurationError("Test error")
        
        with self.assertRaises(ConfigurationError):
            self.service.get_strategy_descriptions()
    
    def test_load_strategy_descriptions_unexpected_error(self):
        """Test handling of unexpected errors during loading."""
        self.mock_loader.load_config.side_effect = ValueError("Unexpected error")
        
        with self.assertRaises(ConfigurationError) as context:
            self.service.get_strategy_descriptions()
        
        self.assertIn("Unexpected error loading strategy descriptions", str(context.exception))
    
    def test_empty_strategies_config(self):
        """Test handling of configuration with no strategies."""
        empty_config = {'strategies': {}}
        self.mock_loader.load_config.return_value = empty_config
        
        result = self.service.get_strategy_descriptions()
        self.assertEqual(result, {})
    
    def test_missing_strategies_key(self):
        """Test handling of configuration missing strategies key."""
        config_without_strategies = {'other_data': 'value'}
        self.mock_loader.load_config.return_value = config_without_strategies
        
        result = self.service.get_strategy_descriptions()
        self.assertEqual(result, {})


class TestFactoryAndGlobalFunctions(unittest.TestCase):
    """Test cases for factory functions and global service management."""
    
    def test_create_strategy_service(self):
        """Test factory function creates service with correct components."""
        service = create_strategy_service()
        
        self.assertIsInstance(service, StrategyConfigurationService)
        self.assertIsInstance(service.config_loader, YAMLConfigLoader)
        self.assertIsInstance(service.formatter, HTMLStrategyDescriptionFormatter)
        self.assertEqual(service.config_dir, Path("config"))
    
    @patch('config_service._strategy_service', None)
    def test_get_strategy_service_singleton(self):
        """Test that get_strategy_service returns singleton instance."""
        # First call should create instance
        service1 = get_strategy_service()
        self.assertIsInstance(service1, StrategyConfigurationService)
        
        # Second call should return same instance
        service2 = get_strategy_service()
        self.assertIs(service1, service2)
    
    @patch('config_service.get_strategy_service')
    def test_get_strategy_descriptions_convenience_function(self, mock_get_service):
        """Test convenience function for getting strategy descriptions."""
        mock_service = Mock()
        mock_service.get_strategy_descriptions.return_value = {'test': 'description'}
        mock_get_service.return_value = mock_service
        
        result = get_strategy_descriptions()
        
        mock_get_service.assert_called_once()
        mock_service.get_strategy_descriptions.assert_called_once()
        self.assertEqual(result, {'test': 'description'})


class TestIntegration(unittest.TestCase):
    """Integration tests using real components."""
    
    def setUp(self):
        """Set up integration test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_file = os.path.join(self.temp_dir, "strategy_descriptions.yaml")
        
        # Create test configuration file
        test_config = {
            'strategies': {
                'test_strategy': {
                    'name': 'Integration Test Strategy',
                    'description': 'A strategy for integration testing',
                    'behavior': 'Behaves predictably in tests',
                    'strengths': 'Easy to test',
                    'weaknesses': 'Only works in tests'
                }
            }
        }
        
        with open(self.config_file, 'w') as f:
            yaml.dump(test_config, f)
    
    def tearDown(self):
        """Clean up integration test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_end_to_end_configuration_loading(self):
        """Test complete end-to-end configuration loading."""
        loader = YAMLConfigLoader()
        formatter = HTMLStrategyDescriptionFormatter()
        service = StrategyConfigurationService(loader, formatter, self.temp_dir)
        
        descriptions = service.get_strategy_descriptions()
        
        self.assertIn('test_strategy', descriptions)
        description = descriptions['test_strategy']
        
        self.assertIn('<strong>Integration Test Strategy</strong>', description)
        self.assertIn('A strategy for integration testing', description)
        self.assertIn('<strong>Behavior:</strong> Behaves predictably in tests', description)
        self.assertIn('<strong>Strengths:</strong> Easy to test', description)
        self.assertIn('<strong>Weaknesses:</strong> Only works in tests', description)
    
    def test_caching_behavior(self):
        """Test that caching works correctly in integration."""
        loader = YAMLConfigLoader()
        formatter = HTMLStrategyDescriptionFormatter()
        service = StrategyConfigurationService(loader, formatter, self.temp_dir)
        
        # First call
        descriptions1 = service.get_strategy_descriptions()
        
        # Modify file
        modified_config = {
            'strategies': {
                'modified_strategy': {
                    'name': 'Modified Strategy',
                    'description': 'This was modified'
                }
            }
        }
        
        with open(self.config_file, 'w') as f:
            yaml.dump(modified_config, f)
        
        # Second call should still return cached data
        descriptions2 = service.get_strategy_descriptions()
        self.assertEqual(descriptions1, descriptions2)
        
        # Force reload should pick up changes
        descriptions3 = service.get_strategy_descriptions(force_reload=True)
        self.assertNotEqual(descriptions1, descriptions3)
        self.assertIn('modified_strategy', descriptions3)


if __name__ == '__main__':
    unittest.main() 