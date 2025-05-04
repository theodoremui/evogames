/**
 * Script for handling simulation results display in the Social Dilemmas page
 * Uses variables and functions from chart-config.js
 * 
 * This module is responsible for rendering various charts to visualize
 * the results of social dilemma simulations. It processes simulation data
 * and creates appropriate visualizations for each dilemma type including:
 * - Tragedy of the Commons
 * - Free Rider Problem
 * - Public Goods Game
 * 
 * The module implements fallback handling to display data from different 
 * data structure versions, ensuring backward compatibility with historical
 * simulation records.
 * 
 * @author Theodore Mui
 * @version 1.0.1
 * @date May 4, 2025
 */

// Global object to store charts for updating
let simulationCharts = {};

// Make the charts object available globally
window.dilemmaCharts = simulationCharts;

// Store the last simulation results for tab switching
window.simulationResults = null;

// Function to initialize and display simulation results
function displaySimulationResults(data) {
    console.log("Initializing simulation results display:", data);
    
    try {
        // Make sure we have both config and results
        if (!data || !data.config || !data.results) {
            console.error("Invalid simulation data format:", data);
            showNotification("Error", "Invalid simulation data format", "danger");
            return;
        }
        
        // Store the data globally for tab switching
        window.simulationResults = data;
        
        // Also store in sessionStorage for cross-page access to advanced charts
        try {
            sessionStorage.setItem('advancedChartsData', JSON.stringify(data));
            console.log("Stored simulation results in sessionStorage for advanced charts page");
        } catch (e) {
            console.warn("Failed to store data in sessionStorage:", e);
        }
        
        // Show results section and scroll to it
        const resultsSection = document.getElementById('dilemma-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            
            // Hide the placeholder message
            const placeholderMsg = document.querySelector('.results-placeholder');
            if (placeholderMsg) {
                placeholderMsg.style.display = 'none';
            }
        } else {
            console.error("Results section element not found");
        }
        
        // Clear previous charts to prevent memory leaks
        Object.keys(simulationCharts).forEach(key => {
            if (simulationCharts[key]) {
                simulationCharts[key].destroy();
                simulationCharts[key] = null;
            }
        });
        
        // Update status
        const statusElement = document.getElementById('dilemma-status');
        if (statusElement) {
            statusElement.innerHTML = `<div class="alert alert-success">Simulation completed successfully!</div>`;
        }
        
        // Determine which dilemma-specific charts to render
        const dilemmaType = data.config.dilemma_type;
        console.log("Rendering charts for dilemma type:", dilemmaType);
        
        // Hide all dilemma-specific charts first
        document.querySelectorAll('.dilemma-specific-chart').forEach(chart => {
            chart.style.display = 'none';
        });
        
        // Show appropriate dilemma-specific charts based on the dilemma type
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
        
        // Initialize all chart containers with correct visibility
        initializeChartContainers();
        
        // Always render common charts (strategy performance, distribution)
        renderCommonCharts(data);
        
        // Force rendering of advanced charts
        try {
            console.log("Forcing render of advanced charts...");
            // Make sure the advanced tab pane is temporarily visible for rendering
            const advancedTab = document.getElementById('advanced-charts');
            if (advancedTab) {
                const originalDisplay = advancedTab.style.display;
                advancedTab.style.display = 'block';
                advancedTab.style.visibility = 'visible';
                advancedTab.style.opacity = '1';
                advancedTab.style.position = 'static';
                
                // Ensure all canvases in the advanced tab are visible 
                const sustainabilityCanvas = document.getElementById('dilemma-sustainability-chart');
                const welfareCanvas = document.getElementById('dilemma-welfare-chart');
                
                if (sustainabilityCanvas) {
                    sustainabilityCanvas.style.display = 'block';
                    sustainabilityCanvas.style.visibility = 'visible';
                    sustainabilityCanvas.style.height = '450px';
                    sustainabilityCanvas.style.width = '100%';
                }
                
                if (welfareCanvas) {
                    welfareCanvas.style.display = 'block';
                    welfareCanvas.style.visibility = 'visible';
                    welfareCanvas.style.height = '450px';
                    welfareCanvas.style.width = '100%';
                }
                
                // Render the advanced analysis charts
                window.renderAdvancedCharts(data);
                
                // Restore the original display state
                setTimeout(() => {
                    advancedTab.style.display = originalDisplay;
                }, 500);
            }
            
            // Now handle the distribution charts
            const distributionTab = document.getElementById('distribution-charts');
            if (distributionTab) {
                const originalDisplay = distributionTab.style.display;
                distributionTab.style.display = 'block';
                distributionTab.style.visibility = 'visible';
                distributionTab.style.opacity = '1';
                distributionTab.style.position = 'static';
                
                // Ensure all canvases in the distribution tab are visible
                const distributionCanvas = document.getElementById('dilemma-distribution-chart');
                const actionsCanvas = document.getElementById('dilemma-actions-chart');
                
                if (distributionCanvas) {
                    distributionCanvas.style.display = 'block';
                    distributionCanvas.style.visibility = 'visible';
                    distributionCanvas.style.height = '450px';
                    distributionCanvas.style.width = '100%';
                }
                
                if (actionsCanvas) {
                    actionsCanvas.style.display = 'block';
                    actionsCanvas.style.visibility = 'visible';
                    actionsCanvas.style.height = '450px';
                    actionsCanvas.style.width = '100%';
                }
                
                // Render the distribution charts
                window.renderDistributionCharts(data);
                
                // Restore the original display state
                setTimeout(() => {
                    distributionTab.style.display = originalDisplay;
                }, 500);
            }
        } catch (err) {
            console.error("Error rendering additional charts:", err);
        }
        
        // Display raw JSON data in pre-formatted container if it exists
        const rawJsonContainer = document.getElementById('raw-json');
        if (rawJsonContainer) {
            rawJsonContainer.textContent = JSON.stringify(data, null, 2);
        }
        
        // Initialize tooltips for the chart titles
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
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
            data: Object.keys(roundData).map(round => {
                // Try to get resource_size directly from round data first
                if (roundData[round] && typeof roundData[round].resource_size !== 'undefined') {
                    return roundData[round].resource_size;
                }
                // Fall back to resource_levels array if available
                else if (data.results.resource_levels && data.results.resource_levels[round-1]) {
                    return data.results.resource_levels[round-1];
                }
                return 0;
            }),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1
        }]
    };
    
    simulationCharts.chart1 = createLineChart('dilemma-chart1', resourceChartData, 'Resource Size Over Time', 'Resource Units');
    
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
    
    simulationCharts.tcRegenChart = createLineChart('tc-regen-chart', regenHarvestData, 
        'Resource Regeneration vs. Harvest Rate', 'Resource Units');
        
    // Strategy Harvest Comparison
    const harvestData = prepareLineChartData(roundData, strategies, 'harvest');
    simulationCharts.chart2 = createLineChart('dilemma-chart2', harvestData, 'Strategy Harvest Over Time', 'Resource Units');
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
    
    simulationCharts.chart1 = createLineChart('dilemma-chart1', completionData, 'Project Completion Over Time', 'Completion %');
    
    // Contributions Chart
    const contributionData = prepareLineChartData(roundData, strategies, 'contribution');
    simulationCharts.frCompletionChart = createLineChart('fr-completion-chart', contributionData, 
        'Strategy Contributions Over Time', 'Contribution Amount');
        
    // Payoff Chart
    const payoffData = prepareLineChartData(roundData, strategies, 'payoff');
    simulationCharts.chart2 = createLineChart('dilemma-chart2', payoffData, 'Strategy Payoffs Over Time', 'Payoff Amount');
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
    
    simulationCharts.chart1 = createLineChart('dilemma-chart1', poolData, 'Common Pool Size Over Time', 'Resources');
    
    // Pool Growth Chart
    simulationCharts.pgPoolChart = createLineChart('pg-pool-chart', poolData, 'Common Pool Growth', 'Pool Size');
    
    // Contribution Chart
    const contributionData = prepareLineChartData(roundData, strategies, 'contribution');
    simulationCharts.chart2 = createLineChart('dilemma-chart2', contributionData, 'Contribution by Strategy Over Time', 'Contribution Amount');
}

