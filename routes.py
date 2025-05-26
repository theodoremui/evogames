"""
Routes and view handlers for the social dilemmas simulation platform

This module defines all the route handlers for the web application, including:
- Main page and navigation
- Simulation creation and configuration
- Results visualization and history
- API endpoints for AJAX operations

@author Theodore Mui
@version 1.0.1
@date May 4, 2025
"""

from flask import render_template, request, jsonify, redirect, url_for, flash, session
import json
import os
import time
import logging
import traceback
from app import app, db
from models import Configuration, SimulationResult

# Set up a file logger for debugging the Game Theory Lab issues
debug_logger = logging.getLogger('game_theory_debug')
debug_logger.setLevel(logging.DEBUG)

# Create file handler
try:
    os.makedirs('logs', exist_ok=True)
    debug_file = logging.FileHandler('logs/debug.log')
    debug_file.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    debug_file.setFormatter(formatter)
    
    # Add handlers to logger
    debug_logger.addHandler(debug_file)
    
    debug_logger.info("Debug logger initialized")
except Exception as e:
    print(f"Failed to set up debug logger: {e}")
from simulation import SimulationFactory, STRATEGY_MAP
from social_dilemmas import SocialDilemmaFactory
from utils import (
    save_config, load_config, get_config_list, 
    save_results, load_results, get_results_list,
    validate_config
)
from config_service import get_strategy_descriptions

@app.route('/')
def index():
    """Render the main page"""
    # Get a list of available strategies
    strategies = list(STRATEGY_MAP.keys())
    
    # Get a list of saved configurations
    configs_response = get_config_list()
    configs = configs_response.get('configs', []) if configs_response.get('success', False) else []
    
    # Load strategy descriptions from configuration
    try:
        strategy_descriptions = get_strategy_descriptions()
    except Exception as e:
        # Log the error and provide fallback
        app.logger.error(f"Failed to load strategy descriptions: {str(e)}")
        strategy_descriptions = {}
    
    return render_template('index.html', 
                          strategies=strategies, 
                          configs=configs,
                          strategy_descriptions=strategy_descriptions,
                          game_types=['prisoners_dilemma', 'ultimatum_game', 'game_of_chicken'])

@app.route('/about')
def about():
    """Render the about page with information about game theory"""
    return render_template('about.html')

@app.route('/social-dilemmas')
def social_dilemmas():
    """Render the social dilemmas simulation page"""
    # Check if a specific dilemma was requested
    dilemma_type = request.args.get('dilemma', None)
    
    # Check if there are simulation results in the session
    simulation_results = None
    simulation_config = None
    
    if 'simulation_results' in session and 'simulation_config' in session:
        simulation_results = session.get('simulation_results')
        simulation_config = session.get('simulation_config')
        
        # Create a combined object for the frontend
        results_data = {
            'results': simulation_results,
            'config': simulation_config
        }
        
        # Save in session for advanced charts page
        session['advanced_charts_data'] = results_data
        
        # Store as permanent session data for the advanced charts page
        # but don't clear it yet to allow for a more reliable experience
        
        return render_template('social_dilemmas.html', 
                           dilemma_type=dilemma_type, 
                           simulation_results=results_data)
    
    # Default return for normal page load (no simulation results)
    return render_template('social_dilemmas.html', dilemma_type=dilemma_type)
    
@app.route('/api/save-session-data', methods=['POST'])
def save_session_data():
    """API endpoint to save data in session"""
    data = request.json
    
    if 'advanced_charts_data' in data:
        session['advanced_charts_data'] = data['advanced_charts_data']
        return jsonify({'success': True, 'message': 'Session data saved'})
    
    return jsonify({'success': False, 'error': 'No data provided'})

@app.route('/api/get-session-data', methods=['GET'])
def get_session_data():
    """API endpoint to retrieve data from session"""
    # Return any simulation data we have in the session
    result = {
        'success': True,
        'advanced_charts_data': session.get('advanced_charts_data')
    }
    
    # If we don't have advanced_charts_data but have simulation results and config, 
    # construct it from those
    if not result['advanced_charts_data'] and 'simulation_results' in session and 'simulation_config' in session:
        result['advanced_charts_data'] = {
            'results': session.get('simulation_results'),
            'config': session.get('simulation_config')
        }
        # Save for future use
        session['advanced_charts_data'] = result['advanced_charts_data']
    
    return jsonify(result)

