// Social Dilemmas Simulation JavaScript

// Chart objects will be stored here for later access (e.g., for updates)
let dilemmaCharts = {
    // Basic charts
    chart1: null, // Resource chart
    chart2: null, // Payoffs chart
    chart3: null, // Strategy performance chart
    
    // Advanced charts
    tcRegenChart: null,      // Tragedy of Commons - Regeneration vs. Harvest
    frCompletionChart: null, // Free Rider - Project Completion Rate
    pgPoolChart: null,       // Public Goods - Common Pool Growth
    
    // Distribution charts
    distributionChart: null, // Final resource distribution
    actionsChart: null,      // Strategy action distribution
};

// Make sure Bootstrap is loaded before initializing
function ensureBootstrap(callback) {
    if (typeof bootstrap !== 'undefined') {
        // Bootstrap is already loaded
        console.log("Bootstrap is loaded, initializing page...");
        callback();
    } else {
        // Wait a bit and try again
        console.log("Waiting for Bootstrap to load...");
        setTimeout(function() {
            ensureBootstrap(callback);
        }, 100);
    }
}

// This will run when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded, checking for Bootstrap...");
    // Wait for Bootstrap to be available
    ensureBootstrap(initializePage);
    
    // Add tab switching event listeners to ensure charts render properly
    document.querySelectorAll('.nav-link[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            console.log("Tab switched to:", event.target.id);
            
            // Make all chart canvases in the current tab visible
            if (event.target.dataset.bsTarget) {
                const tabId = event.target.dataset.bsTarget;
                const tabPane = document.querySelector(tabId);
                
                if (tabPane) {
                    // Force display block on the tab pane
                    tabPane.style.display = 'block';
                    
                    // Find all canvases in this tab and ensure they're visible
                    const canvases = tabPane.querySelectorAll('canvas');
                    canvases.forEach(canvas => {
                        if (canvas) {
                            canvas.style.width = '100%';
                            canvas.style.height = '100%';
                            canvas.style.display = 'block';
                        }
                    });
                    
                    console.log(`Made ${canvases.length} canvases visible in tab ${tabId}`);
                    
                    // Trigger a resize event to redraw charts
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'));
                        
                        // If we're in either advanced or distribution tab, try to force redraw the charts
                        if (event.target.id === 'advanced-charts-tab') {
                            console.log("Forcing redraw of advanced charts");
                            if (window.simulationResults) {
                                // Remove any existing charts first
                                const chartContainer = document.getElementById('advanced-charts');
                                if (chartContainer) {
                                    const canvas1 = document.getElementById('dilemma-sustainability-chart');
                                    const canvas2 = document.getElementById('dilemma-welfare-chart');
                                    
                                    // Make sure canvases are fully visible
                                    if (canvas1) {
                                        canvas1.style.display = 'block';
                                        canvas1.style.visibility = 'visible';
                                        canvas1.style.height = '450px';
                                    }
                                    
                                    if (canvas2) {
                                        canvas2.style.display = 'block';
                                        canvas2.style.visibility = 'visible';
                                        canvas2.style.height = '450px';
                                    }
                                    
                                    // Destroy existing charts
                                    if (canvas1 && window.dilemmaCharts && window.dilemmaCharts.sustainabilityChart) {
                                        window.dilemmaCharts.sustainabilityChart.destroy();
                                        window.dilemmaCharts.sustainabilityChart = null;
                                    }
                                    if (canvas2 && window.dilemmaCharts && window.dilemmaCharts.welfareChart) {
                                        window.dilemmaCharts.welfareChart.destroy();
                                        window.dilemmaCharts.welfareChart = null;
                                    }
                                }
                                
                                // Add a small delay to ensure the DOM is fully ready
                                setTimeout(() => {
                                    if (typeof window.renderAdvancedCharts === 'function') {
                                        window.renderAdvancedCharts(window.simulationResults);
                                    }
                                }, 50);
                            }
                        }
                        
                        if (event.target.id === 'distribution-charts-tab') {
                            console.log("Forcing redraw of distribution charts");
                            if (window.simulationResults) {
                                // Remove any existing charts first
                                const chartContainer = document.getElementById('distribution-charts');
                                if (chartContainer) {
                                    const canvas1 = document.getElementById('dilemma-distribution-chart');
                                    const canvas2 = document.getElementById('dilemma-actions-chart');
                                    
                                    // Make sure canvases are fully visible
                                    if (canvas1) {
                                        canvas1.style.display = 'block';
                                        canvas1.style.visibility = 'visible';
                                        canvas1.style.height = '450px';
                                    }
                                    
                                    if (canvas2) {
                                        canvas2.style.display = 'block';
                                        canvas2.style.visibility = 'visible';
                                        canvas2.style.height = '450px';
                                    }
                                    
                                    // Destroy existing charts
                                    if (canvas1 && window.dilemmaCharts && window.dilemmaCharts.distributionChart) {
                                        window.dilemmaCharts.distributionChart.destroy();
                                        window.dilemmaCharts.distributionChart = null;
                                    }
                                    if (canvas2 && window.dilemmaCharts && window.dilemmaCharts.actionsChart) {
                                        window.dilemmaCharts.actionsChart.destroy();
                                        window.dilemmaCharts.actionsChart = null;
                                    }
                                }
                                
                                // Add a small delay to ensure the DOM is fully ready
                                setTimeout(() => {
                                    if (typeof window.renderDistributionCharts === 'function') {
                                        window.renderDistributionCharts(window.simulationResults);
                                    }
                                }, 50);
                            }
                        }
                    }, 100);
                }
            }
        });
    });
});

