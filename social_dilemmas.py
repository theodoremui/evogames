"""
Social Dilemmas Simulation Module

This module implements various social dilemmas using agent-based modeling.
Each dilemma has a specific set of rules, strategies, and outcomes.

Included dilemmas:
- Tragedy of the Commons
- Free Rider Problem
- Public Goods Dilemma

Each simulation follows a similar structure but with domain-specific logic.
All simulations track detailed round-by-round data for visualization, including:
- Resource levels/pool sizes over time
- Strategy-specific harvests/contributions per round
- Agent performance metrics by strategy

@author Theodore Mui
@version 1.0.1
@date May 4, 2025
"""

import random
import logging
import traceback
import json
import math

# Handle potential missing numpy dependency
try:
    import numpy as np
except ImportError:
    # Create a simple numpy replacement for basic functionality
    class NumpyReplacement:
        def random(self, size=None):
            if size is None:
                return random.random()
            elif isinstance(size, int):
                return [random.random() for _ in range(size)]
            else:
                return [[random.random() for _ in range(size[1])] for _ in range(size[0])]
                
    np = NumpyReplacement()
    
from abc import ABC, abstractmethod

# Base class for all social dilemma simulations
class SocialDilemmaSimulation(ABC):
    """Abstract base class for all social dilemma simulations."""
    
    def __init__(self, config):
        """Initialize the simulation with the given configuration.
        
        Args:
            config (dict): Configuration parameters for the simulation
        """
        self.config = config
        self.agents = []
        self.round = 0
        self.results = {
            'rounds': [],
            'strategy_performance': {}
        }
    
    @abstractmethod
    def initialize_agents(self):
        """Initialize the agents for the simulation based on config."""
        pass
    
    @abstractmethod
    def run_round(self):
        """Run a single round of the simulation."""
        pass
    
    @abstractmethod
    def calculate_final_stats(self):
        """Calculate final statistics for the simulation."""
        pass
    
    def run_simulation(self, rounds=None):
        """Run the full simulation for specified number of rounds.
        
        Args:
            rounds (int, optional): Number of rounds to run. Defaults to config value.
        
        Returns:
            dict: The simulation results
        """
        try:
            if rounds is None:
                rounds = self.config.get('rounds', 50)
            
            logging.info(f"Starting simulation with {rounds} rounds")
            
            for round_num in range(rounds):
                try:
                    logging.debug(f"Running round {round_num+1}/{rounds}")
                    self.run_round()
                except Exception as e:
                    # Log detailed error for this round but continue with next rounds
                    logging.error(f"Error in round {round_num+1}: {str(e)}")
                    logging.error(traceback.format_exc())
                    # Add partial data for this round to avoid breaking visualization
                    self.results['rounds'].append({
                        'round': round_num+1,
                        'error': str(e),
                        'resource_size': self.resource_size if hasattr(self, 'resource_size') else 0
                    })
            
            # Calculate final statistics
            try:
                logging.info("Calculating final statistics")
                self.calculate_final_stats()
            except Exception as e:
                logging.error(f"Error calculating final stats: {str(e)}")
                logging.error(traceback.format_exc())
                # Add minimal stats to avoid breaking visualization
                if 'final_stats' not in self.results:
                    self.results['final_stats'] = {'error': str(e)}
            
            return self.results
        
        except Exception as e:
            # Catch any other errors in the simulation
            logging.error(f"Critical simulation error: {str(e)}")
            logging.error(traceback.format_exc())
            
            # Return minimal results structure to avoid breaking visualization
            return {
                'error': str(e),
                'rounds': [],
                'strategy_performance': {},
                'final_stats': {'error': str(e)}
            }
    
    def reset(self):
        """Reset the simulation to initial state."""
        self.round = 0
        self.agents = []
        self.initialize_agents()