// Common charts for all dilemma types
function renderCommonCharts(data) {
    const finalStats = data.results.final_stats || {};
    const strategies = Object.keys(finalStats.strategies || {});
    
    // Strategy performance chart (score/payoff by strategy)
    const performanceData = prepareBarChartData(finalStats, 'score');
    simulationCharts.chart3 = createBarChart('dilemma-chart3', performanceData, 'Final Strategy Performance', 'Score');
    
    // Render distribution charts using the global function
    // This will create both the distribution chart and actions chart
    window.renderDistributionCharts(data);
}

// Function to render Advanced Analysis charts
function renderAdvancedCharts(data) {
    console.log("Rendering advanced analysis charts with data:", data);
    
    try {
        // Make sure we have the final stats data needed for the charts
        if (!data || !data.results || !data.results.final_stats || !data.results.final_stats.strategies) {
            console.error("Missing required data for advanced charts:", data);
            return;
        }
        
        const roundData = data.results.rounds || {};
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        const dilemmaType = data.config.dilemma_type;
        
        console.log("Found strategies for charts:", strategies);

        // FORCE Advanced Analysis Tab to be visible during rendering
        const advancedChartTab = document.getElementById('advanced-charts');
        if (advancedChartTab) {
            // Store original visibility state
            const originalDisplay = advancedChartTab.style.display;
            const originalVisibility = advancedChartTab.style.visibility;
            const originalPosition = advancedChartTab.style.position;
            
            // Force visibility for rendering
            advancedChartTab.style.display = 'block';
            advancedChartTab.style.visibility = 'visible';
            advancedChartTab.style.opacity = '1';
            advancedChartTab.style.position = 'static';
            advancedChartTab.style.height = 'auto';
            advancedChartTab.style.overflow = 'visible';
            advancedChartTab.classList.add('active');
            advancedChartTab.classList.add('show');
        }
        
        // Show the Advanced Analysis tab if it's not visible
        const advancedTab = document.getElementById('advanced-charts-tab');
        if (advancedTab) {
            console.log("Found advanced charts tab");
        } else {
            console.error("Could not find advanced charts tab element");
        }
        
        // Advanced Charts based on dilemma type
        if (dilemmaType === 'tragedy_commons') {
            // Already rendered in renderTragedyCommonsCharts
            // Just make sure the chart is visible
            document.querySelectorAll('.tc-specific').forEach(chart => {
                chart.style.display = 'block';
            });
            console.log("Showing tragedy of commons specific charts");
        } 
        else if (dilemmaType === 'free_rider') {
            // Already rendered in renderFreeRiderCharts
            // Just make sure the chart is visible
            document.querySelectorAll('.fr-specific').forEach(chart => {
                chart.style.display = 'block';
            });
            console.log("Showing free rider specific charts");
        } 
        else if (dilemmaType === 'public_goods') {
            // Already rendered in renderPublicGoodsCharts
            // Just make sure the chart is visible
            document.querySelectorAll('.pg-specific').forEach(chart => {
                chart.style.display = 'block';
            });
            console.log("Showing public goods specific charts");
        }
        
        // Verify that canvases exist before rendering
        const sustainabilityCanvas = document.getElementById('dilemma-sustainability-chart');
        if (!sustainabilityCanvas) {
            console.error("Sustainability chart canvas not found");
            throw new Error("Sustainability chart canvas not found in DOM");
        }
        
        const welfareCanvas = document.getElementById('dilemma-welfare-chart');
        if (!welfareCanvas) {
            console.error("Welfare chart canvas not found");
            throw new Error("Welfare chart canvas not found in DOM");
        }
        
        console.log("Found all required chart canvases - proceeding with chart creation");
        
        // Display the Advanced Analysis tab to make sure charts are rendered properly
        if (advancedTab) {
            // Trigger a tab display to ensure all elements are properly visible when rendering
            const advancedTabContent = document.getElementById('advanced-charts');
            if (advancedTabContent) {
                advancedTabContent.classList.add('active', 'show');
                setTimeout(() => {
                    advancedTabContent.classList.remove('active', 'show');
                    const basicChartsTab = document.getElementById('basic-charts');
                    if (basicChartsTab) {
                        basicChartsTab.classList.add('active', 'show');
                    }
                }, 100);
            }
        }
        
        // Use our global function to actually render the charts
        return window.renderAdvancedCharts(data);
    } catch (error) {
        console.error("Error in renderAdvancedCharts:", error);
        return false;
    }
}

