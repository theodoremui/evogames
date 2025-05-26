"""
Integration tests for routes module with configuration service.

This test suite verifies that the routes module correctly integrates with
the configuration service and handles strategy descriptions properly.

@author Theodore Mui
@version 1.0.0
@date 2025
"""

import unittest
import tempfile
import os
import yaml
import sys
from unittest.mock import patch, Mock

# Add the parent directory to sys.path to import the modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import Flask app and related modules
from app import app
from config_service import ConfigurationError


class TestRoutesConfigurationIntegration(unittest.TestCase):
    """Test cases for routes integration with configuration service."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        # Create temporary config directory and file
        self.temp_dir = tempfile.mkdtemp()
        self.config_file = os.path.join(self.temp_dir, "strategy_descriptions.yaml")
        
        # Test strategy descriptions
        self.test_config = {
            'strategies': {
                'test_strategy_1': {
                    'name': 'Test Strategy One',
                    'description': 'First test strategy for routes',
                    'behavior': 'Cooperates in tests',
                    'strengths': 'Reliable testing',
                    'weaknesses': 'Only works in tests'
                },
                'test_strategy_2': {
                    'name': 'Test Strategy Two',
                    'description': 'Second test strategy for routes',
                    'behavior': 'Defects in tests',
                    'strengths': 'Predictable behavior',
                    'weaknesses': 'Not realistic'
                }
            }
        }
        
        # Write test config to file
        with open(self.config_file, 'w') as f:
            yaml.dump(self.test_config, f)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    @patch('config_service.get_strategy_service')
    def test_index_route_with_strategy_descriptions(self, mock_get_service):
        """Test that index route correctly loads and uses strategy descriptions."""
        # Mock the service to return our test descriptions
        mock_service = Mock()
        mock_service.get_strategy_descriptions.return_value = {
            'test_strategy_1': '<strong>Test Strategy One</strong><br>First test strategy for routes<br><br><strong>Behavior:</strong> Cooperates in tests<br><strong>Strengths:</strong> Reliable testing<br><strong>Weaknesses:</strong> Only works in tests',
            'test_strategy_2': '<strong>Test Strategy Two</strong><br>Second test strategy for routes<br><br><strong>Behavior:</strong> Defects in tests<br><strong>Strengths:</strong> Predictable behavior<br><strong>Weaknesses:</strong> Not realistic'
        }
        mock_get_service.return_value = mock_service
        
        # Mock other dependencies
        with patch('routes.STRATEGY_MAP', {'test_strategy_1': Mock(), 'test_strategy_2': Mock()}):
            with patch('routes.get_config_list', return_value={'success': True, 'configs': []}):
                response = self.client.get('/')
                
                # Verify response is successful
                self.assertEqual(response.status_code, 200)
                
                # Verify service was called
                mock_get_service.assert_called_once()
                mock_service.get_strategy_descriptions.assert_called_once()
    
    @patch('config_service.get_strategy_service')
    def test_index_route_handles_configuration_error(self, mock_get_service):
        """Test that index route handles configuration errors gracefully."""
        # Mock the service to raise a ConfigurationError
        mock_service = Mock()
        mock_service.get_strategy_descriptions.side_effect = ConfigurationError("Test config error")
        mock_get_service.return_value = mock_service
        
        # Mock other dependencies
        with patch('routes.STRATEGY_MAP', {'test_strategy': Mock()}):
            with patch('routes.get_config_list', return_value={'success': True, 'configs': []}):
                with patch('routes.app.logger') as mock_logger:
                    response = self.client.get('/')
                    
                    # Verify response is still successful (graceful degradation)
                    self.assertEqual(response.status_code, 200)
                    
                    # Verify error was logged
                    mock_logger.error.assert_called_once()
                    self.assertIn("Failed to load strategy descriptions", 
                                mock_logger.error.call_args[0][0])
    
    @patch('config_service.get_strategy_service')
    def test_index_route_handles_unexpected_error(self, mock_get_service):
        """Test that index route handles unexpected errors gracefully."""
        # Mock the service to raise an unexpected error
        mock_service = Mock()
        mock_service.get_strategy_descriptions.side_effect = ValueError("Unexpected error")
        mock_get_service.return_value = mock_service
        
        # Mock other dependencies
        with patch('routes.STRATEGY_MAP', {'test_strategy': Mock()}):
            with patch('routes.get_config_list', return_value={'success': True, 'configs': []}):
                with patch('routes.app.logger') as mock_logger:
                    response = self.client.get('/')
                    
                    # Verify response is still successful (graceful degradation)
                    self.assertEqual(response.status_code, 200)
                    
                    # Verify error was logged
                    mock_logger.error.assert_called_once()
                    self.assertIn("Failed to load strategy descriptions", 
                                mock_logger.error.call_args[0][0])
    
    def test_index_route_template_context(self):
        """Test that index route passes correct context to template."""
        # Mock all dependencies
        mock_strategies = ['strategy1', 'strategy2']
        mock_configs = [{'id': 1, 'name': 'Test Config'}]
        mock_descriptions = {
            'strategy1': 'Description 1',
            'strategy2': 'Description 2'
        }
        
        with patch('routes.STRATEGY_MAP', {s: Mock() for s in mock_strategies}):
            with patch('routes.get_config_list', return_value={'success': True, 'configs': mock_configs}):
                with patch('routes.get_strategy_descriptions', return_value=mock_descriptions):
                    with patch('routes.render_template') as mock_render:
                        mock_render.return_value = "Mocked template response"
                        
                        response = self.client.get('/')
                        
                        # Verify render_template was called with correct arguments
                        mock_render.assert_called_once_with(
                            'index.html',
                            strategies=mock_strategies,
                            configs=mock_configs,
                            strategy_descriptions=mock_descriptions,
                            game_types=['prisoners_dilemma', 'ultimatum_game', 'game_of_chicken']
                        )
    
    def test_configuration_service_import(self):
        """Test that configuration service is properly imported in routes."""
        # This test verifies that the import statement works correctly
        try:
            from routes import get_strategy_descriptions
            self.assertTrue(callable(get_strategy_descriptions))
        except ImportError as e:
            self.fail(f"Failed to import get_strategy_descriptions from routes: {e}")


class TestConfigurationServiceEndToEnd(unittest.TestCase):
    """End-to-end tests using real configuration service with Flask app."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        # Create temporary config directory
        self.temp_dir = tempfile.mkdtemp()
        self.config_file = os.path.join(self.temp_dir, "strategy_descriptions.yaml")
        
        # Real strategy descriptions for testing
        self.real_config = {
            'strategies': {
                'all_cooperate': {
                    'name': 'Always Cooperate',
                    'description': 'This strategy always chooses to cooperate.',
                    'behavior': 'Always plays C (cooperate).',
                    'strengths': 'Works well with other cooperators.',
                    'weaknesses': 'Vulnerable to exploitation.'
                },
                'all_defect': {
                    'name': 'Always Defect',
                    'description': 'This strategy always chooses to defect.',
                    'behavior': 'Always plays D (defect).',
                    'strengths': 'Cannot be exploited.',
                    'weaknesses': 'Performs poorly against other defectors.'
                }
            }
        }
        
        # Write real config to file
        with open(self.config_file, 'w') as f:
            yaml.dump(self.real_config, f)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    @patch('config_service.Path')
    def test_end_to_end_with_real_service(self, mock_path):
        """Test end-to-end functionality with real configuration service."""
        # Mock Path to point to our temporary directory
        mock_path.return_value = self.temp_dir
        
        # Import and use the real configuration service
        from config_service import create_strategy_service
        
        service = create_strategy_service()
        service.config_dir = self.temp_dir
        
        # Test that service loads our test configuration
        descriptions = service.get_strategy_descriptions()
        
        self.assertIn('all_cooperate', descriptions)
        self.assertIn('all_defect', descriptions)
        
        # Verify HTML formatting
        cooperate_desc = descriptions['all_cooperate']
        self.assertIn('<strong>Always Cooperate</strong>', cooperate_desc)
        self.assertIn('<strong>Behavior:</strong> Always plays C (cooperate).', cooperate_desc)
        
        defect_desc = descriptions['all_defect']
        self.assertIn('<strong>Always Defect</strong>', defect_desc)
        self.assertIn('<strong>Behavior:</strong> Always plays D (defect).', defect_desc)


if __name__ == '__main__':
    unittest.main() 