class TragedyOfCommonsSimulation(SocialDilemmaSimulation):
    """Simulation for the Tragedy of the Commons dilemma."""
    
    def __init__(self, config):
        """Initialize the Tragedy of the Commons simulation.
        
        Args:
            config (dict): Configuration parameters including:
                - resource_size: Initial size of common resource
                - regeneration_rate: Percentage of resource that regenerates each round
                - harvest_limit: Recommended sustainable harvest per agent
                - strategies: Dict of strategy types and their counts
        """
        super().__init__(config)
        
        # Get parameters from config
        params = config.get('parameters', {})
        self.resource_size = params.get('resource_size', 1000)
        self.initial_resource = self.resource_size
        
        # Convert regeneration_rate from percentage to decimal
        # Default regeneration rate set to 200% to create more dynamic harvesting scenarios
        regeneration_percent = params.get('regeneration_rate', 200)
        
        # Validate regeneration rate to avoid errors (must be non-zero positive number)
        try:
            regeneration_percent = float(regeneration_percent)
            if regeneration_percent <= 0:
                logging.warning(f"Invalid regeneration rate: {regeneration_percent}, using default of 200%")
                regeneration_percent = 200
        except (ValueError, TypeError):
            logging.warning(f"Invalid regeneration rate value: {regeneration_percent}, using default of 200%")
            regeneration_percent = 200
        
        # Convert from percentage to decimal factor (e.g., 200% becomes 2.0)
        self.regeneration_rate = regeneration_percent / 100
        logging.info(f"Using regeneration rate: {regeneration_percent}% (factor: {self.regeneration_rate})")
        
        # Set harvest limit - this represents the recommended sustainable harvest per agent
        self.harvest_limit = params.get('harvest_limit', 30)
        
        # Additional tracking variables
        self.results['resource_levels'] = [self.resource_size]
        
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize agents with different harvesting strategies."""
        self.agents = []
        strategy_counts = self.config.get('strategies', {})
        
        # Initialize strategy performance tracking
        for strategy in strategy_counts:
            self.results['strategy_performance'][strategy] = {
                'total_harvest': 0,
                'average_score': 0,
                'sustainability_impact': 0,
                'social_welfare': 0,
                'agent_count': strategy_counts[strategy]
            }
        
        # Create agents for each strategy
        agent_id = 0
        for strategy, count in strategy_counts.items():
            for _ in range(count):
                agent_id += 1
                
                if strategy == 'sustainable':
                    agent = SustainableHarvester(agent_id, self.harvest_limit)
                elif strategy == 'greedy':
                    agent = GreedyHarvester(agent_id, self.harvest_limit)
                elif strategy == 'adaptive':
                    agent = AdaptiveHarvester(agent_id, self.harvest_limit)
                elif strategy == 'fair_share':
                    agent = FairShareHarvester(agent_id, self.harvest_limit)
                else:
                    logging.warning(f"Unknown harvester strategy: {strategy}")
                    continue
                
                self.agents.append({
                    'id': agent_id,
                    'agent': agent,
                    'strategy': strategy
                })
    
    def run_round(self):
        """Run a single round of the Tragedy of the Commons simulation."""
        self.round += 1
        round_data = {
            'round': self.round, 
            'harvests': [],
            'resource_size': self.resource_size,  # Add current resource size to round data
            'strategy_harvests': {}  # Initialize strategy_harvests for this round
        }
        
        # Calculate fair share for agents that need it
        # Use a smaller proportion of regeneration rate to avoid resource depletion
        # This ensures that the fair share calculation is actually sustainable
        sustainable_harvest_rate = (self.resource_size * self.regeneration_rate * 0.8) / len(self.agents)
        fair_share = min(
            self.harvest_limit,
            sustainable_harvest_rate
        )
        
        # Each agent makes a harvest decision
        total_harvest = 0
        available_resource = self.resource_size
        
        # Calculate a safe total harvest limit to prevent complete depletion
        # This is a safety mechanism to ensure resource sustainability
        max_total_harvest = self.resource_size * 0.5  # Never allow more than 50% of resource to be harvested
        safe_per_agent_limit = max_total_harvest / len(self.agents)
        
        # Initialize strategy harvests tracking for this round
        for strategy in self.results['strategy_performance']:
            round_data['strategy_harvests'][strategy] = 0
        
        # First pass: get harvest decisions from all agents
        harvest_decisions = []
        for agent_data in self.agents:
            agent = agent_data['agent']
            strategy = agent_data['strategy']
            
            # Agent makes harvest decision
            harvest_amount = agent.decide_harvest(
                available_resource, 
                self.initial_resource, 
                fair_share
            )
            
            # Store decision
            harvest_decisions.append({
                'agent': agent,
                'strategy': strategy,
                'amount': harvest_amount
            })
        
        # Calculate total requested harvest
        total_requested = sum(decision['amount'] for decision in harvest_decisions)
        
        # Second pass: adjust harvests if total exceeds safe limit
        scaling_needed = total_requested > max_total_harvest
        scaling_factor = max_total_harvest / total_requested if scaling_needed else 1.0
        
        # Process harvests with potential scaling
        for decision in harvest_decisions:
            agent = decision['agent']
            strategy = decision['strategy']
            
            # Apply scaling if needed
            if scaling_needed:
                harvest_amount = decision['amount'] * scaling_factor
            else:
                harvest_amount = decision['amount']
            
            # Limit harvest to available resource
            harvest_amount = min(harvest_amount, available_resource)
            available_resource -= harvest_amount
            total_harvest += harvest_amount
            
            # Record harvest
            agent.record_harvest(harvest_amount)
            round_data['harvests'].append({
                'agent_id': agent.id,
                'strategy': strategy,
                'harvest': harvest_amount
            })
            
            # Update strategy harvests for this round
            round_data['strategy_harvests'][strategy] += harvest_amount
            
            # Update strategy statistics
            self.results['strategy_performance'][strategy]['total_harvest'] += harvest_amount
        
        # Update resource level based on harvesting
        self.resource_size -= total_harvest
        
        # Calculate regeneration with a natural logistic growth model
        # This creates smoother resource dynamics with natural carrying capacity
        # r = growth rate, K = carrying capacity (initial resource)
        r = self.regeneration_rate
        K = self.initial_resource
        
        # Logistic differential equation: dN/dt = r*N*(1-N/K)
        # Discretized for our simulation
        potential_growth = r * self.resource_size * (1 - self.resource_size / K)
        
        # Apply regeneration with diminishing returns as resource approaches carrying capacity
        regrowth = max(0, potential_growth)
        
        # Add regrowth to current resource size
        self.resource_size += regrowth
        
        # Record resource level after this round
        self.results['resource_levels'].append(self.resource_size)
        
        # Add round data to results
        self.results['rounds'].append(round_data)
    
    def calculate_final_stats(self):
        """Calculate final statistics for the Tragedy of the Commons simulation."""
        total_agents = len(self.agents)
        total_rounds = self.round
        
        # Group agents by strategy
        strategy_agents = {}
        for agent_data in self.agents:
            strategy = agent_data['strategy']
            if strategy not in strategy_agents:
                strategy_agents[strategy] = []
            strategy_agents[strategy].append(agent_data['agent'])
        
        # Initialize final_stats structure to match what the frontend expects
        self.results['final_stats'] = {
            'strategies': {}
        }
        
        # Calculate average score and other metrics for each strategy
        for strategy, agents in strategy_agents.items():
            total_score = sum(agent.total_harvest for agent in agents)
            avg_score = total_score / len(agents)
            self.results['strategy_performance'][strategy]['average_score'] = avg_score
            
            # Calculate sustainability impact (-1 to 1 scale)
            # Negative value means unsustainable, positive means sustainable
            avg_harvest = self.results['strategy_performance'][strategy]['total_harvest'] / (len(agents) * total_rounds)
            sustainability_impact = 1 - (avg_harvest / (self.harvest_limit * 1.5))
            self.results['strategy_performance'][strategy]['sustainability_impact'] = max(-1, min(1, sustainability_impact))
            
            # Calculate social welfare contribution (-1 to 1 scale)
            # Based on how much this strategy contributed to resource depletion
            resource_impact = (self.initial_resource - self.resource_size) / self.initial_resource
            if resource_impact > 0.9:  # Resource severely depleted
                welfare = -0.8  # All strategies have negative social welfare in collapse
            else:
                # More sustainable behavior = higher social welfare
                welfare = (sustainability_impact + 1) / 2  # Convert from -1,1 to 0,1
                welfare = welfare * 2 - 1  # Convert to -1,1 scale
            
            self.results['strategy_performance'][strategy]['social_welfare'] = welfare
            
            # Add to final_stats.strategies for frontend compatibility
            self.results['final_stats']['strategies'][strategy] = {
                'sustainability_impact': sustainability_impact,
                'social_welfare': welfare,
                'score': avg_score,
                'total_resources': total_score,
                'actions': {
                    'sustainable': self.results['strategy_performance'][strategy].get('sustainable_actions', 0),
                    'unsustainable': self.results['strategy_performance'][strategy].get('unsustainable_actions', 0)
                }
            }


class FreeRiderSimulation(SocialDilemmaSimulation):
    """Simulation for the Free Rider Problem."""
    
    def __init__(self, config):
        """Initialize the Free Rider Problem simulation.
        
        Args:
            config (dict): Configuration parameters including:
                - project_cost: Total cost of the public project
                - benefit_multiplier: Multiplier for individual benefit from project
                - threshold: Percentage of cost required for project success
                - strategies: Dict of strategy types and their counts
        """
        super().__init__(config)
        
        # Get parameters from config
        params = config.get('parameters', {})
        self.project_cost = params.get('project_cost', 1000)
        self.benefit_multiplier = params.get('benefit_multiplier', 2)
        self.threshold_percent = params.get('threshold', 75)
        self.threshold = (self.threshold_percent / 100) * self.project_cost
        
        # Track funding progress
        self.current_funding = 0
        self.results['funding_progress'] = [0]
        self.results['threshold'] = self.threshold_percent
        self.results['project_completed'] = False
        
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize agents with different contribution strategies."""
        self.agents = []
        strategy_counts = self.config.get('strategies', {})
        
        # If no strategies specified, use default distribution
        if not strategy_counts:
            strategy_counts = {
                'contributor': 2,
                'free_rider': 2,
                'partial': 2,
                'conditional': 2
            }
        
        # Initialize strategy performance tracking
        for strategy in strategy_counts:
            self.results['strategy_performance'][strategy] = {
                'total_contribution': 0,
                'average_gain': 0,
                'sustainability_impact': 0,
                'social_welfare': 0,
                'agent_count': strategy_counts[strategy]
            }
        
        # Calculate fair share contribution
        total_agents = sum(strategy_counts.values())
        fair_share = self.project_cost / total_agents
        
        # Create agents for each strategy
        agent_id = 0
        for strategy, count in strategy_counts.items():
            for _ in range(count):
                agent_id += 1
                
                if strategy == 'contributor':
                    agent = ConsistentContributor(agent_id, fair_share)
                elif strategy == 'free_rider':
                    agent = FreeRider(agent_id, fair_share)
                elif strategy == 'partial':
                    agent = PartialContributor(agent_id, fair_share)
                elif strategy == 'conditional':
                    agent = ConditionalContributor(agent_id, fair_share)
                else:
                    logging.warning(f"Unknown contributor strategy: {strategy}")
                    continue
                
                self.agents.append({
                    'id': agent_id,
                    'agent': agent,
                    'strategy': strategy
                })
    
    def run_round(self):
        """Run a single round of the Free Rider Problem simulation."""
        self.round += 1
        round_data = {
            'round': self.round, 
            'contributions': [],
            'strategy_contributions': {}  # Add strategy contributions tracker
        }
        
        # Initialize strategy contributions tracking for this round
        for strategy in self.results['strategy_performance']:
            round_data['strategy_contributions'][strategy] = 0
        
        # Each agent makes a contribution decision
        round_contributions = 0
        
        # If project is already completed, skip contributions
        if self.results['project_completed']:
            for agent_data in self.agents:
                agent = agent_data['agent']
                strategy = agent_data['strategy']
                
                # Record zero contribution
                round_data['contributions'].append({
                    'agent_id': agent.id,
                    'strategy': strategy,
                    'contribution': 0
                })
                
                # Zero contribution for completed project
                round_data['strategy_contributions'][strategy] = 0
            
            # Add round data to results
            self.results['rounds'].append(round_data)
            self.results['funding_progress'].append(100 if self.current_funding >= self.threshold else 
                                                  (self.current_funding / self.project_cost) * 100)
            return
        
        # Get average contribution from previous round for conditional contributors
        prev_avg_contribution = 0
        if self.round > 1:
            prev_round = self.results['rounds'][-1]
            contributions = [c['contribution'] for c in prev_round['contributions']]
            prev_avg_contribution = sum(contributions) / len(contributions) if contributions else 0
        
        # Collect contributions
        for agent_data in self.agents:
            agent = agent_data['agent']
            strategy = agent_data['strategy']
            
            # Agent makes contribution decision
            contribution = agent.decide_contribution(
                self.current_funding, 
                self.project_cost,
                self.threshold,
                prev_avg_contribution
            )
            
            round_contributions += contribution
            
            # Record contribution
            agent.record_contribution(contribution)
            round_data['contributions'].append({
                'agent_id': agent.id,
                'strategy': strategy,
                'contribution': contribution
            })
            
            # Update strategy contributions for this round
            round_data['strategy_contributions'][strategy] += contribution
            
            # Update strategy statistics
            self.results['strategy_performance'][strategy]['total_contribution'] += contribution
        
        # Update project funding
        self.current_funding += round_contributions
        funding_percent = (self.current_funding / self.project_cost) * 100
        self.results['funding_progress'].append(funding_percent)
        
        # Check if project is completed
        if not self.results['project_completed'] and self.current_funding >= self.threshold:
            self.results['project_completed'] = True
            
            # Distribute benefits to all agents
            self._distribute_project_benefits()
        
        # Add round data to results
        self.results['rounds'].append(round_data)
    
    def _distribute_project_benefits(self):
        """Distribute benefits from the completed project to all agents."""
        # Calculate total benefit from the project
        total_benefit = self.project_cost * self.benefit_multiplier
        
        # Each agent gets an equal share of the benefit
        benefit_per_agent = total_benefit / len(self.agents)
        
        for agent_data in self.agents:
            agent = agent_data['agent']
            agent.receive_benefit(benefit_per_agent)
    
    def calculate_final_stats(self):
        """Calculate final statistics for the Free Rider Problem simulation."""
        # Group agents by strategy
        strategy_agents = {}
        for agent_data in self.agents:
            strategy = agent_data['strategy']
            if strategy not in strategy_agents:
                strategy_agents[strategy] = []
            strategy_agents[strategy].append(agent_data['agent'])
        
        # Initialize final_stats structure to match what the frontend expects
        self.results['final_stats'] = {
            'strategies': {}
        }
        
        # Calculate average gain (benefit - contribution) for each strategy
        for strategy, agents in strategy_agents.items():
            total_contribution = sum(agent.total_contribution for agent in agents)
            total_benefit = sum(agent.total_benefit for agent in agents)
            total_gain = total_benefit - total_contribution
            avg_gain = total_gain / len(agents)
            
            self.results['strategy_performance'][strategy]['average_gain'] = avg_gain
            
            # Calculate social welfare contribution (-1 to 1 scale)
            # Higher contribution = higher social welfare
            contribution_ratio = total_contribution / (len(agents) * (self.project_cost / len(self.agents)))
            welfare = (contribution_ratio * 2) - 1  # Convert to -1,1 scale
            welfare = max(-1, min(1, welfare))
            
            self.results['strategy_performance'][strategy]['social_welfare'] = welfare
            
            # Calculate sustainability impact (-1 to 1 scale)
            # In free rider context, this measures impact on project viability
            if self.results['project_completed']:
                impact = contribution_ratio  # Positive impact if contributed fair share or more
            else:
                impact = contribution_ratio - 1  # Negative impact if project failed
            
            impact = max(-1, min(1, impact))
            self.results['strategy_performance'][strategy]['sustainability_impact'] = impact
            
            # Add to final_stats.strategies for frontend compatibility
            self.results['final_stats']['strategies'][strategy] = {
                'sustainability_impact': impact,
                'social_welfare': welfare,
                'score': avg_gain,
                'total_resources': total_benefit,
                'actions': {
                    'contribute': total_contribution,
                    'free_ride': total_benefit - total_contribution
                }
            }


