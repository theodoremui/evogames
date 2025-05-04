// Simulation Controller for EvoGames - Mui Lab

let currentSimulation = null;
let simulationInterval = null;
let currentRound = 0;
let totalRounds = 0;
let simulationConfig = null;
let simulationResults = null;
let simulationSpeed = 500; // ms between rounds

// Initialize simulation controller
function initializeSimulationController() {
    // Simulation control buttons
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const stepBtn = document.getElementById('step-btn');
    
    // Hide simulation controls initially
    document.getElementById('simulation-controls').style.display = 'none';
    
    // Add event listeners to control buttons
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    if (stepBtn) {
        stepBtn.addEventListener('click', stepSimulation);
    }
}

// Display simulation results
function displayResults(results, config) {
    console.log("displayResults called with:", results);

    // Error handling
    if (!results) {
        console.error("No results data provided to displayResults");
        document.getElementById('simulation-status').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error: Invalid simulation results data
            </div>
        `;
        return;
    }

    try {
        // Store results and config
        simulationResults = results;
        simulationConfig = config;
        
        // Check if rounds property exists in results
        if (!results.rounds || !Array.isArray(results.rounds)) {
            console.error("Results missing rounds array:", results);
            document.getElementById('simulation-status').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error: Invalid simulation data format (missing rounds)
                </div>
            `;
            return;
        }
        
        totalRounds = results.rounds.length;
        currentRound = totalRounds; // Start with all rounds completed
        
        // Check if updateCharts exists before calling it
        if (typeof updateCharts === 'function') {
            updateCharts(results, config);
        } else {
            console.log("updateCharts function not found, skipping chart updates");
            // Implement a simple fallback chart renderer
            renderFallbackCharts(results, config);
        }
        
        // Show round information
        const roundInfo = document.getElementById('round-info');
        if (roundInfo) {
            roundInfo.style.display = 'block';
            
            if (document.getElementById('current-round')) {
                document.getElementById('current-round').textContent = totalRounds;
            }
            
            if (document.getElementById('total-rounds')) {
                document.getElementById('total-rounds').textContent = totalRounds;
            }
            
            // Update progress bar
            const progressBar = document.getElementById('round-progress');
            if (progressBar) {
                const progress = (currentRound / totalRounds) * 100;
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
                progressBar.textContent = `${Math.round(progress)}%`;
            }
        }
        
        // Show interactions if the element exists
        if (document.getElementById('interactions-card')) {
            updateInteractionsTable(results.rounds[totalRounds - 1]);
            document.getElementById('interactions-card').style.display = 'block';
        }
        
        // Show detailed results if the element exists
        if (document.getElementById('detailed-results')) {
            updateDetailedResults();
            document.getElementById('detailed-results').style.display = 'block';
        }
        
        // Update simulation status
        if (document.getElementById('simulation-status')) {
            document.getElementById('simulation-status').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Simulation completed successfully with ${totalRounds} rounds!
                </div>
            `;
        }
    } catch (error) {
        console.error("Error displaying simulation results:", error);
        document.getElementById('simulation-status').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error processing simulation results: ${error.message}
            </div>
        `;
    }
    
    // Hide simulation controls
    document.getElementById('simulation-controls').style.display = 'none';
}