// Helper function to show notification
function showNotification(title, message, type) {
    const toastEl = document.getElementById('notification-toast');
    if (!toastEl) return;
    
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    
    if (toastTitle) toastTitle.textContent = title;
    if (toastBody) toastBody.textContent = message;
    
    // Set bootstrap classes based on type
    toastEl.className = 'toast';
    toastEl.classList.add(`bg-${type}`);
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Create a global function to render distribution charts
window.renderDistributionCharts = function(data) {
    console.log("Rendering distribution charts with data:", data);
    try {
        // Destroy existing charts to prevent duplicates
        if (window.charts) {
            if (window.charts.distribution) {
                window.charts.distribution.destroy();
            }
            if (window.charts.actions) {
                window.charts.actions.destroy();
            }
        } else {
            window.charts = {};
        }
        
        // Force the distribution tab to be visible for rendering
        const distributionTab = document.getElementById('distribution-charts');
        distributionTab.style.display = 'block';
        distributionTab.style.visibility = 'visible';
        distributionTab.style.opacity = '1';
        distributionTab.style.height = 'auto';
        
        // Force canvases to be visible and properly sized
        const distributionCanvas = document.getElementById('dilemma-distribution-chart');
        const actionsCanvas = document.getElementById('dilemma-actions-chart');
        
        if (distributionCanvas) {
            // Clear any previous chart
            const ctx = distributionCanvas.getContext('2d');
            ctx.clearRect(0, 0, distributionCanvas.width, distributionCanvas.height);
            
            // Apply forced visibility styles
            distributionCanvas.style.display = 'block';
            distributionCanvas.style.visibility = 'visible';
            distributionCanvas.style.height = '450px';
            distributionCanvas.style.width = '100%';
            distributionCanvas.style.zIndex = '10';
            distributionCanvas.style.position = 'relative';
        }
        
        if (actionsCanvas) {
            // Clear any previous chart
            const ctx = actionsCanvas.getContext('2d');
            ctx.clearRect(0, 0, actionsCanvas.width, actionsCanvas.height);
            
            // Apply forced visibility styles
            actionsCanvas.style.display = 'block';
            actionsCanvas.style.visibility = 'visible';
            actionsCanvas.style.height = '450px';
            actionsCanvas.style.width = '100%';
            actionsCanvas.style.zIndex = '10';
            actionsCanvas.style.position = 'relative';
        }
        
        // Make sure the parent tab is properly styled
        const distributionTabPane = document.getElementById('distribution-charts');
        if (distributionTabPane) {
            distributionTabPane.style.display = 'block';
            distributionTabPane.style.visibility = 'visible';
            // We don't need to set active class as tab switching handles this
        }
        
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Distribution chart (pie chart of final resources)
        const distributionData = preparePieChartData(finalStats, 'total_resources');
        
        // If the chart already exists, destroy it
        if (simulationCharts.distributionChart) {
            simulationCharts.distributionChart.destroy();
            simulationCharts.distributionChart = null;
        }
        
        // Create a new distribution chart
        simulationCharts.distributionChart = createPieChart(
            'dilemma-distribution-chart', 
            distributionData, 
            'Final Resource Distribution'
        );
        
        // Actions pie chart (cooperate vs defect)
        const actionData = prepareStrategyActionsData(finalStats);
        
        // If the chart already exists, destroy it
        if (simulationCharts.actionsChart) {
            simulationCharts.actionsChart.destroy();
            simulationCharts.actionsChart = null;
        }
        
        // Create a new actions chart
        simulationCharts.actionsChart = createDoughnutChart(
            'dilemma-actions-chart', 
            actionData, 
            'Strategy Action Distribution'
        );
        
        // Force a redraw after a slight delay to ensure rendering completes
        setTimeout(() => {
            if (distributionCanvas && simulationCharts.distributionChart) {
                simulationCharts.distributionChart.update();
            }
            if (actionsCanvas && simulationCharts.actionsChart) {
                simulationCharts.actionsChart.update();
            }
        }, 50);
        
        console.log("Distribution charts rendered successfully");
        return true;
    } catch (error) {
        console.error("Error rendering distribution charts:", error);
        return false;
    }
};

// Create a global function to render advanced charts
window.renderAdvancedCharts = function(data) {
    console.log("Global renderAdvancedCharts called with data:", data);
    
    try {
        if (!data || !data.results || !data.results.final_stats) {
            console.error("Missing required data for advanced charts");
            return false;
        }
        
        console.log("Creating sustainability chart...");
        
        // Destroy existing charts to prevent duplicates
        if (window.charts) {
            if (window.charts.sustainability) {
                window.charts.sustainability.destroy();
            }
            if (window.charts.welfare) {
                window.charts.welfare.destroy();
            }
            if (simulationCharts.sustainabilityChart) {
                simulationCharts.sustainabilityChart.destroy();
                simulationCharts.sustainabilityChart = null;
            }
            if (simulationCharts.welfareChart) {
                simulationCharts.welfareChart.destroy();
                simulationCharts.welfareChart = null;
            }
        } else {
            window.charts = {};
        }
        
        // EXTREMELY AGGRESSIVE VISIBILITY - Force visibility in multiple ways
        // First make the tab pane visible
        const advancedTab = document.getElementById('advanced-charts');
        advancedTab.style.display = 'block !important';
        advancedTab.style.visibility = 'visible !important';
        advancedTab.style.opacity = '1 !important';
        advancedTab.style.height = 'auto !important';
        advancedTab.style.overflow = 'visible !important';
        advancedTab.classList.add('active', 'show');
        
        // Now make the canvas containers visible
        const sustainabilityContainer = document.getElementById('sustainability-chart-container');
        const welfareContainer = document.getElementById('welfare-chart-container');
        
        if (sustainabilityContainer) {
            sustainabilityContainer.style.display = 'block !important';
            sustainabilityContainer.style.visibility = 'visible !important';
            sustainabilityContainer.style.height = '450px !important';
            sustainabilityContainer.style.width = '100% !important';
            sustainabilityContainer.style.position = 'relative !important';
            sustainabilityContainer.style.zIndex = '10 !important';
        }
        
        if (welfareContainer) {
            welfareContainer.style.display = 'block !important';
            welfareContainer.style.visibility = 'visible !important';
            welfareContainer.style.height = '450px !important';
            welfareContainer.style.width = '100% !important';
            welfareContainer.style.position = 'relative !important';
            welfareContainer.style.zIndex = '10 !important';
        }
        
        // Force canvases to be visible and properly sized
        const sustainabilityCanvas = document.getElementById('dilemma-sustainability-chart');
        const welfareCanvas = document.getElementById('dilemma-welfare-chart');
        
        if (sustainabilityCanvas) {
            // Clear any previous chart
            const ctx = sustainabilityCanvas.getContext('2d');
            ctx.clearRect(0, 0, sustainabilityCanvas.width, sustainabilityCanvas.height);
            
            // Apply forced visibility styles
            sustainabilityCanvas.style.display = 'block';
            sustainabilityCanvas.style.visibility = 'visible';
            sustainabilityCanvas.style.height = '450px';
            sustainabilityCanvas.style.width = '100%';
            sustainabilityCanvas.style.zIndex = '10';
            sustainabilityCanvas.style.position = 'relative';
        }
        
        if (welfareCanvas) {
            // Clear any previous chart
            const ctx = welfareCanvas.getContext('2d');
            ctx.clearRect(0, 0, welfareCanvas.width, welfareCanvas.height);
            
            // Apply forced visibility styles
            welfareCanvas.style.display = 'block';
            welfareCanvas.style.visibility = 'visible'; 
            welfareCanvas.style.height = '450px';
            welfareCanvas.style.width = '100%';
            welfareCanvas.style.zIndex = '10';
            welfareCanvas.style.position = 'relative';
        }
        
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        
        // Strategy sustainability impact chart
        const sustainabilityData = {
            labels: strategies.map(humanizeStrategyName),
            datasets: [{
                label: 'Sustainability Impact',
                data: strategies.map(strategy => {
                    const stratData = finalStats.strategies[strategy] || {};
                    // Convert impact value to a score between 0-100
                    const impact = stratData.sustainability_impact || 0;
                    return impact * 100; // Scale for better visualization
                }),
                backgroundColor: strategies.map((strategy, index) => getStrategyColor(strategy, index)),
                borderColor: strategies.map((strategy, index) => getStrategyBorderColor(strategy, index)),
                borderWidth: 1
            }]
        };
        
        // Social welfare comparison chart
        const welfareData = {
            labels: strategies.map(humanizeStrategyName),
            datasets: [{
                label: 'Social Welfare',
                data: strategies.map(strategy => {
                    const stratData = finalStats.strategies[strategy] || {};
                    // Convert welfare value to a score between 0-100
                    const welfare = stratData.social_welfare || 0;
                    return welfare * 100; // Scale for better visualization
                }),
                backgroundColor: strategies.map((strategy, index) => getStrategyColor(strategy, index)),
                borderColor: strategies.map((strategy, index) => getStrategyBorderColor(strategy, index)),
                borderWidth: 1
            }]
        };
        
        // If charts already exist, destroy them
        if (simulationCharts.sustainabilityChart) {
            simulationCharts.sustainabilityChart.destroy();
            simulationCharts.sustainabilityChart = null;
        }
        
        if (simulationCharts.welfareChart) {
            simulationCharts.welfareChart.destroy();
            simulationCharts.welfareChart = null;
        }
        
        // Make sure the parent tab is properly styled
        const advancedTabPane = document.getElementById('advanced-charts');
        if (advancedTabPane) {
            advancedTabPane.style.display = 'block';
            advancedTabPane.style.visibility = 'visible';
            // We don't need to set active class as tab switching handles this
        }
        
        // Render the charts in the Advanced Analysis tab
        console.log("Creating sustainability chart...");
        simulationCharts.sustainabilityChart = createBarChart('dilemma-sustainability-chart', sustainabilityData, 
            'Sustainability Impact by Strategy', 'Impact Score');
        
        console.log("Creating welfare chart...");
        simulationCharts.welfareChart = createBarChart('dilemma-welfare-chart', welfareData, 
            'Social Welfare Contribution by Strategy', 'Welfare Score');
            
        console.log("Successfully created advanced analysis charts");
        
        // Force a redraw after a slight delay to ensure rendering completes
        setTimeout(() => {
            if (sustainabilityCanvas && simulationCharts.sustainabilityChart) {
                simulationCharts.sustainabilityChart.update();
            }
            if (welfareCanvas && simulationCharts.welfareChart) {
                simulationCharts.welfareChart.update();
            }
        }, 50);
        
        return true;
    } catch (error) {
        console.error("Error creating advanced analysis charts:", error);
        return false;
    }
};

// Helper function to prepare strategy actions data for the pie chart
function prepareStrategyActionsData(finalStats) {
    const strategies = Object.keys(finalStats.strategies || {});
    const actionLabels = ['Cooperative', 'Selfish', 'Adaptive', 'Other'];
    
    return {
        labels: actionLabels,
        datasets: [{
            data: actionLabels.map(label => {
                let count = 0;
                strategies.forEach(strategy => {
                    const actionKey = 'actions'; // Default
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
}

// Initialize chart containers with proper visibility
function initializeChartContainers() {
    console.log("Initializing all chart containers for visibility");
    
    // Force all canvas elements to be properly styled
    document.querySelectorAll('canvas').forEach(canvas => {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.height = '450px';
        canvas.style.width = '100%';
        canvas.style.zIndex = '10';
        canvas.style.position = 'relative';
    });
    
    // Force specific chart canvases to be visible
    const chartIds = [
        'dilemma-chart1', 'dilemma-chart2', 'dilemma-chart3', 
        'dilemma-sustainability-chart', 'dilemma-welfare-chart',
        'dilemma-distribution-chart', 'dilemma-actions-chart',
        'tc-regen-chart', 'fr-completion-chart', 'pg-pool-chart'
    ];
    
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
            canvas.style.height = '450px';
            canvas.style.width = '100%';
        }
    });
    
    // Make sure tab panes are styled correctly
    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.classList.contains('active') || pane.classList.contains('show')) {
            pane.style.display = 'block';
            pane.style.visibility = 'visible';
            pane.style.opacity = '1';
        }
    });
}

// Execute when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all chart containers
    initializeChartContainers();
    
    // Check if we have results from server
    if (typeof simulationResults !== 'undefined' && simulationResults) {
        console.log("Found simulation results on page load:", simulationResults);
        // Wait a bit for charts.js and other dependencies to load
        setTimeout(() => {
            displaySimulationResults(simulationResults);
            // Run initialize again after charts are created
            setTimeout(initializeChartContainers, 200);
        }, 500);
    }
    
    // Add an event listener for tab changes
    document.querySelectorAll('.nav-link[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('click', function() {
            // Initialize containers after a delay to allow tab transition
            setTimeout(initializeChartContainers, 100);
        });
    });
});