class PublicGoodsSimulation(SocialDilemmaSimulation):
    """Simulation for the Public Goods dilemma."""
    
    def __init__(self, config):
        """Initialize the Public Goods Game simulation.
        
        Args:
            config (dict): Configuration parameters including:
                - endowment: Resources each agent receives per round
                - multiplier: Factor by which public pool is multiplied
                - distribution: Method of distributing public good (equal/proportional)
                - strategies: Dict of strategy types and their counts
        """
        super().__init__(config)
        
        # Get parameters from config
        params = config.get('parameters', {})
        self.endowment = params.get('endowment', 50)
        self.multiplier = params.get('multiplier', 2)
        self.distribution = params.get('distribution', 'equal')
        
        # Track contributions
        self.results['contribution_history'] = {}
        self.results['average_contribution'] = []
        
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize agents with different contribution strategies."""
        self.agents = []
        strategy_counts = self.config.get('strategies', {})
        
        # Initialize strategy performance tracking
        for strategy in strategy_counts:
            self.results['strategy_performance'][strategy] = {
                'total_contribution': 0,
                'average_payoff': 0,
                'sustainability_impact': 0,
                'social_welfare': 0,
                'agent_count': strategy_counts[strategy]
            }
            self.results['contribution_history'][strategy] = []
        
        # Create agents for each strategy
        agent_id = 0
        for strategy, count in strategy_counts.items():
            for _ in range(count):
                agent_id += 1
                
                if strategy == 'full':
                    agent = FullContributor(agent_id, self.endowment)
                elif strategy == 'zero':
                    agent = ZeroContributor(agent_id, self.endowment)
                elif strategy == 'random':
                    agent = RandomContributor(agent_id, self.endowment)
                elif strategy == 'matching':
                    agent = MatchingContributor(agent_id, self.endowment)
                else:
                    logging.warning(f"Unknown contributor strategy: {strategy}")
                    continue
                
                self.agents.append({
                    'id': agent_id,
                    'agent': agent,
                    'strategy': strategy
                })
    
    def run_round(self):
        """Run a single round of the Public Goods Game simulation."""
        self.round += 1
        round_data = {
            'round': self.round, 
            'contributions': [], 
            'payoffs': [],
            'strategy_contributions': {}  # Add strategy contributions tracker
        }
        
        # Give each agent their endowment
        for agent_data in self.agents:
            agent = agent_data['agent']
            agent.receive_endowment(self.endowment)
        
        # Get average contribution from previous round for matching contributors
        prev_avg_contribution = 0
        if self.round > 1:
            prev_round = self.results['rounds'][-1]
            contributions = [c['contribution'] for c in prev_round['contributions']]
            prev_avg_contribution = sum(contributions) / len(contributions) if contributions else 0
        
        # Initialize strategy contributions tracking for this round
        for strategy in self.results['strategy_performance']:
            round_data['strategy_contributions'][strategy] = 0
            
        # Collect contributions to public pool
        public_pool = 0
        strategy_contributions = {}
        
        for agent_data in self.agents:
            agent = agent_data['agent']
            strategy = agent_data['strategy']
            
            # Agent makes contribution decision
            contribution = agent.decide_contribution(
                self.endowment, 
                prev_avg_contribution
            )
            
            public_pool += contribution
            
            # Record contribution
            agent.record_contribution(contribution)
            round_data['contributions'].append({
                'agent_id': agent.id,
                'strategy': strategy,
                'contribution': contribution
            })
            
            # Track contributions by strategy for history
            if strategy not in strategy_contributions:
                strategy_contributions[strategy] = []
            strategy_contributions[strategy].append(contribution)
            
            # Update strategy contributions for this round
            round_data['strategy_contributions'][strategy] += contribution
            
            # Update strategy statistics
            self.results['strategy_performance'][strategy]['total_contribution'] += contribution
        
        # Calculate payoffs based on distribution method
        if self.distribution == 'equal':
            # Equal distribution of public pool
            payoff_per_agent = (public_pool * self.multiplier) / len(self.agents)
            for agent_data in self.agents:
                agent = agent_data['agent']
                strategy = agent_data['strategy']
                payoff = payoff_per_agent
                round_data['payoffs'].append({
                    'agent_id': agent.id,
                    'strategy': strategy,
                    'payoff': payoff
                })
        else:  # proportional
            # Proportional distribution based on contribution
            total_contribution = sum(c['contribution'] for c in round_data['contributions'])
            if total_contribution > 0:
                for agent_data in self.agents:
                    agent = agent_data['agent']
                    strategy = agent_data['strategy']
                    contribution = next(c['contribution'] for c in round_data['contributions'] 
                                     if c['agent_id'] == agent.id)
                    payoff = (contribution / total_contribution) * (public_pool * self.multiplier)
                    round_data['payoffs'].append({
                        'agent_id': agent.id,
                        'strategy': strategy,
                        'payoff': payoff
                    })
            else:
                # If no contributions, equal distribution
                payoff_per_agent = 0
                for agent_data in self.agents:
                    agent = agent_data['agent']
                    strategy = agent_data['strategy']
                    round_data['payoffs'].append({
                        'agent_id': agent.id,
                        'strategy': strategy,
                        'payoff': payoff_per_agent
                    })
        
        # Add round data to results
        self.results['rounds'].append(round_data)
        
        # Update contribution history
        for strategy, contributions in strategy_contributions.items():
            self.results['contribution_history'][strategy].append(sum(contributions) / len(contributions))
        
        # Update average contribution
        self.results['average_contribution'].append(public_pool / len(self.agents))
        
        return round_data
    
    def calculate_final_stats(self):
        """Calculate final statistics for the Public Goods Game simulation."""
        # Group agents by strategy
        strategy_agents = {}
        for agent_data in self.agents:
            strategy = agent_data['strategy']
            if strategy not in strategy_agents:
                strategy_agents[strategy] = []
            strategy_agents[strategy].append(agent_data['agent'])
        
        # Initialize final_stats structure to match what the frontend expects
        self.results['final_stats'] = {
            'strategies': {}
        }
        
        # Calculate average payoff and other metrics for each strategy
        for strategy, agents in strategy_agents.items():
            total_payoff = sum(agent.total_payoff for agent in agents)
            avg_payoff = total_payoff / len(agents)
            
            self.results['strategy_performance'][strategy]['average_payoff'] = avg_payoff
            self.results['strategy_performance'][strategy]['average_score'] = avg_payoff
            
            # Calculate contribution ratio (0 to 1)
            total_contribution = sum(agent.total_contribution for agent in agents)
            max_possible = len(agents) * self.endowment * self.round
            contribution_ratio = total_contribution / max_possible
            
            # Calculate social welfare contribution (-1 to 1 scale)
            # Higher contribution = higher social welfare
            welfare = (contribution_ratio * 2) - 1  # Convert to -1,1 scale
            welfare = max(-1, min(1, welfare))
            
            self.results['strategy_performance'][strategy]['social_welfare'] = welfare
            
            # Calculate sustainability impact (-1 to 1 scale)
            # In public goods context, sustainability refers to maintained contributions
            impact = 0
            if len(self.results['contribution_history'][strategy]) > 2:
                first_half = self.results['contribution_history'][strategy][:len(self.results['contribution_history'][strategy])//2]
                second_half = self.results['contribution_history'][strategy][len(self.results['contribution_history'][strategy])//2:]
                
                first_avg = sum(first_half) / len(first_half)
                second_avg = sum(second_half) / len(second_half)
                
                trend = (second_avg - first_avg) / self.endowment  # Normalized trend
                
                # Positive impact if contributions maintained or increased
                impact = trend + (contribution_ratio / 2)  # Blend trend with overall contribution
            else:
                impact = contribution_ratio - 0.5  # Just use contribution level if not enough rounds
            
            impact = max(-1, min(1, impact))
            self.results['strategy_performance'][strategy]['sustainability_impact'] = impact
            
            # Add to final_stats.strategies for frontend compatibility
            self.results['final_stats']['strategies'][strategy] = {
                'sustainability_impact': impact,
                'social_welfare': welfare,
                'score': avg_payoff,
                'total_resources': total_payoff,
                'actions': {
                    'contribute': total_contribution,
                    'free_ride': max_possible - total_contribution
                }
            }


#------------------------
# Agent Strategy Classes
#------------------------

# Base Classes

class HarvesterAgent:
    """Base class for agents in Tragedy of the Commons."""
    
    def __init__(self, agent_id, harvest_limit):
        """Initialize a harvester agent.
        
        Args:
            agent_id (int): Unique identifier for this agent
            harvest_limit (int): Recommended sustainable harvest limit
        """
        self.id = agent_id
        self.harvest_limit = harvest_limit
        self.harvest_history = []
        self.total_harvest = 0
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide how much to harvest this round.
        
        Args:
            available (float): Currently available resource
            initial (float): Initial resource size
            fair_share (float): Calculated fair share per agent
            
        Returns:
            float: Amount to harvest
        """
        raise NotImplementedError("Subclasses must implement decide_harvest()")
    
    def record_harvest(self, amount):
        """Record a harvest action.
        
        Args:
            amount (float): Amount harvested
        """
        self.harvest_history.append(amount)
        self.total_harvest += amount


