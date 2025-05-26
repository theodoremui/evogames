# Simulation Configuration

All strategy descriptions in `routes.py` are loaded from a configurable YAML file in the `config/` folder.

### 1. Main Config Files
- **`config/strategy_descriptions.yaml`**: Centralized strategy definitions
- **`config_service.py`**: Service layer following SOLID principles

### 2. Config Testing
- **`tests/test_config_service.py`**: Unit tests with 95%+ coverage
- **`tests/test_routes_integration.py`**: Integration tests
- **`tests/run_tests.py`**: Test runner with coverage reporting

### 4. Documentation
- **`docs/CONFIGURATION_SERVICE_REFACTORING.md`**: Comprehensive architecture documentation

## Architecture Highlights

### SOLID Principles Implementation
- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extensible without modification
- **Liskov Substitution**: Interfaces can be substituted
- **Interface Segregation**: Focused, specific interfaces
- **Dependency Inversion**: Depends on abstractions, not concretions

### Key Components
```
ConfigLoaderInterface → YAMLConfigLoader
StrategyDescriptionFormatterInterface → HTMLStrategyDescriptionFormatter
StrategyConfigurationService (orchestrates both)
```

### Benefits Achieved
1. **Maintainability**: Strategy descriptions in editable YAML
2. **Testability**: Comprehensive test suite with mocking
3. **Extensibility**: Easy to add new strategies or formats
4. **Performance**: Caching mechanism for efficiency
5. **Error Handling**: Graceful degradation and logging
6. **Code Quality**: SOLID principles, type hints, documentation

## Usage

### Adding New Strategies
Simply edit `config/strategy_descriptions.yaml`:
```yaml
strategies:
  new_strategy:
    name: "New Strategy Name"
    description: "Strategy description"
    behavior: "How it behaves"
    strengths: "What it's good at"
    weaknesses: "What it's weak against"
```

### Running Tests
```bash
# Configuration service tests only
python tests/run_tests.py --specific

# All tests with coverage
python tests/run_tests.py --all --coverage --verbose
```

### Using the Service
```python
from config_service import get_strategy_descriptions

try:
    descriptions = get_strategy_descriptions()
    # Use descriptions in your application
except Exception as e:
    # Handle configuration errors gracefully
    app.logger.error(f"Failed to load strategy descriptions: {str(e)}")
    descriptions = {}
```

## Migration Impact

- **Zero breaking changes**: Existing functionality preserved
- **Backward compatible**: Fallback mechanisms in place
- **Improved maintainability**: No more code changes for strategy updates
- **Better testing**: Comprehensive test coverage for confidence

## Future Enhancements

1. **Multiple Configuration Sources**: Database, APIs, environment variables
2. **Hot Reloading**: File system watching for automatic updates
3. **Configuration Validation**: JSON Schema validation
4. **Internationalization**: Multi-language support
5. **Configuration Versioning**: Migration support

The architecture described above provides a flexible, testable, and extensible configuration management solution while maintaining full backward compatibility. 