// Update the interactions table
function updateInteractionsTable(roundData) {
    const tableBody = document.getElementById('interactions-table-body');
    if (!tableBody || !roundData || !roundData.interactions) return;
    
    tableBody.innerHTML = '';
    
    // Add interactions to the table
    roundData.interactions.forEach(interaction => {
        const row = document.createElement('tr');
        
        // Format agent IDs to show only strategy type and number
        const agent1Parts = interaction.agent1.split('_');
        const agent2Parts = interaction.agent2.split('_');
        const agent1Display = `${formatStrategyName(agent1Parts.slice(0, -1).join('_'))} ${agent1Parts.slice(-1)}`;
        const agent2Display = `${formatStrategyName(agent2Parts.slice(0, -1).join('_'))} ${agent2Parts.slice(-1)}`;
        
        row.innerHTML = `
            <td>${agent1Display}</td>
            <td class="move-cell ${interaction.move1 === 'C' ? 'cooperate' : 'defect'}">
                ${interaction.move1 === 'C' ? 'C' : 'D'}
            </td>
            <td>${agent2Display}</td>
            <td class="move-cell ${interaction.move2 === 'C' ? 'cooperate' : 'defect'}">
                ${interaction.move2 === 'C' ? 'C' : 'D'}
            </td>
            <td>${interaction.score1} / ${interaction.score2}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update detailed results table
function updateDetailedResults() {
    const tableBody = document.getElementById('results-table-body');
    if (!tableBody || !simulationResults) return;
    
    tableBody.innerHTML = '';
    
    // Get strategy performance data
    const strategies = Object.keys(simulationResults.strategy_performance);
    
    // Sort strategies by average score (descending)
    strategies.sort((a, b) => {
        return simulationResults.strategy_performance[b].avg_score - 
               simulationResults.strategy_performance[a].avg_score;
    });
    
    // Add rows for each strategy
    strategies.forEach((strategy, index) => {
        const perfData = simulationResults.strategy_performance[strategy];
        const row = document.createElement('tr');
        
        // Highlight top and bottom performers
        if (index === 0) row.classList.add('top-score');
        if (index === strategies.length - 1) row.classList.add('bottom-score');
        
        const totalMoves = perfData.total_cooperation + perfData.total_defection;
        const cooperationRate = totalMoves > 0 ? 
            (perfData.total_cooperation / totalMoves * 100).toFixed(1) + '%' : 'N/A';
        
        row.innerHTML = `
            <td>${formatStrategyName(strategy)}</td>
            <td>${perfData.avg_score.toFixed(2)}</td>
            <td>${cooperationRate}</td>
            <td>${totalMoves}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Toggle pause/resume simulation
function togglePause() {
    const pauseBtn = document.getElementById('pause-btn');
    
    if (simulationInterval) {
        // Currently running, pause it
        clearInterval(simulationInterval);
        simulationInterval = null;
        pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        pauseBtn.classList.replace('btn-primary', 'btn-success');
    } else {
        // Currently paused, resume it
        runSimulationAnimation();
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        pauseBtn.classList.replace('btn-success', 'btn-primary');
    }
}

// Stop simulation
function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    
    // Reset to final state
    currentRound = totalRounds;
    
    // Update UI
    document.getElementById('current-round').textContent = totalRounds;
    
    // Update progress bar
    const progress = 100;
    const progressBar = document.getElementById('round-progress');
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    progressBar.textContent = `${Math.round(progress)}%`;
    
    // Update charts with complete results
    if (typeof updateCharts === 'function') {
        updateCharts(simulationResults, simulationConfig);
    } else {
        console.log("updateCharts function not found in stopSimulation");
        renderFallbackCharts(simulationResults, simulationConfig || {});
    }
    
    // Show final round interactions
    updateInteractionsTable(simulationResults.rounds[totalRounds - 1]);
    
    // Reset pause button
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    pauseBtn.classList.replace('btn-success', 'btn-primary');
}

// Step through simulation one round at a time
function stepSimulation() {
    if (currentRound < totalRounds) {
        currentRound++;
        updateSimulationUI();
    }
}

// Run simulation animation
function runSimulationAnimation() {
    // Reset to beginning
    currentRound = 0;
    
    // Start interval
    simulationInterval = setInterval(() => {
        currentRound++;
        
        // Update UI
        updateSimulationUI();
        
        // Check if simulation is complete
        if (currentRound >= totalRounds) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            
            // Reset pause button
            const pauseBtn = document.getElementById('pause-btn');
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            pauseBtn.classList.replace('btn-success', 'btn-primary');
        }
    }, simulationSpeed);
}

// Fallback chart renderer when updateCharts isn't available
function renderFallbackCharts(results, config) {
    console.log("Using fallback chart renderer");
    
    // Create chart container if it doesn't exist
    let chartContainer = document.getElementById('fallback-charts');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'fallback-charts';
        chartContainer.className = 'mt-4 p-3 border rounded bg-light';
        
        // Find a good place to add it to the DOM
        const resultsArea = document.getElementById('results-area') || 
                           document.getElementById('simulation-results') || 
                           document.getElementById('simulation-status').parentNode;
        
        if (resultsArea) {
            resultsArea.appendChild(chartContainer);
        } else {
            // If we can't find a good container, add it after the simulation status
            document.getElementById('simulation-status').insertAdjacentElement('afterend', chartContainer);
        }
    }
    
    // Clear previous content
    chartContainer.innerHTML = '';
    
    // Add title
    const title = document.createElement('h4');
    title.textContent = 'Simulation Results Summary';
    chartContainer.appendChild(title);
    
    // Add summary data
    if (results.strategy_performance) {
        const strategyTable = document.createElement('table');
        strategyTable.className = 'table table-striped table-sm mt-3';
        
        // Add header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Strategy</th>
                <th>Average Score</th>
                <th>Cooperation %</th>
                <th>Total Moves</th>
            </tr>
        `;
        strategyTable.appendChild(thead);
        
        // Add body
        const tbody = document.createElement('tbody');
        
        // Get strategies sorted by performance
        const strategies = Object.keys(results.strategy_performance);
        strategies.sort((a, b) => {
            return results.strategy_performance[b].avg_score - 
                   results.strategy_performance[a].avg_score;
        });
        
        // Add rows
        strategies.forEach((strategy) => {
            const data = results.strategy_performance[strategy];
            const row = document.createElement('tr');
            
            const totalMoves = data.total_cooperation + data.total_defection;
            const cooperationRate = totalMoves > 0 ? 
                (data.total_cooperation / totalMoves * 100).toFixed(1) + '%' : 'N/A';
            
            row.innerHTML = `
                <td>${formatStrategyName ? formatStrategyName(strategy) : strategy}</td>
                <td>${data.avg_score.toFixed(2)}</td>
                <td>${cooperationRate}</td>
                <td>${totalMoves}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        strategyTable.appendChild(tbody);
        chartContainer.appendChild(strategyTable);
    }
    
    // Add cooperation/defection summary
    if (results.overall_cooperation !== undefined && results.overall_defection !== undefined) {
        const total = results.overall_cooperation + results.overall_defection;
        const coopPercent = total > 0 ? (results.overall_cooperation / total * 100).toFixed(1) : 0;
        const defectPercent = total > 0 ? (results.overall_defection / total * 100).toFixed(1) : 0;
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mt-3';
        summaryDiv.innerHTML = `
            <h5>Overall Cooperation/Defection</h5>
            <div class="progress" style="height: 25px;">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${coopPercent}%" 
                     aria-valuenow="${coopPercent}" aria-valuemin="0" aria-valuemax="100">
                    Cooperation: ${coopPercent}%
                </div>
                <div class="progress-bar bg-danger" role="progressbar" style="width: ${defectPercent}%" 
                     aria-valuenow="${defectPercent}" aria-valuemin="0" aria-valuemax="100">
                    Defection: ${defectPercent}%
                </div>
            </div>
            <div class="small text-muted mt-1">
                Total Moves: ${total} (Cooperation: ${results.overall_cooperation}, Defection: ${results.overall_defection})
            </div>
        `;
        
        chartContainer.appendChild(summaryDiv);
    }
    
    // Add config summary
    const configDiv = document.createElement('div');
    configDiv.className = 'mt-3 small';
    configDiv.innerHTML = `
        <h5>Configuration</h5>
        <div><strong>Game Type:</strong> ${config.game_type || 'Not specified'}</div>
        <div><strong>Rounds:</strong> ${config.rounds || 'Not specified'}</div>
        <div><strong>Strategies:</strong> ${Object.entries(config.strategies || {}).map(([strategy, count]) => 
            `${formatStrategyName ? formatStrategyName(strategy) : strategy}: ${count}`).join(', ') || 'None'}</div>
    `;
    
    if (config.payoffs) {
        configDiv.innerHTML += `
            <div><strong>Payoffs:</strong> T=${config.payoffs.T}, R=${config.payoffs.R}, P=${config.payoffs.P}, S=${config.payoffs.S}</div>
        `;
    }
    
    chartContainer.appendChild(configDiv);
}