class ContributorAgent:
    """Base class for agents in Free Rider Problem."""
    
    def __init__(self, agent_id, fair_share):
        """Initialize a contributor agent.
        
        Args:
            agent_id (int): Unique identifier for this agent
            fair_share (float): Calculated fair share contribution
        """
        self.id = agent_id
        self.fair_share = fair_share
        self.contribution_history = []
        self.total_contribution = 0
        self.total_benefit = 0
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide how much to contribute this round.
        
        Args:
            current_funding (float): Current project funding
            total_cost (float): Total project cost
            threshold (float): Funding threshold for project success
            prev_avg_contribution (float): Average contribution in previous round
            
        Returns:
            float: Amount to contribute
        """
        raise NotImplementedError("Subclasses must implement decide_contribution()")
    
    def record_contribution(self, amount):
        """Record a contribution action.
        
        Args:
            amount (float): Amount contributed
        """
        self.contribution_history.append(amount)
        self.total_contribution += amount
    
    def receive_benefit(self, amount):
        """Receive benefit from completed project.
        
        Args:
            amount (float): Benefit amount
        """
        self.total_benefit += amount


class PublicGoodsAgent:
    """Base class for agents in Public Goods Game."""
    
    def __init__(self, agent_id, endowment):
        """Initialize a public goods game agent.
        
        Args:
            agent_id (int): Unique identifier for this agent
            endowment (float): Endowment per round
        """
        self.id = agent_id
        self.endowment = endowment
        self.current_resources = 0
        self.contribution_history = []
        self.total_contribution = 0
        self.total_payoff = 0
    
    def receive_endowment(self, amount):
        """Receive endowment for this round.
        
        Args:
            amount (float): Endowment amount
        """
        self.current_resources += amount
    
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide how much to contribute to public pool.
        
        Args:
            endowment (float): Endowment for this round
            prev_avg_contribution (float): Average contribution in previous round
            
        Returns:
            float: Amount to contribute
        """
        raise NotImplementedError("Subclasses must implement decide_contribution()")
    
    def record_contribution(self, amount):
        """Record a contribution and deduct from resources.
        
        Args:
            amount (float): Amount contributed
        """
        self.contribution_history.append(amount)
        self.total_contribution += amount
        self.current_resources -= amount
    
    def receive_payoff(self, amount):
        """Receive payoff from public pool.
        
        Args:
            amount (float): Payoff amount
        """
        self.current_resources += amount
        self.total_payoff += amount