@app.route('/advanced-charts', methods=['GET', 'POST'])
def advanced_charts():
    """Redirect to simulation history or detail page"""
    # If a specific simulation is requested
    simulation_id = request.args.get('id') or session.get('simulation_id')
    
    if simulation_id:
        # Redirect to the specific simulation detail page
        return redirect(url_for('view_simulation', simulation_id=simulation_id, _anchor='advanced-charts'))
    
    # Otherwise redirect to simulation history
    return redirect(url_for('simulation_history'))

@app.route('/simulation-history')
def simulation_history():
    """Display history of all simulations"""
    # Get filter parameters
    filter_type = request.args.get('type')
    sort_order = request.args.get('sort', 'newest')
    search_term = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    per_page = 10  # Number of simulations per page
    
    # Build the query
    query = SimulationResult.query
    
    # Apply filters
    if filter_type:
        query = query.filter(SimulationResult.game_type == filter_type)
    
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.filter(
            db.or_(
                SimulationResult.name.like(search_pattern),
                SimulationResult.description.like(search_pattern)
            )
        )
    
    # Apply sorting
    if sort_order == 'newest':
        query = query.order_by(SimulationResult.created_at.desc())
    elif sort_order == 'oldest':
        query = query.order_by(SimulationResult.created_at.asc())
    elif sort_order == 'name':
        query = query.order_by(SimulationResult.name.asc())
    
    # Paginate results
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    simulations = pagination.items
    total_pages = pagination.pages
    
    # Log the query results
    app.logger.info(f"Found {len(simulations)} simulations (page {page}/{total_pages})")
    
    return render_template('simulation_history.html', 
                          simulations=simulations, 
                          page=page, 
                          total_pages=total_pages,
                          request=request)

@app.route('/simulation/<int:simulation_id>')
def view_simulation(simulation_id):
    """Display a specific simulation result"""
    simulation = SimulationResult.query.get_or_404(simulation_id)
    
    # Store this simulation ID in the session for the advanced charts page
    session['simulation_id'] = simulation_id
    
    # Store the data for use in other pages
    session['advanced_charts_data'] = {
        'results': simulation.result_json,
        'config': simulation.config_json
    }
    
    app.logger.info(f"Viewing simulation {simulation_id}: {simulation.name}")
    
    # Use different templates based on game type
    game_type = simulation.game_type
    
    # Game Theory Lab simulations (Prisoner's Dilemma, Game of Chicken, etc.)
    if game_type in ['prisoners_dilemma', 'game_of_chicken', 'ultimatum_game']:
        return render_template('game_theory_simulation_view.html', simulation=simulation)
    # Social Dilemmas simulations (Tragedy of Commons, etc.)
    else:
        return render_template('simulation_view.html', simulation=simulation)

@app.route('/real-world-examples')
def real_world_examples():
    """Render the real-world examples page with visualizations"""
    return render_template('real_world_examples.html')