// Utility function to format strategy names to be more readable
function formatStrategyName(strategy) {
    if (!strategy) return '';
    
    // Convert snake_case to Title Case with spaces
    return strategy
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Update simulation UI based on current round
function updateSimulationUI() {
    // Update round counter
    if (document.getElementById('current-round')) {
        document.getElementById('current-round').textContent = currentRound;
    }
    
    // Update progress bar
    const progressBar = document.getElementById('round-progress');
    if (progressBar) {
        const progress = (currentRound / totalRounds) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressBar.textContent = `${Math.round(progress)}%`;
    }
    
    // Update interactions table for current round
    if (currentRound > 0 && simulationResults && simulationResults.rounds && 
        simulationResults.rounds.length >= currentRound) {
        updateInteractionsTable(simulationResults.rounds[currentRound - 1]);
    }
    
    // Create partial results for chart animation
    const partialResults = {
        rounds: simulationResults.rounds ? simulationResults.rounds.slice(0, currentRound) : [],
        scores: {},
        strategy_performance: simulationResults.strategy_performance || {},
        overall_cooperation: 0,
        overall_defection: 0
    };
    
    // Partial scores
    if (simulationResults && simulationResults.scores) {
        for (const agentId in simulationResults.scores) {
            partialResults.scores[agentId] = simulationResults.scores[agentId].slice(0, currentRound);
        }
    }
    
    // Calculate partial cooperation/defection totals
    if (simulationResults && simulationResults.rounds) {
        for (let i = 0; i < currentRound; i++) {
            if (i >= simulationResults.rounds.length) break;
            
            const round = simulationResults.rounds[i];
            if (round && round.interactions) {
                round.interactions.forEach(interaction => {
                    if (interaction.move1 === 'C') partialResults.overall_cooperation++;
                    else partialResults.overall_defection++;
                    
                    if (interaction.move2 === 'C') partialResults.overall_cooperation++;
                    else partialResults.overall_defection++;
                });
            }
        }
    }
    
    // Update charts with partial results
    if (typeof updateCharts === 'function') {
        updateCharts(partialResults, simulationConfig);
    } else {
        console.log("updateCharts function not found, skipping partial update");
        renderFallbackCharts(partialResults, simulationConfig || {});
    }
}

/**
 * Update charts with simulation results
 * @param {Object} results - Simulation results data
 * @param {Object} config - Simulation configuration
 */
function updateCharts(results, config) {
    console.log("Updating charts with results:", results);
    
    try {
        // Clean up any existing Chart instances
        destroyExistingCharts();
        
        // Get the chart data from results
        const scoresData = prepareScoresChartData(results);
        const strategyScoreData = prepareStrategyScoreData(results);
        const cooperationData = prepareCooperationChartData(results);
        const strategyCooperationData = prepareStrategyCooperationData(results);
        
        // Create charts - use the actual IDs from the HTML
        if (document.getElementById('score-chart')) {
            console.log("Creating score-chart");
            window.scoresChart = createLineChart(
                'score-chart',
                scoresData,
                'Agent Scores Over Rounds',
                'Score'
            );
        } else {
            console.log("score-chart element not found!");
        }
        
        if (document.getElementById('strategy-performance-chart')) {
            console.log("Creating strategy-performance-chart");
            window.strategyScoreChart = createBarChart(
                'strategy-performance-chart',
                strategyScoreData,
                'Average Score by Strategy',
                'Score'
            );
        } else {
            console.log("strategy-performance-chart element not found!");
        }
        
        if (document.getElementById('cooperation-chart')) {
            console.log("Creating cooperation-chart");
            window.cooperationChart = createPieChart(
                'cooperation-chart',
                cooperationData,
                'Overall Cooperation vs Defection'
            );
        } else {
            console.log("cooperation-chart element not found!");
        }
        
        if (document.getElementById('interaction-chart')) {
            console.log("Creating interaction-chart");
            window.strategyCooperationChart = createBarChart(
                'interaction-chart',
                strategyCooperationData,
                'Strategy Cooperation Rates',
                'Cooperation %'
            );
        } else {
            console.log("interaction-chart element not found!");
        }
    } catch (error) {
        console.error("Error creating charts:", error);
    }
}

/**
 * Destroys any existing Chart.js instances
 */
function destroyExistingCharts() {
    // Destroy existing charts to prevent memory leaks
    if (window.scoresChart) window.scoresChart.destroy();
    if (window.strategyScoreChart) window.strategyScoreChart.destroy();
    if (window.cooperationChart) window.cooperationChart.destroy();
    if (window.strategyCooperationChart) window.strategyCooperationChart.destroy();
}

/**
 * Prepare data for scores chart
 * @param {Object} results - Simulation results
 * @returns {Object} Chart data object
 */
function prepareScoresChartData(results) {
    if (!results || !results.rounds || !results.scores) {
        return { labels: [], datasets: [] };
    }
    
    // Create round labels (1 to total rounds)
    const labels = Array.from({ length: results.rounds.length }, (_, i) => i + 1);
    
    // Create datasets for each agent
    const datasets = [];
    const agents = Object.keys(results.scores);
    
    agents.forEach((agentId, index) => {
        // For agents with underscores, extract the strategy type
        const agentParts = agentId.split('_');
        const strategy = agentParts.slice(0, -1).join('_');
        const agentNum = agentParts.slice(-1)[0];
        
        const color = getStrategyColor(strategy, index);
        const borderColor = getStrategyBorderColor(strategy, index);
        
        datasets.push({
            label: `${formatStrategyName(strategy)} ${agentNum}`,
            data: results.scores[agentId],
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5
        });
    });
    
    return {
        labels: labels,
        datasets: datasets
    };
}

/**
 * Prepare data for strategy score chart
 * @param {Object} results - Simulation results
 * @returns {Object} Chart data object
 */
function prepareStrategyScoreData(results) {
    if (!results || !results.strategy_performance) {
        return { labels: [], datasets: [] };
    }
    
    // Get strategies and sort by average score
    const strategies = Object.keys(results.strategy_performance);
    strategies.sort((a, b) => {
        return results.strategy_performance[b].avg_score - 
               results.strategy_performance[a].avg_score;
    });
    
    // Prepare data
    const labels = strategies.map(strategy => formatStrategyName(strategy));
    const data = strategies.map(strategy => results.strategy_performance[strategy].avg_score);
    const backgroundColor = strategies.map((strategy, index) => getStrategyColor(strategy, index));
    const borderColor = strategies.map((strategy, index) => getStrategyBorderColor(strategy, index));
    
    return {
        labels: labels,
        datasets: [{
            label: 'Average Score',
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2
        }]
    };
}

/**
 * Prepare data for cooperation vs defection chart
 * @param {Object} results - Simulation results
 * @returns {Object} Chart data object
 */
function prepareCooperationChartData(results) {
    if (!results || results.overall_cooperation === undefined || results.overall_defection === undefined) {
        return { labels: [], datasets: [] };
    }
    
    return {
        labels: ['Cooperation', 'Defection'],
        datasets: [{
            data: [results.overall_cooperation, results.overall_defection],
            backgroundColor: [
                'rgba(75, 192, 192, 0.7)',  // Green for cooperation
                'rgba(255, 99, 132, 0.7)'   // Red for defection
            ],
            borderColor: [
                'rgb(75, 192, 192)',
                'rgb(255, 99, 132)'
            ],
            borderWidth: 2
        }]
    };
}

/**
 * Prepare data for strategy cooperation rates chart
 * @param {Object} results - Simulation results
 * @returns {Object} Chart data object
 */
function prepareStrategyCooperationData(results) {
    if (!results || !results.strategy_performance) {
        return { labels: [], datasets: [] };
    }
    
    // Get strategies and sort by cooperation rate
    const strategies = Object.keys(results.strategy_performance);
    strategies.sort((a, b) => {
        const aRate = calculateCooperationRate(results.strategy_performance[a]);
        const bRate = calculateCooperationRate(results.strategy_performance[b]);
        return bRate - aRate;
    });
    
    // Prepare data
    const labels = strategies.map(strategy => formatStrategyName(strategy));
    const data = strategies.map(strategy => 
        calculateCooperationRate(results.strategy_performance[strategy]) * 100
    );
    const backgroundColor = strategies.map((strategy, index) => getStrategyColor(strategy, index));
    const borderColor = strategies.map((strategy, index) => getStrategyBorderColor(strategy, index));
    
    return {
        labels: labels,
        datasets: [{
            label: 'Cooperation Rate (%)',
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2
        }]
    };
}

/**
 * Calculate cooperation rate for a strategy
 * @param {Object} strategyData - Strategy performance data
 * @returns {number} Cooperation rate (0 to 1)
 */
function calculateCooperationRate(strategyData) {
    if (!strategyData) return 0;
    
    const total = strategyData.total_cooperation + strategyData.total_defection;
    if (total === 0) return 0;
    
    return strategyData.total_cooperation / total;
}

/**
 * Get color for a strategy with fallback
 * @param {string} strategy - Strategy name
 * @param {number} index - Fallback index
 * @returns {string} Color string
 */
function getStrategyColor(strategy, index) {
    if (!strategy) return window.chartColors ? window.chartColors[index % window.chartColors.length] : 'rgba(54, 162, 235, 0.7)';
    
    if (window.strategyColors && window.strategyColors[strategy]) {
        return window.strategyColors[strategy];
    }
    
    // Fallback colors
    const defaultColors = [
        'rgba(54, 162, 235, 0.7)',    // Blue
        'rgba(255, 99, 132, 0.7)',    // Red
        'rgba(75, 192, 192, 0.7)',    // Green
        'rgba(255, 159, 64, 0.7)',    // Orange
        'rgba(153, 102, 255, 0.7)',   // Purple
        'rgba(255, 205, 86, 0.7)',    // Yellow
        'rgba(201, 203, 207, 0.7)',   // Grey
        'rgba(255, 99, 255, 0.7)',    // Pink
        'rgba(99, 255, 132, 0.7)',    // Mint
        'rgba(100, 149, 237, 0.7)'    // Cornflower Blue
    ];
    
    return defaultColors[index % defaultColors.length];
}

/**
 * Get border color for a strategy with fallback
 * @param {string} strategy - Strategy name
 * @param {number} index - Fallback index
 * @returns {string} Color string
 */
function getStrategyBorderColor(strategy, index) {
    if (!strategy) return window.chartBorderColors ? window.chartBorderColors[index % window.chartBorderColors.length] : 'rgb(54, 162, 235)';
    
    if (window.strategyBorderColors && window.strategyBorderColors[strategy]) {
        return window.strategyBorderColors[strategy];
    }
    
    // Fallback colors
    const defaultBorderColors = [
        'rgb(54, 162, 235)',   // Blue
        'rgb(255, 99, 132)',   // Red
        'rgb(75, 192, 192)',   // Green
        'rgb(255, 159, 64)',   // Orange
        'rgb(153, 102, 255)',  // Purple
        'rgb(255, 205, 86)',   // Yellow
        'rgb(201, 203, 207)',  // Grey
        'rgb(255, 99, 255)',   // Pink
        'rgb(99, 255, 132)',   // Mint
        'rgb(100, 149, 237)'   // Cornflower Blue
    ];
    
    return defaultBorderColors[index % defaultBorderColors.length];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeSimulationController);