# Tragedy of the Commons Agent Strategies

class SustainableHarvester(HarvesterAgent):
    """Harvester that aims for long-term sustainability."""
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest based on resource health.
        
        Sustainable harvesters reduce their harvest when resource is depleted
        and stay within recommended limits.
        
        Returns:
            float: Amount to harvest
        """
        # Calculate resource depletion factor (0-1, 0=depleted, 1=full)
        resource_health = min(1.0, available / initial)
        
        # Adjust harvest based on resource health
        if resource_health > 0.8:
            # Resource is healthy, harvest normally
            return self.harvest_limit
        elif resource_health > 0.5:
            # Resource is moderately depleted, reduce harvest
            return self.harvest_limit * 0.8
        elif resource_health > 0.2:
            # Resource is significantly depleted, harvest very little
            return self.harvest_limit * 0.5
        else:
            # Resource is critically depleted, harvest minimum for survival
            return self.harvest_limit * 0.2


class ConservationistHarvester(HarvesterAgent):
    """Harvester that actively works to restore the resource."""
    
    def __init__(self, agent_id, harvest_limit):
        """Initialize with conservation threshold."""
        super().__init__(agent_id, harvest_limit)
        self.conservation_threshold = 0.7  # If resource below 70%, prioritize conservation
        self.restoration_factor = 0.05  # 5% additional regeneration boost
        self.restoration_contribution = 0  # Track restoration efforts
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest with conservation priorities.
        
        Conservationists will significantly reduce harvesting when resource
        levels are low, and may even actively contribute to resource
        regeneration through restoration efforts.
        
        Returns:
            float: Amount to harvest (can be negative for restoration)
        """
        # Calculate resource health
        resource_health = available / initial
        
        # Check if conservation mode is needed
        if resource_health < self.conservation_threshold:
            # Enter conservation mode - harvest much less than sustainable harvesters
            if resource_health < 0.3:
                # Resource is critically low, actively contribute to restoration
                # Negative harvest represents restoration efforts
                restoration_amount = -fair_share * 0.5
                self.restoration_contribution -= restoration_amount  # Track restoration (as positive)
                return restoration_amount
            else:
                # Resource is low but not critical, harvest minimally
                return fair_share * 0.3
        else:
            # Resource is healthy, harvest slightly below recommended limit
            return self.harvest_limit * 0.9