@app.route('/api/config', methods=['POST'])
def create_config():
    """Create a new configuration"""
    data = request.json
    
    # Validate configuration
    validation = validate_config(data)
    if not validation['valid']:
        return jsonify({'success': False, 'error': validation['error']}), 400
    
    # Save to database
    config = Configuration(
        name=data['name'],
        description=data.get('description', ''),
        game_type=data['game_type'],
        config_data=json.dumps(data)
    )
    
    try:
        db.session.add(config)
        db.session.commit()
        
        print(f"DEBUG: About to call save_config for config ID {config.id}")
        
        # Also save to file
        result = save_config(data, f"config_{config.id}.json")
        
        print(f"DEBUG: save_config returned: {result}")
        
        if not result['success']:
            print(f"DEBUG: save_config failed with error: {result['error']}")
            return jsonify({'success': False, 'error': result['error']}), 500
        
        print(f"DEBUG: save_config succeeded, returning success response")
        return jsonify({'success': True, 'config_id': config.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config/<int:config_id>', methods=['GET'])
def get_config(config_id):
    """Get a configuration by ID"""
    config = Configuration.query.get(config_id)
    
    if not config:
        return jsonify({'success': False, 'error': 'Configuration not found'}), 404
    
    return jsonify({
        'success': True,
        'config': {
            'id': config.id,
            'name': config.name,
            'description': config.description,
            'game_type': config.game_type,
            'data': json.loads(config.config_data),
            'created_at': config.created_at.isoformat()
        }
    })

@app.route('/api/config/<int:config_id>', methods=['PUT'])
def update_config(config_id):
    """Update an existing configuration"""
    config = Configuration.query.get(config_id)
    
    if not config:
        return jsonify({'success': False, 'error': 'Configuration not found'}), 404
    
    data = request.json
    
    # Validate configuration
    validation = validate_config(data)
    if not validation['valid']:
        return jsonify({'success': False, 'error': validation['error']}), 400
    
    try:
        config.name = data['name']
        config.description = data.get('description', '')
        config.game_type = data['game_type']
        config.config_data = json.dumps(data)
        
        db.session.commit()
        
        # Also update file
        result = save_config(data, f"config_{config.id}.json")
        if not result['success']:
            return jsonify({'success': False, 'error': result['error']}), 500
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/configs', methods=['GET'])
def list_configs():
    """List all saved configurations"""
    configs = Configuration.query.all()
    
    return jsonify({
        'success': True,
        'configs': [{
            'id': config.id,
            'name': config.name,
            'game_type': config.game_type,
            'created_at': config.created_at.isoformat()
        } for config in configs]
    })

@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    """Run a simulation with the provided configuration"""
    # Add detailed logging for debugging
    debug_logger.info("======= NEW GAME THEORY LAB SIMULATION REQUEST =======")
    debug_logger.info("Received simulation request at /api/simulate")
    
    try:
        data = request.json
        debug_logger.info(f"Request data: {json.dumps(data, indent=2)}")
    except Exception as e:
        debug_logger.error(f"Error parsing JSON request: {str(e)}")
        debug_logger.error(traceback.format_exc())
        return jsonify({'success': False, 'error': f'Invalid request data: {str(e)}'}), 400
    
    # Check if using saved config or new config
    if 'config_id' in data:
        debug_logger.info(f"Using saved configuration: {data['config_id']}")
        config = Configuration.query.get(data['config_id'])
        if not config:
            debug_logger.error(f"Configuration not found: {data['config_id']}")
            return jsonify({'success': False, 'error': 'Configuration not found'}), 404
        
        config_data = json.loads(config.config_data)
        debug_logger.info(f"Loaded configuration data: {json.dumps(config_data, indent=2)}")
    else:
        debug_logger.info("Using new configuration from request")
        config_data = data.get('config')
        if not config_data:
            debug_logger.error("No configuration data provided")
            return jsonify({'success': False, 'error': 'No configuration data provided'}), 400
        
        # Validate configuration
        debug_logger.info("Validating configuration")
        validation = validate_config(config_data)
        if not validation['valid']:
            debug_logger.error(f"Configuration validation failed: {validation['error']}")
            return jsonify({'success': False, 'error': validation['error']}), 400
    
    # Get number of rounds
    rounds = data.get('rounds', config_data.get('rounds', 1))
    debug_logger.info(f"Running simulation for {rounds} rounds")
    
    # Check that the game type is valid
    game_type = config_data.get('game_type', 'prisoners_dilemma')
    debug_logger.info(f"Game type: {game_type}")
    
    # Validate strategies
    strategies = config_data.get('strategies', {})
    debug_logger.info(f"Strategies: {json.dumps(strategies, indent=2)}")
    
    if not strategies:
        debug_logger.error("No strategies specified")
        return jsonify({'success': False, 'error': 'At least one strategy must be specified'}), 400
    
    # Make sure we have at least one agent
    total_agents = 0
    for strategy, num_agents in strategies.items():
        try:
            agent_count = int(num_agents)
            if agent_count < 0:
                debug_logger.error(f"Invalid agent count for {strategy}: {num_agents} (negative)")
                return jsonify({'success': False, 'error': f'Invalid agent count for {strategy}: {num_agents}. Must be ≥ 0.'}), 400
            total_agents += agent_count
            debug_logger.info(f"Strategy {strategy}: {agent_count} agents")
        except (ValueError, TypeError):
            debug_logger.error(f"Invalid agent count for {strategy}: {num_agents} (not a number)")
            return jsonify({'success': False, 'error': f'Invalid agent count for {strategy}: {num_agents}. Must be an integer.'}), 400
    
    if total_agents <= 0:
        debug_logger.error("No agents specified (total is zero)")
        return jsonify({'success': False, 'error': 'At least one agent must be specified'}), 400
    
    try:
        # Import check for diagnostic purposes
        try:
            import importlib
            import sys
            
            debug_logger.info("Checking imports for diagnostic purposes")
            # Check what modules are loaded
            if 'simulation' in sys.modules:
                debug_logger.info("simulation module is imported")
                from simulation import SimulationFactory as sf_check
                debug_logger.info(f"SimulationFactory from simulation found: {sf_check}")
            else:
                debug_logger.error("simulation module not imported")
        except Exception as e:
            debug_logger.error(f"Error checking imports: {str(e)}")
            debug_logger.error(traceback.format_exc())
            # Continue anyway, this is just a diagnostic check
        
        # Create and run simulation
        debug_logger.info("Creating simulation with SimulationFactory.create_simulation()")
        try:
            simulation = SimulationFactory.create_simulation(config_data)
            debug_logger.info(f"Simulation created successfully: {type(simulation).__name__}")
            
            debug_logger.info(f"Running simulation for {rounds} rounds")
            results = simulation.run_simulation(rounds=rounds)
            debug_logger.info("Simulation completed successfully")
        except Exception as sim_error:
            debug_logger.error(f"Error in simulation creation/execution: {str(sim_error)}")
            debug_logger.error(traceback.format_exc())
            raise  # Re-raise to be caught by outer exception handler
        
        # Save results to database and file
        debug_logger.info("Saving simulation results to database")
        
        # Create new database record
        result_obj = SimulationResult(
            name=config_data.get('name', 'Game Theory Simulation'),
            description=config_data.get('description', ''),
            game_type=config_data.get('game_type', 'prisoners_dilemma'),
            config_snapshot=json.dumps(config_data),
            total_rounds=rounds,
            num_agents=total_agents,
            result_data=json.dumps(results),
            stats_summary=json.dumps(results['strategy_performance']) if 'strategy_performance' in results else None
        )
        
        # If using a saved configuration, link it
        if 'config_id' in data:
            result_obj.configuration_id = data['config_id']
            debug_logger.info(f"Linked to configuration ID: {data['config_id']}")
            
            # Also save to file with config ID
            debug_logger.info("Saving results to file")
            save_results(results, config_id=data['config_id'])
        else:
            debug_logger.info("Saving results to file (no config ID)")
            save_results(results)
        
        # Save to database
        db.session.add(result_obj)
        db.session.commit()
        debug_logger.info(f"Results saved to database with ID: {result_obj.id}")
        
        # Store simulation ID in session for later reference
        session['simulation_id'] = result_obj.id
        session['simulation_results'] = results
        session['simulation_config'] = config_data
        
        debug_logger.info("Returning successful response")
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        debug_logger.error(f"Error running simulation: {str(e)}")
        debug_logger.error(traceback.format_exc())
        
        # Include both the error message and the type in the response
        error_type = type(e).__name__
        error_msg = f"{error_type}: {str(e)}"
        
        return jsonify({'success': False, 'error': error_msg, 'traceback': traceback.format_exc()}), 500

@app.route('/api/results/<int:config_id>', methods=['GET'])
def get_results(config_id):
    """Get results for a specific configuration"""
    results = SimulationResult.query.filter_by(configuration_id=config_id).all()
    
    if not results:
        return jsonify({'success': False, 'error': 'No results found for this configuration'}), 404
    
    return jsonify({
        'success': True,
        'results': [{
            'id': result.id,
            'created_at': result.created_at.isoformat(),
            'data': json.loads(result.result_data),
            'summary': json.loads(result.stats_summary)
        } for result in results]
    })

@app.route('/api/social-dilemma/config', methods=['POST'])
def create_social_dilemma_config():
    """Create a new social dilemma configuration"""
    data = request.json
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'success': False, 'error': 'Configuration name is required'}), 400
    
    if not data.get('dilemma_type'):
        return jsonify({'success': False, 'error': 'Dilemma type is required'}), 400
    
    if not data.get('strategies') or not isinstance(data['strategies'], dict):
        return jsonify({'success': False, 'error': 'At least one strategy must be specified'}), 400
    
    # Save to file
    filename = f"social_dilemma_{data['dilemma_type']}_{int(time.time())}.json"
    try:
        # Ensure directory exists
        os.makedirs('data', exist_ok=True)
        
        # Save to file
        with open(os.path.join('data', filename), 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({'success': True, 'filename': filename}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/social-dilemma/simulate', methods=['POST'])
def run_social_dilemma_simulation():
    """Run a social dilemma simulation with the provided configuration"""
    # Log that we received the request for debugging
    app.logger.info("Received social dilemma simulation request")
    debug_logger.info("======= NEW SOCIAL DILEMMA SIMULATION REQUEST =======")
    
    # Support both JSON and form data
    if request.is_json:
        debug_logger.info("Processing JSON request")
        try:
            data = request.json
            debug_logger.info(f"Request JSON: {json.dumps(data, indent=2)}")
            
            if not data:
                debug_logger.error("Empty JSON data received")
                return jsonify({'success': False, 'error': 'Empty request data'}), 400
                
            if not data.get('config'):
                debug_logger.error("Missing 'config' field in JSON data")
                return jsonify({'success': False, 'error': 'Configuration is required'}), 400
                
            config_data = data['config']
            debug_logger.info(f"Extracted config data, dilemma type: {config_data.get('dilemma_type', 'unknown')}")
        except Exception as e:
            debug_logger.error(f"Error parsing JSON request: {str(e)}")
            debug_logger.error(traceback.format_exc())
            return jsonify({'success': False, 'error': f'Invalid JSON request: {str(e)}'}), 400
    else:
        # Handle form data
        debug_logger.info("Processing form data request")
        config_json = request.form.get('config')
        if not config_json:
            debug_logger.error("Missing 'config' field in form data")
            return jsonify({'success': False, 'error': 'Configuration is required'}), 400
        try:
            config_data = json.loads(config_json)
            debug_logger.info(f"Successfully parsed config JSON from form data")
        except Exception as e:
            debug_logger.error(f"Error parsing JSON from form data: {str(e)}")
            debug_logger.error(traceback.format_exc())
            return jsonify({'success': False, 'error': f'Invalid JSON in config: {str(e)}'}), 400
    
    # Get number of rounds
    rounds = config_data.get('rounds', 50)
    
    # Enhance logging for debugging
    debug_logger.info(f"Configuration Details:")
    debug_logger.info(f"- Dilemma Type: {config_data.get('dilemma_type', 'unknown')}")
    debug_logger.info(f"- Rounds: {rounds}")
    if 'parameters' in config_data:
        debug_logger.info(f"- Parameters: {json.dumps(config_data['parameters'], indent=2)}")
    if 'strategies' in config_data:
        debug_logger.info(f"- Strategies: {json.dumps(config_data['strategies'], indent=2)}")
    
    try:
        # Validate parameters
        if 'parameters' not in config_data:
            debug_logger.warning("No parameters found in configuration, using defaults")
            config_data['parameters'] = {}
            
        # Check if regeneration_rate is reasonably formatted (should be a percentage)
        if 'parameters' in config_data and 'regeneration_rate' in config_data['parameters']:
            regen_rate = config_data['parameters']['regeneration_rate']
            debug_logger.info(f"Regeneration rate from config: {regen_rate}")
            
            # Make sure it's a number
            try:
                regen_rate = float(regen_rate)
                # Store it back as a number
                config_data['parameters']['regeneration_rate'] = regen_rate
                debug_logger.info(f"Converted regeneration rate to number: {regen_rate}")
            except (ValueError, TypeError):
                debug_logger.error(f"Invalid regeneration rate value: {regen_rate}")
                return jsonify({'success': False, 'error': f'Invalid regeneration rate value: {regen_rate}. Must be a number.'}), 400
        
        # Validate strategies
        if 'strategies' not in config_data or not config_data['strategies']:
            debug_logger.error("No strategies specified in configuration")
            return jsonify({'success': False, 'error': 'At least one strategy must be specified'}), 400
            
        # Make sure we have at least one agent
        total_agents = 0
        for strategy, count in config_data.get('strategies', {}).items():
            try:
                agent_count = int(count)
                if agent_count < 0:
                    debug_logger.error(f"Invalid agent count for {strategy}: {count} (negative)")
                    return jsonify({'success': False, 'error': f'Invalid agent count for {strategy}: {count}. Must be ≥ 0.'}), 400
                total_agents += agent_count
                debug_logger.info(f"Strategy {strategy}: {agent_count} agents")
            except (ValueError, TypeError):
                debug_logger.error(f"Invalid agent count for {strategy}: {count} (not a number)")
                return jsonify({'success': False, 'error': f'Invalid agent count for {strategy}: {count}. Must be an integer.'}), 400
                
        if total_agents <= 0:
            debug_logger.error("No agents specified (total is zero)")
            return jsonify({'success': False, 'error': 'At least one agent must be specified'}), 400
        
        debug_logger.info(f"Creating simulation for dilemma type: {config_data.get('dilemma_type', 'unknown')}")
        
        # Add error detection for import issues
        try:
            import importlib
            import sys
            
            # Check if numpy is imported correctly
            if 'numpy' in sys.modules:
                debug_logger.info("NumPy module is imported successfully")
            else:
                debug_logger.warning("NumPy module is not imported yet")
                
            # Try to import explicitly
            try:
                import numpy
                debug_logger.info(f"NumPy version: {numpy.__version__}")
            except ImportError as e:
                debug_logger.error(f"Failed to import NumPy: {str(e)}")
                debug_logger.error(traceback.format_exc())
        except Exception as e:
            debug_logger.error(f"Error checking module imports: {str(e)}")
            debug_logger.error(traceback.format_exc())
        
        # Create and run simulation with enhanced error handling
        try:
            debug_logger.info("Creating simulation with SocialDilemmaFactory.create_simulation()")
            simulation = SocialDilemmaFactory.create_simulation(config_data)
            debug_logger.info(f"Simulation created successfully: {type(simulation).__name__}")
            
            debug_logger.info(f"Running simulation for {rounds} rounds")
            results = simulation.run_simulation(rounds=rounds)
            debug_logger.info(f"Simulation completed successfully")
        except Exception as sim_error:
            debug_logger.error(f"Error in simulation execution: {str(sim_error)}")
            debug_logger.error(traceback.format_exc())
            # Re-raise to be caught by the outer exception handler
            raise

        # Create new database record
        simulation_result = SimulationResult(
            name=config_data.get('name', 'Unnamed Simulation'),
            description=config_data.get('description', ''),
            game_type=config_data.get('dilemma_type', 'unknown'),
            config_snapshot=json.dumps(config_data),
            total_rounds=rounds,
            num_agents=total_agents,
            result_data=json.dumps(results),
            stats_summary=json.dumps(results.get('strategy_performance', {})) if results else None
        )
        
        # If there's a saved configuration, link it
        if 'config_id' in config_data:
            simulation_result.configuration_id = config_data['config_id']
        
        # Save to database
        db.session.add(simulation_result)
        db.session.commit()
        
        # Also save results to file (legacy support)
        filename = f"social_dilemma_results_{config_data['dilemma_type']}_{int(time.time())}.json"
        os.makedirs('data', exist_ok=True)
        with open(os.path.join('data', filename), 'w') as f:
            json.dump(results, f, indent=2)
        
        # Log the successful save
        app.logger.info(f"Simulation saved to database (ID: {simulation_result.id}) and file ({filename})")
        
        # Store the simulation result ID for reference
        result_id = simulation_result.id
        
        # Store the simulation ID in the session for use by other pages
        session['simulation_id'] = result_id
        app.logger.info(f"Stored simulation ID {result_id} in session")
        
        # Check if request wants JSON or redirect
        if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': True, 
                'results': results, 
                'filename': filename,
                'simulation_id': result_id
            })
        else:
            # For form submissions, redirect to a results page with the data in session
            session['simulation_results'] = results
            session['simulation_config'] = config_data
            session['simulation_id'] = result_id
            # Flash a success message
            flash('Simulation completed successfully! Results saved to database.', 'success')
            return redirect(url_for('social_dilemmas', _anchor='results'))
    except Exception as e:
        # Capture full error details
        app.logger.error(f"Error running simulation: {str(e)}")
        
        import traceback
        error_trace = traceback.format_exc()
        app.logger.error(f"Traceback: {error_trace}")
        
        # Include both the error message and the type in the response
        error_type = type(e).__name__
        error_msg = f"{error_type}: {str(e)}"
        
        if request.is_json or request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': False, 'error': error_msg, 'traceback': error_trace}), 500
        else:
            # For form submissions, redirect back with an error
            flash(f'Error running simulation: {error_msg}', 'danger')
            return redirect(url_for('social_dilemmas'))