// Main initialization function that will run when Bootstrap is ready
function initializePage() {
    console.log("Initializing page with Bootstrap loaded...");
    // Get URL parameter for dilemma if present
    const urlParams = new URLSearchParams(window.location.search);
    const dilemmaParam = urlParams.get('dilemma');
    
    // Set initial dilemma type based on URL parameter if present
    if (dilemmaParam && ['tragedy_commons', 'free_rider', 'public_goods'].includes(dilemmaParam)) {
        const dilemmaTypeSelect = document.getElementById('dilemma-type');
        if (dilemmaTypeSelect) {
            dilemmaTypeSelect.value = dilemmaParam;
            // Trigger change event to update UI
            const event = new Event('change');
            dilemmaTypeSelect.dispatchEvent(event);
        }
    }
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            html: true,
            container: 'body',
            trigger: 'hover focus'
        });
    });
    
    // Initialize toast component with error handling
    const toastEl = document.getElementById('notification-toast');
    let toast;
    try {
        toast = new bootstrap.Toast(toastEl);
    } catch (e) {
        console.error("Toast initialization error:", e);
        // Create a fallback notification function if toast fails
        window.showNotificationFallback = function(title, message) {
            alert(title + ": " + message);
        }
    }
    
    // Render simulation results with dynamic charts for all dilemma types
    function renderSimulationResults(data) {
        console.log("Rendering simulation results:", data);
        
        try {
            // Clear previous charts to prevent memory leaks
            Object.keys(dilemmaCharts).forEach(key => {
                if (dilemmaCharts[key]) {
                    dilemmaCharts[key].destroy();
                    dilemmaCharts[key] = null;
                }
            });
            
            // Show results container
            const resultsContainer = document.getElementById('dilemma-charts-container');
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
            
            // Update status
            const statusElement = document.getElementById('dilemma-status');
            if (statusElement) {
                statusElement.innerHTML = `<div class="alert alert-success">Simulation completed successfully!</div>`;
            }
            
            // Determine which dilemma-specific charts to show
            const dilemmaType = data.config.dilemma_type;
            
            // Hide all dilemma-specific charts first
            document.querySelectorAll('.dilemma-specific-chart').forEach(chart => {
                chart.style.display = 'none';
            });
            
            // Show appropriate dilemma-specific charts
            if (dilemmaType === 'tragedy_commons') {
                document.querySelectorAll('.tc-specific').forEach(chart => {
                    chart.style.display = 'block';
                });
                renderTragedyCommonsCharts(data);
            } else if (dilemmaType === 'free_rider') {
                document.querySelectorAll('.fr-specific').forEach(chart => {
                    chart.style.display = 'block';
                });
                renderFreeRiderCharts(data);
            } else if (dilemmaType === 'public_goods') {
                document.querySelectorAll('.pg-specific').forEach(chart => {
                    chart.style.display = 'block';
                });
                renderPublicGoodsCharts(data);
            }
            
            // Always render common charts (strategy performance, distribution)
            renderCommonCharts(data);
            
            // Display raw JSON data in pre-formatted container if it exists
            const rawJsonContainer = document.getElementById('raw-json');
            if (rawJsonContainer) {
                rawJsonContainer.textContent = JSON.stringify(data, null, 2);
            }
            
        } catch (error) {
            console.error("Error rendering simulation results:", error);
            const statusElement = document.getElementById('dilemma-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error rendering simulation results: ${error.message}
                    </div>
                `;
            }
        }
    }
    
    // Render Tragedy of Commons specific charts
    function renderTragedyCommonsCharts(data) {
        const roundData = data.results.rounds || {};
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Resource Chart - Shows how the common resource changes over time
        const resourceChartData = {
            labels: Object.keys(roundData).map(Number).sort((a, b) => a - b),
            datasets: [{
                label: 'Resource Size',
                data: Object.keys(roundData).map(round => roundData[round].resource_size || 0),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        };
        
        dilemmaCharts.chart1 = createLineChart('dilemma-chart1', resourceChartData, 'Resource Size Over Time', 'Resource Units');
        
        // Regeneration vs. Harvest Chart
        const regenHarvestData = {
            labels: Object.keys(roundData).map(Number).sort((a, b) => a - b),
            datasets: [
                {
                    label: 'Regeneration',
                    data: Object.keys(roundData).map(round => roundData[round].regeneration || 0),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Total Harvest',
                    data: Object.keys(roundData).map(round => roundData[round].total_harvest || 0),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        };
        
        dilemmaCharts.tcRegenChart = createLineChart('tc-regen-chart', regenHarvestData, 
            'Resource Regeneration vs. Harvest Rate', 'Resource Units');
            
        // Strategy Harvest Comparison
        const harvestData = prepareLineChartData(roundData, strategies, 'harvest');
        dilemmaCharts.chart2 = createLineChart('dilemma-chart2', harvestData, 'Strategy Harvest Over Time', 'Resource Units');
    }
    
    // Render Free Rider specific charts
    function renderFreeRiderCharts(data) {
        const roundData = data.results.rounds || {};
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Project Completion Chart
        const completionData = {
            labels: Object.keys(roundData).map(Number).sort((a, b) => a - b),
            datasets: [{
                label: 'Project Completion',
                data: Object.keys(roundData).map(round => {
                    const funds = roundData[round].project_funds || 0;
                    const cost = data.config.parameters.project_cost || 100;
                    return Math.min(100, (funds / cost) * 100);
                }),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        };
        
        dilemmaCharts.chart1 = createLineChart('dilemma-chart1', completionData, 'Project Completion Over Time', 'Completion %');
        
        // Contributions Chart
        const contributionData = prepareLineChartData(roundData, strategies, 'contribution');
        dilemmaCharts.frCompletionChart = createLineChart('fr-completion-chart', contributionData, 
            'Strategy Contributions Over Time', 'Contribution Amount');
            
        // Payoff Chart
        const payoffData = prepareLineChartData(roundData, strategies, 'payoff');
        dilemmaCharts.chart2 = createLineChart('dilemma-chart2', payoffData, 'Strategy Payoffs Over Time', 'Payoff Amount');
    }
    
    // Render Public Goods specific charts
    function renderPublicGoodsCharts(data) {
        const roundData = data.results.rounds || {};
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Common Pool Growth Chart
        const poolData = {
            labels: Object.keys(roundData).map(Number).sort((a, b) => a - b),
            datasets: [{
                label: 'Common Pool',
                data: Object.keys(roundData).map(round => roundData[round].pool_size || 0),
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        };
        
        dilemmaCharts.chart1 = createLineChart('dilemma-chart1', poolData, 'Common Pool Size Over Time', 'Resources');
        
        // Pool Growth Chart
        dilemmaCharts.pgPoolChart = createLineChart('pg-pool-chart', poolData, 'Common Pool Growth', 'Pool Size');
        
        // Contribution Chart
        const contributionData = prepareLineChartData(roundData, strategies, 'contribution');
        dilemmaCharts.chart2 = createLineChart('dilemma-chart2', contributionData, 'Contribution by Strategy Over Time', 'Contribution Amount');
    }
    
    // Common charts for all dilemma types
    function renderCommonCharts(data) {
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Strategy performance chart (score/payoff by strategy)
        const performanceData = prepareBarChartData(finalStats, 'score');
        dilemmaCharts.chart3 = createBarChart('dilemma-chart3', performanceData, 'Final Strategy Performance', 'Score');
        
        // Distribution chart (pie chart of final resources)
        const distributionData = preparePieChartData(finalStats, 'total_resources');
        dilemmaCharts.distributionChart = createPieChart('dilemma-distribution-chart', distributionData, 'Final Resource Distribution');
        
        // Actions distribution chart
        let actionKey = 'actions';
        switch(data.config.dilemma_type) {
            case 'tragedy_commons':
                actionKey = 'harvest_pattern';
                break;
            case 'free_rider':
                actionKey = 'contribution_pattern';
                break;
            case 'public_goods':
                actionKey = 'contribution_pattern';
                break;
        }
        
        // Create a dataset of all actions taken
        const actionLabels = ['Cooperative', 'Selfish', 'Adaptive', 'Other'];
        const actionData = {
            labels: actionLabels,
            datasets: [{
                data: actionLabels.map(label => {
                    let count = 0;
                    strategies.forEach(strategy => {
                        const stratData = finalStats.strategies[strategy][actionKey] || {};
                        count += stratData[label.toLowerCase()] || 0;
                    });
                    return count;
                }),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',  // Cooperative - Green
                    'rgba(255, 99, 132, 0.7)',  // Selfish - Red
                    'rgba(54, 162, 235, 0.7)',  // Adaptive - Blue
                    'rgba(255, 159, 64, 0.7)'   // Other - Orange
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 159, 64)'
                ],
                borderWidth: 1
            }]
        };
        
        dilemmaCharts.actionsChart = createDoughnutChart('dilemma-actions-chart', actionData, 'Strategy Action Distribution');
    }
    
    // Pre-populate any results from session storage (after back navigation)
    try {
        const savedResults = sessionStorage.getItem('dilemmaResults');
        if (savedResults) {
            const data = JSON.parse(savedResults);
            renderSimulationResults(data);
        }
    } catch (e) {
        console.error("Error loading saved results:", e);
    }
    
    // Function to show results section and scroll to it
    function showResultsSection() {
        const resultsSection = document.getElementById('dilemma-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            // Scroll to results section
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            
            // Hide the placeholder message
            const placeholderMsg = document.querySelector('.results-placeholder');
            if (placeholderMsg) {
                placeholderMsg.style.display = 'none';
            }
            
            console.log("Results section displayed and scrolled into view");
        } else {
            console.error("Results section element not found");
        }
    }
    
    // Check if the page was loaded with simulation results
    try {
        if (typeof simulationResults !== 'undefined' && simulationResults) {
            console.log("Found simulation results on page load:", simulationResults);
            setTimeout(() => {
                renderSimulationResults(simulationResults);
                showResultsSection();
                
                // Store in session storage for back navigation
                sessionStorage.setItem('dilemmaResults', JSON.stringify(simulationResults));
            }, 500); // Add a short delay to ensure DOM is ready
        }
    } catch (e) {
        console.error("Error handling simulation results:", e);
    }
    
    // Configure dilemma type selector to show appropriate config panel
    const dilemmaType = document.getElementById('dilemma-type');
    const configs = document.querySelectorAll('.dilemma-config');
    
    // Function to show the appropriate configuration panel
    function showSelectedDilemmaConfig() {
        try {
            const selectedValue = dilemmaType.value;
            console.log(`Showing config for: ${selectedValue}`);
            
            // Hide all config panels first using class selector
            document.querySelectorAll('.dilemma-config').forEach(panel => {
                panel.style.display = 'none';
                console.log(`Hidden config panel: ${panel.id}`);
            });
            
            // Show selected panel - convert underscore to hyphen for HTML ID
            const configId = selectedValue.replace(/_/g, '-') + '-config';
            const selectedConfig = document.getElementById(configId);
            
            console.log(`Looking for config panel with ID: ${configId}`);
            
            if (selectedConfig) {
                selectedConfig.style.display = 'block';
                console.log(`Displayed config panel: ${selectedConfig.id}`);
                
                // Reset strategy inputs to default values if they're empty
                const strategyInputs = selectedConfig.querySelectorAll('.social-strategy-count');
                let totalSet = 0;
                strategyInputs.forEach(input => {
                    const val = parseInt(input.value);
                    if (isNaN(val) || val <= 0) {
                        input.value = 5; // Default value
                    }
                    totalSet += parseInt(input.value);
                });
                
                if (totalSet <= 0) {
                    // If still no agents, set default values
                    strategyInputs.forEach(input => {
                        input.value = 5;
                    });
                }
            } else {
                console.error(`Config panel not found for ID: ${configId}`);
                
                // Debugging - list all available panels
                console.log("Available panels:");
                document.querySelectorAll('.dilemma-config').forEach(panel => {
                    console.log(`- ${panel.id}`);
                });
            }
            
            // Update agent counts based on visible panel
            updateDilemmaTotalAgents();
        } catch (e) {
            console.error("Error showing dilemma config:", e);
        }
    }
    
    // Initialize the correct panel on page load
    showSelectedDilemmaConfig();
    
    // Set initial values for all strategy inputs
    document.querySelectorAll('.social-strategy-count').forEach(input => {
        if (!input.value || parseInt(input.value) < 0) {
            input.value = 5;
        }
    });
    
    // Update agent counts after setting initial values
    updateDilemmaTotalAgents();
    
    // Add change event listener
    dilemmaType.addEventListener('change', showSelectedDilemmaConfig);
    
    // Update total agents for each dilemma type
    function updateDilemmaTotalAgents() {
        console.log("Updating total agent counts for all dilemma types");
        
        // For Tragedy of Commons
        const tcInputs = document.querySelectorAll('#tragedy-commons-config .social-strategy-count');
        let tcTotal = 0;
        tcInputs.forEach(input => {
            // Check if input value is valid
            let value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                value = 5; // Default value
                input.value = value;
            }
            tcTotal += value;
        });
        console.log(`Tragedy Commons total agents: ${tcTotal}`);
        
        // Generic method to show total - may be shared between dilemmas
        let totalElement = document.getElementById('dilemma-total-agents');
        if (totalElement) totalElement.textContent = tcTotal;
        
        // Specific total element for this dilemma
        let specificTcTotal = document.getElementById('tc-total-agents');
        if (specificTcTotal) specificTcTotal.textContent = tcTotal;
        
        // For Free Rider
        const frInputs = document.querySelectorAll('#free-rider-config .social-strategy-count');
        let frTotal = 0;
        frInputs.forEach(input => {
            let value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                value = 5; // Default value
                input.value = value;
            }
            frTotal += value;
        });
        console.log(`Free Rider total agents: ${frTotal}`);
        
        const frTotalElement = document.getElementById('fr-total-agents');
        if (frTotalElement) frTotalElement.textContent = frTotal;
        
        // For Public Goods
        const pgInputs = document.querySelectorAll('#public-goods-config .social-strategy-count');
        let pgTotal = 0;
        pgInputs.forEach(input => {
            let value = parseInt(input.value);
            if (isNaN(value) || value < 0) {
                value = 5; // Default value
                input.value = value;
            }
            pgTotal += value;
        });
        console.log(`Public Goods total agents: ${pgTotal}`);
        
        const pgTotalElement = document.getElementById('pg-total-agents');
        if (pgTotalElement) pgTotalElement.textContent = pgTotal;
        
        // Update generic total based on current selection
        const currentDilemma = document.getElementById('dilemma-type').value;
        if (currentDilemma === 'tragedy_commons' && totalElement) {
            totalElement.textContent = tcTotal;
            console.log(`Total agents for ${currentDilemma}: ${tcTotal}`);
        } else if (currentDilemma === 'free_rider' && totalElement) {
            totalElement.textContent = frTotal;
            console.log(`Total agents for ${currentDilemma}: ${frTotal}`);
        } else if (currentDilemma === 'public_goods' && totalElement) {
            totalElement.textContent = pgTotal;
            console.log(`Total agents for ${currentDilemma}: ${pgTotal}`);
        }
    }
    
    // Add event listeners to all agent count inputs
    const strategyInputs = document.querySelectorAll('.social-strategy-count');
    strategyInputs.forEach(input => {
        input.addEventListener('change', updateDilemmaTotalAgents);
    });
    
    // Save configuration button
    const saveBtn = document.getElementById('save-dilemma-btn');
    saveBtn.addEventListener('click', function() {
        if (!validateForm()) return;
        
        const configData = collectFormData();
        
        // Send to backend
        fetch('/api/social-dilemma/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Success', 'social-dilemmas: Configuration saved successfully!', 'success');
            } else {
                showNotification('Error', data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error', 'Failed to save configuration', 'danger');
        });
    });
    
    // Run simulation button with simpler direct implementation
    const runBtn = document.getElementById('run-dilemma-btn');
    if (runBtn) {
        runBtn.addEventListener('click', function(e) {
            console.log("Run simulation button clicked");
            e.preventDefault(); // Prevent default in case this is inside a form
            
            if (!validateForm()) {
                console.log("Form validation failed");
                return;
            }
            
            try {
                const configData = collectFormData();
                console.log("Config data collected:", configData);
                
                // Update UI for simulation start
                const statusElement = document.getElementById('dilemma-status');
                if (statusElement) {
                    statusElement.innerHTML = `
                        <div class="d-flex justify-content-center">
                            <div class="spinner-border text-primary me-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span>Running simulation...</span>
                        </div>
                    `;
                }
                
                // Show simulation controls if they exist
                const controlsElement = document.getElementById('dilemma-controls');
                if (controlsElement) {
                    controlsElement.style.display = 'flex';
                }
                
                // Instead of form submission, use fetch with JSON
                console.log("Sending simulation request via fetch");
                
                // Use fetch with JSON to prevent page reload
                console.log("Sending simulation config:", configData);
                
                fetch('/api/social-dilemma/simulate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({config: configData})
                })
                .then(response => {
                    console.log(`Server response status: ${response.status}`);
                    
                    // Check if response is ok (status in the range 200-299)
                    if (!response.ok) {
                        if (response.status === 400) {
                            return response.json().then(errorData => {
                                throw new Error(`Bad request: ${errorData.error || 'Invalid input'}`);
                            });
                        } else if (response.status === 500) {
                            return response.json().then(errorData => {
                                console.error("Server error details:", errorData);
                                throw new Error(`Server error: ${errorData.error || 'Unknown error'}`);
                            });
                        } else {
                            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                        }
                    }
                    
                    return response.json();
                })
                .then(data => {
                    console.log("Simulation response:", data);
                    if (data.success) {
                        // Store the data in a global variable for tab switching
                        window.simulationResults = {
                            config: configData,
                            results: data.results
                        };
                        console.log("Stored simulation results in global variable:", window.simulationResults);
                        
                        // Display the results
                        displayDilemmaResults(data.results, configData);
                        
                        // Show success notification
                        showNotification('Success', 'Simulation completed successfully!', 'success');
                        
                        // Scroll to results
                        document.getElementById('dilemma-results-section').scrollIntoView({ behavior: 'smooth' });
                    } else {
                        const errorMessage = data.error || 'Unknown error running simulation';
                        showNotification('Error', errorMessage, 'danger');
                        console.error("Simulation error:", errorMessage);
                        
                        // Clear the loading indicator
                        const statusElement = document.getElementById('dilemma-status');
                        if (statusElement) {
                            statusElement.innerHTML = `<div class="alert alert-danger">Error: ${errorMessage}</div>`;
                        }
                    }
                })
                .catch(error => {
                    console.error("Fetch error:", error);
                    const errorMessage = error.message || 'Error connecting to server';
                    showNotification('Error', errorMessage, 'danger');
                    
                    // Clear the loading indicator
                    const statusElement = document.getElementById('dilemma-status');
                    if (statusElement) {
                        statusElement.innerHTML = `<div class="alert alert-danger">Error: ${errorMessage}</div>`;
                    }
                });
            } catch (error) {
                console.error("Error in run simulation handler:", error);
                alert("Error running simulation: " + error.message);
            }
        });
    } else {
        console.error("Run button element not found");
    }
    
    // Helper functions
    function validateForm() {
        console.log("Running form validation...");
        
        // Check if name is provided
        const name = document.getElementById('dilemma-name').value.trim();
        if (!name) {
            showNotification('Error', 'Please provide a configuration name', 'danger');
            console.log("Validation failed: No name provided");
            return false;
        }
        
        // Check current dilemma type
        const dilemmaType = document.getElementById('dilemma-type').value;
        console.log("Dilemma type:", dilemmaType);
        
        // Check if at least 2 agents are specified for the current dilemma
        let totalAgents = 0;
        // Need to convert underscores to hyphens for the HTML ID
        const configId = dilemmaType.replace(/_/g, '-') + '-config';
        const strategyInputs = document.querySelectorAll(`#${configId} .social-strategy-count`);
        console.log(`Found strategy inputs in #${configId}:`, strategyInputs.length);
        
        strategyInputs.forEach(input => {
            const value = parseInt(input.value) || 0;
            console.log(`Strategy ${input.dataset.strategy}: ${value} agents`);
            totalAgents += value;
        });
        
        console.log("Total agents:", totalAgents);
        
        if (totalAgents < 2) {
            showNotification('Error', 'At least 2 agents are required for the simulation', 'danger');
            console.log("Validation failed: Less than 2 agents");
            return false;
        }
        
        console.log("Form validation passed");
        return true;
    }
    
    function collectFormData() {
        // Get basic info
        const dilemmaType = document.getElementById('dilemma-type').value;
        const rounds = parseInt(document.getElementById('dilemma-rounds').value);
        
        // Prepare config object
        const config = {
            name: document.getElementById('dilemma-name').value.trim(),
            description: document.getElementById('dilemma-description').value.trim(),
            dilemma_type: dilemmaType,
            rounds: rounds,
            strategies: {}
        };
        
        // Add strategies based on dilemma type
        // Convert underscores to hyphens for proper HTML ID
        const configId = dilemmaType.replace(/_/g, '-') + '-config';
        const strategyInputs = document.querySelectorAll(`#${configId} .social-strategy-count`);
        console.log(`Collecting strategies from #${configId}, found:`, strategyInputs.length);
        
        strategyInputs.forEach(input => {
            const count = parseInt(input.value) || 0;
            if (count > 0) {
                config.strategies[input.dataset.strategy] = count;
                console.log(`Added strategy: ${input.dataset.strategy} with ${count} agents`);
            }
        });
        
        // Add specific parameters for each dilemma type
        if (dilemmaType === 'tragedy_commons') {
            // Get value with validation
            let resourceSize = parseInt(document.getElementById('tc-resource-size').value);
            if (isNaN(resourceSize) || resourceSize <= 0) {
                resourceSize = 1000; // Default value
                console.log("Using default resource size: 1000");
            }
            
            // Extra validation for regeneration rate which has been causing issues
            let regenRate = parseFloat(document.getElementById('tc-regen-rate').value);
            if (isNaN(regenRate) || regenRate < 0 || regenRate > 500) {
                regenRate = 200; // Default to 200%
                // Update UI to show the corrected value
                document.getElementById('tc-regen-rate').value = regenRate;
                console.log("Invalid regeneration rate, using default: 200%");
            }
            
            let harvestLimit = parseInt(document.getElementById('tc-harvest-limit').value);
            if (isNaN(harvestLimit) || harvestLimit <= 0) {
                harvestLimit = 30; // Default value
                console.log("Using default harvest limit: 30");
            }
            
            config.parameters = {
                resource_size: resourceSize,
                regeneration_rate: regenRate,
                harvest_limit: harvestLimit
            };
            
            console.log("Tragedy of Commons parameters:", config.parameters);
        } else if (dilemmaType === 'free_rider') {
            let projectCost = parseInt(document.getElementById('fr-project-cost').value);
            if (isNaN(projectCost) || projectCost <= 0) {
                projectCost = 100;
                console.log("Using default project cost: 100");
            }
            
            let benefitMultiplier = parseFloat(document.getElementById('fr-contribution-reward').value);
            if (isNaN(benefitMultiplier) || benefitMultiplier <= 0) {
                benefitMultiplier = 2.0;
                console.log("Using default benefit multiplier: 2.0");
            }
            
            let threshold = parseInt(document.getElementById('fr-threshold').value);
            if (isNaN(threshold) || threshold <= 0) {
                threshold = 70;
                console.log("Using default threshold: 70");
            }
            
            config.parameters = {
                project_cost: projectCost,
                benefit_multiplier: benefitMultiplier,
                threshold: threshold
            };
            
            console.log("Free Rider parameters:", config.parameters);
        } else if (dilemmaType === 'public_goods') {
            let endowment = parseInt(document.getElementById('pg-endowment').value);
            if (isNaN(endowment) || endowment <= 0) {
                endowment = 10;
                console.log("Using default endowment: 10");
            }
            
            let multiplier = parseFloat(document.getElementById('pg-multiplier').value);
            if (isNaN(multiplier) || multiplier <= 0) {
                multiplier = 1.5;
                console.log("Using default multiplier: 1.5");
            }
            
            // Get distribution type if it exists, otherwise use 'equal'
            let distribution = document.getElementById('pg-distribution')?.value;
            if (!distribution) {
                distribution = 'equal';
                console.log("Using default distribution: equal");
            }
            
            config.parameters = {
                endowment: endowment,
                multiplier: multiplier,
                distribution: distribution
            };
            
            console.log("Public Goods parameters:", config.parameters);
        }
        
        return config;
    }
    
    function displayDilemmaResults(results, config) {
        // Clear the "Running simulation..." message
        const statusElement = document.getElementById('dilemma-status');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
        
        // AGGRESSIVE FIX: Completely reset the advanced tab before displaying new results
        // This ensures that it gets properly re-rendered when switching to it
        const advancedTab = document.getElementById('advanced-charts');
        if (advancedTab) {
            // Save inner HTML
            const advancedTabHtml = advancedTab.innerHTML;
            
            // Reset the tab by removing and re-adding its content
            advancedTab.innerHTML = '';
            setTimeout(() => {
                advancedTab.innerHTML = advancedTabHtml;
                console.log("Reset advanced charts tab to force proper rendering");
            }, 50);
        }
        
        // Show round info
        document.getElementById('dilemma-round-info').style.display = 'block';
        document.getElementById('dilemma-total-rounds').textContent = results.rounds.length;
        document.getElementById('dilemma-current-round').textContent = results.rounds.length;
        document.getElementById('dilemma-round-progress').style.width = '100%';
        document.getElementById('dilemma-round-progress').textContent = '100%';
        
        // Show charts container
        document.getElementById('dilemma-charts-container').style.display = 'flex';
        
        // Update chart titles based on dilemma type
        let chart1Title, chart2Title;
        switch(config.dilemma_type) {
            case 'tragedy_commons':
                chart1Title = 'Resource Level Over Rounds';
                chart2Title = 'Harvests by Strategy Type';
                break;
            case 'free_rider':
                chart1Title = 'Project Funding Progress';
                chart2Title = 'Individual Gains by Strategy';
                break;
            case 'public_goods':
                chart1Title = 'Public Goods Contributions';
                chart2Title = 'Individual Payoffs by Strategy';
                break;
            default:
                chart1Title = 'Resource Status Over Time';
                chart2Title = 'Agent Scores by Strategy';
        }
        
        document.getElementById('dilemma-chart1-title').textContent = chart1Title;
        document.getElementById('dilemma-chart2-title').textContent = chart2Title;
        
        // Initialize charts
        initializeDilemmaCharts(results, config);
        
        // Show detailed results
        document.getElementById('dilemma-detailed-results').style.display = 'block';
        populateDilemmaResultsTable(results);
        
        // Show insights
        document.getElementById('dilemma-insights').style.display = 'block';
        generateInsights(results, config);
        
        // Explicitly render advanced and distribution charts
        try {
            if (typeof window.renderAdvancedCharts === 'function') {
                console.log("Rendering advanced charts with global data");
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    window.renderAdvancedCharts(window.simulationResults);
                }, 300);
            }
            
            if (typeof window.renderDistributionCharts === 'function') {
                console.log("Rendering distribution charts with global data");
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    window.renderDistributionCharts(window.simulationResults);
                }, 400);
            }
        } catch (e) {
            console.error("Error attempting to render additional charts:", e);
        }
    }
    
    function initializeDilemmaCharts(results, config) {
        // Chart 1 - Resource or Project Status
        const ctx1 = document.getElementById('dilemma-chart1').getContext('2d');
        let chart1Data, chart1Options;
        
        // Chart 2 - Strategy Performance
        const ctx2 = document.getElementById('dilemma-chart2').getContext('2d');
        let chart2Data, chart2Options;
        
        // Configure charts based on dilemma type
        switch(config.dilemma_type) {
            case 'tragedy_commons':
                // Resource level chart
                chart1Data = {
                    labels: results.rounds.map((_, i) => `Round ${i+1}`),
                    datasets: [{
                        label: 'Resource Level',
                        data: results.resource_levels,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        fill: true
                    }]
                };
                
                chart1Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Resource Units'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Resource Level: ${context.parsed.y} units`;
                                }
                            }
                        }
                    }
                };
                
                // Strategy harvests chart
                const strategyLabels = Object.keys(results.strategy_performance);
                const harvestData = strategyLabels.map(strategy => 
                    results.strategy_performance[strategy].total_harvest / results.strategy_performance[strategy].agent_count
                );
                
                chart2Data = {
                    labels: strategyLabels.map(s => s.replace('_', ' ').toUpperCase()),
                    datasets: [{
                        label: 'Average Harvest Per Agent',
                        data: harvestData,
                        backgroundColor: generateColors(strategyLabels.length),
                        borderWidth: 1
                    }]
                };
                
                chart2Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Average Harvest'
                            }
                        }
                    }
                };
                break;
                
            case 'free_rider':
                // Project funding progress
                chart1Data = {
                    labels: results.rounds.map((_, i) => `Round ${i+1}`),
                    datasets: [{
                        label: 'Funding Progress',
                        data: results.funding_progress,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1,
                        fill: true
                    }, {
                        label: 'Threshold',
                        data: Array(results.rounds.length).fill(results.threshold),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderDash: [5, 5],
                        fill: false
                    }]
                };
                
                chart1Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Funding (%)'
                            }
                        }
                    }
                };
                
                // Individual gains
                const frStrategyLabels = Object.keys(results.strategy_performance);
                const gainsData = frStrategyLabels.map(strategy => 
                    results.strategy_performance[strategy].average_gain
                );
                
                chart2Data = {
                    labels: frStrategyLabels.map(s => s.replace('_', ' ').toUpperCase()),
                    datasets: [{
                        label: 'Average Gain',
                        data: gainsData,
                        backgroundColor: generateColors(frStrategyLabels.length),
                        borderWidth: 1
                    }]
                };
                
                chart2Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Average Gain'
                            }
                        }
                    }
                };
                break;
                
            case 'public_goods':
                // Contributions over time
                const strategyTypes = Object.keys(results.strategy_performance);
                const contributionDatasets = strategyTypes.map((strategy, index) => {
                    return {
                        label: strategy.replace('_', ' ').toUpperCase(),
                        data: results.contribution_history[strategy],
                        borderColor: generateColors(strategyTypes.length)[index],
                        tension: 0.1,
                        fill: false
                    };
                });
                
                chart1Data = {
                    labels: results.rounds.map((_, i) => `Round ${i+1}`),
                    datasets: contributionDatasets
                };
                
                chart1Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Average Contribution'
                            }
                        }
                    }
                };
                
                // Payoffs by strategy
                const pgStrategyLabels = Object.keys(results.strategy_performance);
                const payoffData = pgStrategyLabels.map(strategy => 
                    results.strategy_performance[strategy].average_payoff
                );
                
                chart2Data = {
                    labels: pgStrategyLabels.map(s => s.replace('_', ' ').toUpperCase()),
                    datasets: [{
                        label: 'Average Payoff',
                        data: payoffData,
                        backgroundColor: generateColors(pgStrategyLabels.length),
                        borderWidth: 1
                    }]
                };
                
                chart2Options = {
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Average Payoff'
                            }
                        }
                    }
                };
                break;
                
            default:
                // Default charts if type not recognized
                chart1Data = {
                    labels: results.rounds.map((_, i) => `Round ${i+1}`),
                    datasets: [{
                        label: 'Resource Level',
                        data: Array(results.rounds.length).fill(0),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    }]
                };
                
                chart2Data = {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'No Data',
                        data: [0],
                        backgroundColor: ['rgba(200, 200, 200, 0.5)'],
                        borderWidth: 1
                    }]
                };
        }
        
        // Create the charts
        if (window.chart1) window.chart1.destroy();
        if (window.chart2) window.chart2.destroy();
        
        window.chart1 = new Chart(ctx1, {
            type: 'line',
            data: chart1Data,
            options: chart1Options
        });
        
        window.chart2 = new Chart(ctx2, {
            type: 'bar',
            data: chart2Data,
            options: chart2Options
        });
    }
    
    function populateDilemmaResultsTable(results) {
        const tableBody = document.getElementById('dilemma-results-table-body');
        tableBody.innerHTML = '';
        
        // Get strategy performance data
        const strategies = Object.keys(results.strategy_performance);
        
        // Find max and min scores for highlighting
        let maxScore = -Infinity;
        let minScore = Infinity;
        strategies.forEach(strategy => {
            const score = results.strategy_performance[strategy].average_score || 0;
            maxScore = Math.max(maxScore, score);
            minScore = Math.min(minScore, score);
        });
        
        // Create table rows
        strategies.forEach(strategy => {
            const perf = results.strategy_performance[strategy];
            const row = document.createElement('tr');
            
            // Determine row class based on score
            if (perf.average_score === maxScore) {
                row.classList.add('table-success');
            } else if (perf.average_score === minScore) {
                row.classList.add('table-danger');
            }
            
            // Strategy name
            const nameCell = document.createElement('td');
            nameCell.textContent = strategy.replace('_', ' ').toUpperCase();
            row.appendChild(nameCell);
            
            // Average score
            const scoreCell = document.createElement('td');
            scoreCell.textContent = perf.average_score?.toFixed(2) || 'N/A';
            row.appendChild(scoreCell);
            
            // Sustainability impact
            const impactCell = document.createElement('td');
            if (perf.sustainability_impact) {
                // Add sustainability impact icon and value
                const impactValue = perf.sustainability_impact;
                let impactIcon, impactClass;
                
                if (impactValue > 0.3) {
                    impactIcon = 'fa-plus-circle';
                    impactClass = 'text-success';
                    impactCell.textContent = ' Positive';
                } else if (impactValue < -0.3) {
                    impactIcon = 'fa-minus-circle';
                    impactClass = 'text-danger';
                    impactCell.textContent = ' Negative';
                } else {
                    impactIcon = 'fa-equals';
                    impactClass = 'text-warning';
                    impactCell.textContent = ' Neutral';
                }
                
                const icon = document.createElement('i');
                icon.className = `fas ${impactIcon} ${impactClass} me-1`;
                impactCell.prepend(icon);
            } else {
                impactCell.textContent = 'N/A';
            }
            row.appendChild(impactCell);
            
            // Social welfare
            const welfareCell = document.createElement('td');
            if (perf.social_welfare) {
                // Add social welfare icon and value
                const welfareValue = perf.social_welfare;
                let welfareIcon, welfareClass;
                
                if (welfareValue > 0.3) {
                    welfareIcon = 'fa-thumbs-up';
                    welfareClass = 'text-success';
                    welfareCell.textContent = ' High';
                } else if (welfareValue < -0.3) {
                    welfareIcon = 'fa-thumbs-down';
                    welfareClass = 'text-danger';
                    welfareCell.textContent = ' Low';
                } else {
                    welfareIcon = 'fa-equals';
                    welfareClass = 'text-warning';
                    welfareCell.textContent = ' Medium';
                }
                
                const icon = document.createElement('i');
                icon.className = `fas ${welfareIcon} ${welfareClass} me-1`;
                welfareCell.prepend(icon);
            } else {
                welfareCell.textContent = 'N/A';
            }
            row.appendChild(welfareCell);
            
            tableBody.appendChild(row);
        });
    }
    
    function generateInsights(results, config) {
        const insightsContainer = document.getElementById('dilemma-insights-content');
        insightsContainer.innerHTML = '';
        
        let insights = [];
        
        // General insight based on dilemma type
        switch(config.dilemma_type) {
            case 'tragedy_commons':
                // Check if resource collapsed
                const finalResourceLevel = results.resource_levels[results.resource_levels.length - 1];
                const initialResourceLevel = results.resource_levels[0];
                const resourceDepleted = finalResourceLevel < initialResourceLevel * 0.1;
                
                if (resourceDepleted) {
                    insights.push({
                        title: 'Resource Collapse',
                        content: 'The shared resource was depleted to critical levels, demonstrating how individual short-term interests can lead to collective long-term harm.',
                        icon: 'fa-exclamation-triangle',
                        class: 'text-danger'
                    });
                } else {
                    insights.push({
                        title: 'Sustainable Management',
                        content: 'The resource was maintained at sustainable levels, showing that with the right balance of strategies, common resources can be preserved.',
                        icon: 'fa-check-circle',
                        class: 'text-success'
                    });
                }
                
                // Compare greedy vs. sustainable strategies
                if (results.strategy_performance.greedy && results.strategy_performance.sustainable) {
                    const greedyAvg = results.strategy_performance.greedy.average_score;
                    const sustainableAvg = results.strategy_performance.sustainable.average_score;
                    
                    if (greedyAvg > sustainableAvg && !resourceDepleted) {
                        insights.push({
                            title: 'Short-term Advantage',
                            content: 'Greedy harvesting strategies outperformed sustainable ones while still maintaining resource viability, highlighting the tension between individual gain and collective responsibility.',
                            icon: 'fa-balance-scale',
                            class: 'text-warning'
                        });
                    } else if (sustainableAvg > greedyAvg) {
                        insights.push({
                            title: 'Sustainability Wins',
                            content: 'Sustainable harvesting strategies achieved better outcomes than greedy ones, demonstrating that long-term thinking can be both individually and collectively beneficial.',
                            icon: 'fa-seedling',
                            class: 'text-success'
                        });
                    }
                }
                break;
                
            case 'free_rider':
                // Check if project was successfully funded
                const finalFunding = results.funding_progress[results.funding_progress.length - 1];
                const projectSucceeded = finalFunding >= results.threshold;
                
                if (projectSucceeded) {
                    insights.push({
                        title: 'Project Success Despite Free Riders',
                        content: 'The project was successfully funded despite the presence of free riders, showing that a critical mass of contributors can overcome the free rider problem.',
                        icon: 'fa-check-circle',
                        class: 'text-success'
                    });
                } else {
                    insights.push({
                        title: 'Project Failure Due to Free Riding',
                        content: 'The project failed to reach its funding threshold, demonstrating how free riding behavior can lead to the underprovision of public goods.',
                        icon: 'fa-times-circle',
                        class: 'text-danger'
                    });
                }
                
                // Compare contributor vs. free rider outcomes
                if (results.strategy_performance.contributor && results.strategy_performance.free_rider) {
                    const contributorAvg = results.strategy_performance.contributor.average_gain;
                    const freeRiderAvg = results.strategy_performance.free_rider.average_gain;
                    
                    if (freeRiderAvg > contributorAvg && projectSucceeded) {
                        insights.push({
                            title: 'Free Rider Advantage',
                            content: 'Free riders achieved higher individual gains than contributors, illustrating why free riding behavior persists in many social contexts.',
                            icon: 'fa-user-ninja',
                            class: 'text-warning'
                        });
                    } else if (contributorAvg > freeRiderAvg || !projectSucceeded) {
                        insights.push({
                            title: 'Contribution Rewarded',
                            content: 'Contributors achieved better outcomes than free riders, suggesting that mechanisms to reward contribution may help overcome the free rider problem.',
                            icon: 'fa-hand-holding-heart',
                            class: 'text-success'
                        });
                    }
                }
                break;
                
            case 'public_goods':
                // Check overall contribution trends
                const firstRoundAvg = results.average_contribution[0];
                const lastRoundAvg = results.average_contribution[results.average_contribution.length - 1];
                const contributionDeclined = lastRoundAvg < firstRoundAvg * 0.7;
                
                if (contributionDeclined) {
                    insights.push({
                        title: 'Declining Contributions',
                        content: 'Contributions to the public good declined over time, a common pattern seen in repeated public goods games as participants adjust their strategy based on others\' behavior.',
                        icon: 'fa-chart-line-down',
                        class: 'text-danger'
                    });
                } else {
                    insights.push({
                        title: 'Sustained Contributions',
                        content: 'Contributions to the public good remained stable or increased over time, contrary to the typical pattern seen in many public goods experiments.',
                        icon: 'fa-chart-line',
                        class: 'text-success'
                    });
                }
                
                // Compare zero vs. full contributors
                if (results.strategy_performance.zero && results.strategy_performance.full) {
                    const zeroAvg = results.strategy_performance.zero.average_payoff;
                    const fullAvg = results.strategy_performance.full.average_payoff;
                    
                    if (zeroAvg > fullAvg) {
                        insights.push({
                            title: 'Non-contribution Advantage',
                            content: 'Non-contributors achieved higher individual payoffs than full contributors, highlighting the inherent tension in public goods provision.',
                            icon: 'fa-user-slash',
                            class: 'text-warning'
                        });
                    } else if (fullAvg > zeroAvg) {
                        insights.push({
                            title: 'Contribution Pays Off',
                            content: 'Full contributors achieved better outcomes than non-contributors, suggesting that the multiplier effect was strong enough to make contribution individually rational.',
                            icon: 'fa-hands-helping',
                            class: 'text-success'
                        });
                    }
                }
                break;
                
            default:
                insights.push({
                    title: 'Simulation Complete',
                    content: 'Examine the charts and data to understand the dynamics of this social dilemma.',
                    icon: 'fa-search',
                    class: 'text-info'
                });
        }
        
        // Add general insight about emergence
        insights.push({
            title: 'Emergent Social Behavior',
            content: 'This simulation demonstrates how complex social dynamics can emerge from simple interaction rules and how individual decisions collectively shape outcomes that affect everyone.',
            icon: 'fa-brain',
            class: 'text-primary'
        });
        
        // Add real-world connection
        const realWorldConnections = {
            tragedy_commons: 'Real-world examples include climate change, overfishing, and deforestation, where individual actors have incentives to overuse shared resources.',
            free_rider: 'Similar dynamics occur in public transportation fare evasion, tax compliance, and voluntary contributions to public services.',
            public_goods: 'This mirrors scenarios like open-source software development, Wikipedia contributions, and community improvement projects.'
        };
        
        if (realWorldConnections[config.dilemma_type]) {
            insights.push({
                title: 'Real-World Connection',
                content: realWorldConnections[config.dilemma_type],
                icon: 'fa-globe',
                class: 'text-info'
            });
        }
        
        // Display insights
        insights.forEach(insight => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            const title = document.createElement('h5');
            title.className = 'card-title';
            title.innerHTML = `<i class="fas ${insight.icon} ${insight.class} me-2"></i>${insight.title}`;
            
            const content = document.createElement('p');
            content.className = 'card-text';
            content.textContent = insight.content;
            
            cardBody.appendChild(title);
            cardBody.appendChild(content);
            card.appendChild(cardBody);
            
            insightsContainer.appendChild(card);
        });
    }
    
    function showNotification(title, message, type = 'primary') {
        console.log(`Showing notification: ${title} - ${message} (${type})`);
        
        // Check if we should use fallback notification
        if (window.showNotificationFallback) {
            window.showNotificationFallback(title, message);
            return;
        }
        
        try {
            // Get toast elements
            const toastEl = document.getElementById('notification-toast');
            const titleEl = document.getElementById('toast-title');
            const messageEl = document.getElementById('toast-message');
            
            // If elements don't exist, fall back to alert
            if (!toastEl || !titleEl || !messageEl) {
                throw new Error("Toast elements not found");
            }
            
            // Update toast content
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            // Set toast color based on type
            toastEl.className = 'toast';
            toastEl.classList.add(`bg-${type === 'danger' ? 'danger' : 'dark'}`);
            toastEl.classList.add(type === 'danger' ? 'text-white' : 'text-light');
            
            // Try to use Bootstrap Toast if available
            if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                const bsToast = new bootstrap.Toast(toastEl);
                bsToast.show();
            } else {
                // Manual toast display
                toastEl.style.display = 'block';
                toastEl.style.opacity = '1';
                
                // Auto-hide after 4 seconds
                setTimeout(() => {
                    toastEl.style.opacity = '0';
                    setTimeout(() => {
                        toastEl.style.display = 'none';
                    }, 300);
                }, 4000);
            }
        } catch (e) {
            console.error("Error showing toast:", e);
            alert(title + ": " + message);
        }
    }
    
    function generateColors(count) {
        const colors = [
            'rgba(255, 99, 132, 0.7)',   // Red
            'rgba(54, 162, 235, 0.7)',   // Blue
            'rgba(255, 206, 86, 0.7)',   // Yellow
            'rgba(75, 192, 192, 0.7)',   // Green
            'rgba(153, 102, 255, 0.7)',  // Purple
            'rgba(255, 159, 64, 0.7)',   // Orange
            'rgba(199, 199, 199, 0.7)',  // Gray
            'rgba(83, 102, 255, 0.7)',   // Indigo
            'rgba(255, 99, 255, 0.7)',   // Pink
            'rgba(99, 255, 132, 0.7)'    // Light green
        ];
        
        // If we need more colors than in our predefined array, generate random ones
        if (count > colors.length) {
            for (let i = colors.length; i < count; i++) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
            }
        }
        
        return colors.slice(0, count);
    }
    
    // Initialize on page load
    updateDilemmaTotalAgents();
    
    // Add debugging to help identify issues
    console.log("Social dilemmas page initialization complete");
}

// Execute initialization when page loads
if (document.readyState === 'loading') {
    // Still loading, so wait for the DOMContentLoaded event
    console.log("Document still loading, waiting for DOMContentLoaded");
} else {
    // DOM has already loaded, initialize immediately
    console.log("Document already loaded, initializing now");
    ensureBootstrap(initializePage);
}