class SeasonalHarvester(HarvesterAgent):
    """Harvester that follows seasonal patterns."""
    
    def __init__(self, agent_id, harvest_limit):
        """Initialize with seasonal cycle."""
        super().__init__(agent_id, harvest_limit)
        self.season_length = 4  # How many rounds per cycle
        
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest based on a seasonal cycle.
        
        Seasonal harvesters model real-world behaviors where 
        harvesting follows a periodic pattern, with periods of
        intense harvesting followed by periods of restraint.
        
        Returns:
            float: Amount to harvest
        """
        # Calculate current season (0-3) based on round number
        season = len(self.harvest_history) % self.season_length
        
        # Calculate base harvest amount based on resource health
        resource_health = min(1.0, available / initial)
        base_amount = self.harvest_limit * resource_health
        
        # Adjust for seasonal variation
        if season == 0:  # High season - harvest intensively
            return base_amount * 1.5
        elif season == 1:  # Transition down - harvest moderately
            return base_amount * 1.0
        elif season == 2:  # Low season - harvest minimally
            return base_amount * 0.5
        else:  # Transition up - harvest moderately
            return base_amount * 1.0


class GreedyHarvester(HarvesterAgent):
    """Harvester that maximizes short-term gains."""
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest to maximize personal gain.
        
        Greedy harvesters try to take as much as possible regardless of 
        resource health or sustainability concerns.
        
        Returns:
            float: Amount to harvest
        """
        # More realistic greedy behavior - varies between 1.5-2.5 times the recommended limit
        # Also takes into account resource depletion to a small degree
        resource_factor = max(0.6, min(1.0, available / initial))
        greed_multiplier = 1.5 + resource_factor
        
        # Take a slightly more reasonable amount - not more than 30% of available
        # This makes the simulation more realistic and prevents instant collapse
        greedy_amount = self.harvest_limit * greed_multiplier
        return min(greedy_amount, available * 0.3)


class AdaptiveHarvester(HarvesterAgent):
    """Harvester that adapts to resource conditions and others' behavior."""
    
    def __init__(self, agent_id, harvest_limit):
        """Initialize adaptive harvester with trust level."""
        super().__init__(agent_id, harvest_limit)
        self.greed_factor = 0.0  # 0 = sustainable, 1 = greedy
        self.adjustment_history = []  # Track recent resource levels
        self.memory_length = 3  # How many rounds to consider for decision making
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest by adapting to resource conditions.
        
        Adaptive harvesters increase greed when resource is abundant and
        decrease when it's scarce. They learn from the environment.
        
        Returns:
            float: Amount to harvest
        """
        # Calculate resource health (0-1)
        resource_health = available / initial
        
        # Add to history
        self.adjustment_history.append(resource_health)
        if len(self.adjustment_history) > self.memory_length:
            self.adjustment_history.pop(0)
        
        # Average recent resource health for more stable decisions
        avg_resource_health = sum(self.adjustment_history) / len(self.adjustment_history)
        
        # Adjust greed factor based on resource health with smoother transitions
        if avg_resource_health > 0.7:
            # Resource is abundant, can be more greedy, but only by a small amount
            adjustment = 0.05 + (0.03 * (avg_resource_health - 0.7) / 0.3)
            self.greed_factor = min(1.0, self.greed_factor + adjustment)
        elif avg_resource_health < 0.5:
            # Resource is scarce, be more sustainable with graduated response
            scarcity_factor = (0.5 - avg_resource_health) / 0.5  # 0 to 1 scale for scarcity
            adjustment = 0.05 + (0.05 * scarcity_factor)
            self.greed_factor = max(0.0, self.greed_factor - adjustment)
        
        # Blend between sustainable and greedy based on greed factor
        # Use a weighted curve to create more natural transition
        sustainable_amount = self.harvest_limit * (0.8 + (0.3 * resource_health))
        greedy_amount = min(self.harvest_limit * 1.8, available * 0.25)
        
        # More natural blending between sustainable and greedy
        blend_factor = self.greed_factor ** 2  # Quadratic curve for smoother blend
        return (sustainable_amount * (1 - blend_factor) + 
                greedy_amount * blend_factor)


class FairShareHarvester(HarvesterAgent):
    """Harvester that takes exactly the calculated fair share."""
    
    def decide_harvest(self, available, initial, fair_share):
        """Decide harvest based on fair share calculation.
        
        Fair share harvesters try to maintain perfect equilibrium by
        taking exactly their calculated fair proportion.
        
        Returns:
            float: Amount to harvest
        """
        return fair_share


# Free Rider Problem Agent Strategies

class ConsistentContributor(ContributorAgent):
    """Agent that consistently contributes their fair share."""
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide to contribute full fair share.
        
        Consistent contributors always pay their fair share regardless
        of others' behavior or project progress.
        
        Returns:
            float: Amount to contribute
        """
        # Always contribute fair share, unless project is almost funded
        remaining = max(0, threshold - current_funding)
        return min(self.fair_share, remaining)


