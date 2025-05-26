#!/usr/bin/env python3
"""
Test Runner for Configuration Service

This script runs all tests related to the configuration service refactoring,
including unit tests, integration tests, and coverage reporting.

Usage:
    python tests/run_tests.py [options]

Options:
    --coverage    Run tests with coverage reporting
    --verbose     Run tests with verbose output
    --specific    Run only configuration service tests
    --all         Run all tests in the project

@author Theodore Mui
@version 1.0.0
@date 2025
"""

import sys
import os
import unittest
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def discover_config_tests():
    """Discover and return configuration service related tests."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add configuration service tests
    try:
        import tests.test_config_service
        config_tests = loader.loadTestsFromModule(tests.test_config_service)
        suite.addTests(config_tests)
        print("✓ Loaded configuration service tests")
    except ImportError as e:
        print(f"✗ Failed to load configuration service tests: {e}")
    
    # Add routes integration tests
    try:
        import tests.test_routes_integration
        routes_tests = loader.loadTestsFromModule(tests.test_routes_integration)
        suite.addTests(routes_tests)
        print("✓ Loaded routes integration tests")
    except ImportError as e:
        print(f"✗ Failed to load routes integration tests: {e}")
    
    return suite


def discover_all_tests():
    """Discover and return all tests in the project."""
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')
    return suite


def run_tests_with_coverage(test_suite, verbose=False):
    """Run tests with coverage reporting."""
    try:
        import coverage
    except ImportError:
        print("Coverage package not installed. Install with: pip install coverage")
        return run_tests_without_coverage(test_suite, verbose)
    
    # Start coverage
    cov = coverage.Coverage(source=['config_service', 'routes'])
    cov.start()
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2 if verbose else 1)
    result = runner.run(test_suite)
    
    # Stop coverage and report
    cov.stop()
    cov.save()
    
    print("\n" + "="*50)
    print("COVERAGE REPORT")
    print("="*50)
    cov.report()
    
    # Generate HTML report
    html_dir = os.path.join(os.path.dirname(__file__), '..', 'htmlcov')
    cov.html_report(directory=html_dir)
    print(f"\nHTML coverage report generated in: {html_dir}")
    
    return result


def run_tests_without_coverage(test_suite, verbose=False):
    """Run tests without coverage reporting."""
    runner = unittest.TextTestRunner(verbosity=2 if verbose else 1)
    result = runner.run(test_suite)
    return result


def print_test_summary(result):
    """Print a summary of test results."""
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped) if hasattr(result, 'skipped') else 0
    
    print(f"Total tests run: {total_tests}")
    print(f"Successes: {total_tests - failures - errors - skipped}")
    print(f"Failures: {failures}")
    print(f"Errors: {errors}")
    print(f"Skipped: {skipped}")
    
    if failures > 0:
        print("\nFAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split('AssertionError:')[-1].strip()}")
    
    if errors > 0:
        print("\nERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback.split('Exception:')[-1].strip()}")
    
    success_rate = ((total_tests - failures - errors) / total_tests * 100) if total_tests > 0 else 0
    print(f"\nSuccess rate: {success_rate:.1f}%")
    
    if success_rate == 100:
        print("🎉 All tests passed!")
    elif success_rate >= 90:
        print("✅ Most tests passed")
    elif success_rate >= 70:
        print("⚠️  Some tests failed")
    else:
        print("❌ Many tests failed")


def main():
    """Main function to run tests based on command line arguments."""
    parser = argparse.ArgumentParser(description='Run configuration service tests')
    parser.add_argument('--coverage', action='store_true', 
                       help='Run tests with coverage reporting')
    parser.add_argument('--verbose', action='store_true',
                       help='Run tests with verbose output')
    parser.add_argument('--specific', action='store_true',
                       help='Run only configuration service tests')
    parser.add_argument('--all', action='store_true',
                       help='Run all tests in the project')
    
    args = parser.parse_args()
    
    print("Configuration Service Test Runner")
    print("="*50)
    
    # Determine which tests to run
    if args.all:
        print("Running all project tests...")
        test_suite = discover_all_tests()
    else:
        print("Running configuration service tests...")
        test_suite = discover_config_tests()
    
    # Check if we have any tests
    if test_suite.countTestCases() == 0:
        print("No tests found to run!")
        return 1
    
    print(f"Found {test_suite.countTestCases()} tests to run\n")
    
    # Run tests
    if args.coverage:
        result = run_tests_with_coverage(test_suite, args.verbose)
    else:
        result = run_tests_without_coverage(test_suite, args.verbose)
    
    # Print summary
    print_test_summary(result)
    
    # Return appropriate exit code
    if result.failures or result.errors:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main()) 