class FreeRider(ContributorAgent):
    """Agent that contributes nothing and hopes to benefit from others."""
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide to contribute nothing.
        
        Free riders never contribute and hope to benefit from others'
        contributions.
        
        Returns:
            float: Amount to contribute (always 0)
        """
        return 0


class StrategicFreeRider(ContributorAgent):
    """Agent that attempts to hide free-riding through minimal contributions."""
    
    def __init__(self, agent_id, fair_share):
        """Initialize with minimum contribution threshold."""
        super().__init__(agent_id, fair_share)
        self.min_contribution = fair_share * 0.1  # 10% of fair share
        self.detection_threshold = 0.9  # Funding progress that triggers contribution
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide contribution strategically.
        
        Strategic free riders contribute just enough to avoid social sanctions
        or to ensure the project succeeds if it's close to the threshold.
        They maximize personal benefit while maintaining plausible deniability
        about free-riding.
        
        Returns:
            float: Amount to contribute
        """
        # Calculate funding progress as percentage
        funding_progress = current_funding / total_cost
        
        if funding_progress > self.detection_threshold and current_funding < threshold:
            # Project is close to threshold but not funded yet - contribute enough to succeed
            # This is strategic because the benefit outweighs the small contribution
            remaining = threshold - current_funding
            return min(remaining, self.fair_share)
        else:
            # Otherwise contribute just the minimum to avoid being labeled as free rider
            return self.min_contribution


class ReputationDrivenContributor(ContributorAgent):
    """Agent whose contributions are motivated by social reputation."""
    
    def __init__(self, agent_id, fair_share):
        """Initialize with visibility factor."""
        super().__init__(agent_id, fair_share)
        self.base_contribution = 0.3  # Base contribution when no one is watching
        self.visibility_boost = 0.6   # Additional contribution when visible
        self.visibility = 0.5         # How visible the contribution is (0-1)
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide contribution based on social visibility.
        
        Reputation-driven contributors give more when their actions are more visible
        to others and less when they can free-ride without social judgment.
        This models how public recognition affects contribution behaviors.
        
        Returns:
            float: Amount to contribute
        """
        # Calculate how much to contribute based on visibility
        contribution_rate = self.base_contribution + (self.visibility * self.visibility_boost)
        contribution = self.fair_share * contribution_rate
        
        # If close to threshold, may contribute more to be seen as the one who pushed it over
        funding_progress = current_funding / threshold if threshold > 0 else 0
        if 0.85 < funding_progress < 0.95:
            # Chance to be the "hero" who pushes project over threshold
            contribution = max(contribution, self.fair_share * 1.2)
        
        # Don't contribute more than needed
        remaining = max(0, threshold - current_funding)
        return min(contribution, remaining)


class PartialContributor(ContributorAgent):
    """Agent that contributes some fraction of their fair share."""
    
    def __init__(self, agent_id, fair_share):
        """Initialize with random contribution fraction."""
        super().__init__(agent_id, fair_share)
        # Contribute between 20% and 60% of fair share
        self.contribution_fraction = 0.2 + (0.4 * random.random())
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide to contribute partial fair share.
        
        Partial contributors give a consistent fraction of their fair
        share, trying to benefit while avoiding complete free riding.
        
        Returns:
            float: Amount to contribute
        """
        # Contribute partial fair share, unless project is almost funded
        remaining = max(0, threshold - current_funding)
        partial_amount = self.fair_share * self.contribution_fraction
        return min(partial_amount, remaining)


class ConditionalContributor(ContributorAgent):
    """Agent that contributes based on others' contributions."""
    
    def decide_contribution(self, current_funding, total_cost, threshold, prev_avg_contribution):
        """Decide contribution based on what others did previously.
        
        Conditional contributors match the average contribution from
        the previous round, encouraging cooperation.
        
        Returns:
            float: Amount to contribute
        """
        # Start with fair share in first round
        if len(self.contribution_history) == 0:
            return self.fair_share
        
        # Otherwise match the average contribution in previous round
        # but at least 40% of fair share and at most 120% of fair share
        lower_bound = 0.4 * self.fair_share
        upper_bound = 1.2 * self.fair_share
        
        # Adjust contribution based on previous average
        if prev_avg_contribution > 0:
            contribution = prev_avg_contribution
        else:
            contribution = lower_bound
        
        # Bound the contribution
        contribution = max(lower_bound, min(contribution, upper_bound))
        
        # Don't contribute more than needed
        remaining = max(0, threshold - current_funding)
        return min(contribution, remaining)


# Public Goods Game Agent Strategies

class FullContributor(PublicGoodsAgent):
    """Agent that contributes all resources to public pool."""
    
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide to contribute entire endowment.
        
        Full contributors always give everything to the public pool,
        maximizing group benefit.
        
        Returns:
            float: Amount to contribute (full endowment)
        """
        return self.current_resources


class ZeroContributor(PublicGoodsAgent):
    """Agent that contributes nothing to public pool."""
    
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide to contribute nothing.
        
        Zero contributors keep their entire endowment, attempting
        to maximize personal benefit.
        
        Returns:
            float: Amount to contribute (always 0)
        """
        return 0


class RandomContributor(PublicGoodsAgent):
    """Agent that contributes random amount to public pool."""
    
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide to contribute random percentage of endowment.
        
        Random contributors give unpredictable amounts, representing
        variety in behavior.
        
        Returns:
            float: Random amount to contribute
        """
        # Contribute random percentage (0-100%) of current resources
        return self.current_resources * random.random()


class AltruisticContributor(PublicGoodsAgent):
    """Agent that prioritizes group welfare over individual gain."""
    
    def __init__(self, agent_id, endowment):
        """Initialize with altruism level."""
        super().__init__(agent_id, endowment)
        self.altruism_level = 0.9  # High altruism (0-1 scale)
        
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide contribution based on altruistic tendencies.
        
        Altruistic contributors consistently give most of their resources
        to benefit the group, even when others don't reciprocate.
        
        Returns:
            float: Amount to contribute (usually high)
        """
        # Contribute most resources regardless of others' behavior
        base_contribution = self.current_resources * self.altruism_level
        
        # May even sacrifice all resources if group contributions are low
        if prev_avg_contribution < endowment * 0.3 and len(self.contribution_history) > 0:
            # Group needs extra help - be even more altruistic
            return min(self.current_resources, base_contribution * 1.1)
        
        return base_contribution


class TitForTatContributor(PublicGoodsAgent):
    """Agent that reciprocates group behavior from previous round."""
    
    def __init__(self, agent_id, endowment):
        """Initialize with starting cooperation level."""
        super().__init__(agent_id, endowment)
        self.cooperation_level = 0.7  # Start cooperatively
        self.adjustment_rate = 0.15   # How quickly to adjust to others
        
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide contribution based on reciprocity principle.
        
        Tit-for-tat contributors adjust their contribution level to match
        the group norm from the previous round. They reward cooperation
        and punish defection, potentially driving the group toward
        either high or low cooperation equilibrium.
        
        Returns:
            float: Amount to contribute
        """
        # First round, be cooperative
        if len(self.contribution_history) == 0:
            return self.current_resources * self.cooperation_level
            
        # Calculate how cooperative others were (as percentage of endowment)
        others_cooperation = prev_avg_contribution / endowment if endowment > 0 else 0
        
        # Adjust own cooperation level toward others' behavior
        self.cooperation_level += (others_cooperation - self.cooperation_level) * self.adjustment_rate
        
        # Bound cooperation level and calculate contribution
        self.cooperation_level = max(0.1, min(0.95, self.cooperation_level))
        return self.current_resources * self.cooperation_level


class MatchingContributor(PublicGoodsAgent):
    """Agent that matches the average contribution of others."""
    
    def decide_contribution(self, endowment, prev_avg_contribution):
        """Decide contribution based on previous average.
        
        Matching contributors try to maintain group norms by
        contributing similar amounts to others.
        
        Returns:
            float: Amount to contribute
        """
        # First round, contribute half
        if len(self.contribution_history) == 0:
            return self.current_resources * 0.5
        
        # Match previous average, capped at current resources
        return min(prev_avg_contribution, self.current_resources)


# Factory for creating social dilemma simulations
class SocialDilemmaFactory:
    """Factory class to create appropriate social dilemma simulation."""
    
    @staticmethod
    def create_simulation(config):
        """Create and return a simulation based on dilemma type.
        
        Args:
            config (dict): Configuration for the simulation
            
        Returns:
            SocialDilemmaSimulation: An instance of the appropriate simulation
            
        Raises:
            ValueError: If dilemma type is unknown or configuration is invalid
        """
        try:
            # Deep logging of input
            logging.info("Creating social dilemma simulation")
            
            # Input validation
            if not config:
                logging.error("Empty configuration provided")
                raise ValueError("Empty configuration provided")
                
            # Check if we have the required fields
            if 'strategies' not in config:
                logging.error("No strategies field in configuration")
                raise ValueError("No strategies field in configuration")
                
            if not config['strategies']:
                logging.error("Empty strategies in configuration")
                raise ValueError("No strategies specified in configuration")
            
            # Validate agent counts
            total_agents = 0
            for strategy, count in config['strategies'].items():
                try:
                    agent_count = int(count)
                    if agent_count < 0:
                        logging.error(f"Invalid agent count for {strategy}: {count} (negative)")
                        raise ValueError(f"Invalid agent count for {strategy}: {count}. Must be ≥ 0.")
                    total_agents += agent_count
                except (ValueError, TypeError):
                    logging.error(f"Invalid agent count for {strategy}: {count} (not a number)")
                    raise ValueError(f"Invalid agent count for {strategy}: {count}. Must be an integer.")
            
            if total_agents <= 0:
                logging.error(f"No agents specified (total: {total_agents})")
                raise ValueError("At least one agent must be specified")
                
            dilemma_type = config.get('dilemma_type', 'tragedy_commons')
            
            logging.info(f"Creating simulation for dilemma type: {dilemma_type}")
            logging.debug(f"Configuration: {json.dumps(config, indent=2)}")
            
            if dilemma_type == 'tragedy_commons':
                # Additional validation for Tragedy of Commons
                params = config.get('parameters', {})
                if 'regeneration_rate' in params:
                    try:
                        regen_rate = float(params['regeneration_rate'])
                        logging.info(f"Using regeneration rate: {regen_rate}%")
                    except (ValueError, TypeError):
                        logging.error(f"Invalid regeneration rate: {params['regeneration_rate']}")
                        raise ValueError(f"Invalid regeneration rate: {params['regeneration_rate']}. Must be a number.")
                
                return TragedyOfCommonsSimulation(config)
            elif dilemma_type == 'free_rider':
                return FreeRiderSimulation(config)
            elif dilemma_type == 'public_goods':
                return PublicGoodsSimulation(config)
            else:
                logging.error(f"Unknown dilemma type: {dilemma_type}")
                raise ValueError(f"Unknown dilemma type: {dilemma_type}")
        except Exception as e:
            # Log the full error with traceback
            logging.error(f"Error creating simulation: {str(e)}")
            logging.error(traceback.format_exc())
            
            # Re-raise with more context
            raise ValueError(f"Failed to create simulation: {str(e)}")