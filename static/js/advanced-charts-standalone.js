/**
 * Standalone Advanced Charts Renderer
 * This script provides an independent method to render the advanced analysis charts
 * outside of the tab system, which seems to have rendering issues.
 */

// Create a standalone chart viewer
function createStandaloneViewer() {
    console.log("Creating standalone advanced charts viewer");
    
    // Create container for the standalone viewer
    const viewerContainer = document.createElement('div');
    viewerContainer.id = 'standalone-chart-viewer';
    viewerContainer.className = 'standalone-chart-viewer';
    viewerContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-y: auto;
        padding: 20px;
        color: white;
        display: none;
    `;
    
    // Create header with close button
    const header = document.createElement('div');
    header.className = 'viewer-header';
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 1200px;
        margin-bottom: 20px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Advanced Analysis Charts';
    title.style.cssText = `
        margin: 0;
        padding: 0;
        color: white;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Viewer';
    closeButton.className = 'btn btn-danger';
    closeButton.onclick = () => {
        document.getElementById('standalone-chart-viewer').style.display = 'none';
    };
    
    header.appendChild(title);
    header.appendChild(closeButton);
    viewerContainer.appendChild(header);
    
    // Create chart containers
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-container';
    chartsContainer.style.cssText = `
        width: 100%;
        max-width: 1200px;
        display: flex;
        flex-direction: column;
        gap: 30px;
    `;
    
    // Tragedy Commons specific chart
    const tcRegenContainer = createChartSection(
        'Tragedy of Commons: Resource Regeneration vs. Harvest',
        'standalone-tc-regen-chart',
        'Shows resource regeneration vs. harvest rate over time.'
    );
    chartsContainer.appendChild(tcRegenContainer);
    
    // Strategy performance chart
    const strategyContainer = createChartSection(
        'Strategy Performance Over Time',
        'standalone-strategy-chart',
        'Shows how each strategy performs over the course of the simulation.'
    );
    chartsContainer.appendChild(strategyContainer);
    
    // Sustainability impact chart
    const sustainabilityContainer = createChartSection(
        'Sustainability Impact by Strategy',
        'standalone-sustainability-chart',
        'Shows how each strategy affects the long-term sustainability of shared resources.'
    );
    chartsContainer.appendChild(sustainabilityContainer);
    
    // Social welfare chart
    const welfareContainer = createChartSection(
        'Social Welfare Contribution by Strategy',
        'standalone-welfare-chart',
        'Shows how each strategy contributes to the overall welfare of the group.'
    );
    chartsContainer.appendChild(welfareContainer);
    
    viewerContainer.appendChild(chartsContainer);
    document.body.appendChild(viewerContainer);
    
    console.log("Standalone viewer created and added to DOM");
}

// Helper to create chart section
function createChartSection(title, canvasId, description) {
    const section = document.createElement('div');
    section.className = 'chart-section';
    section.style.cssText = `
        background-color: #222;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        width: 100%;
    `;
    
    const titleElem = document.createElement('h4');
    titleElem.textContent = title;
    titleElem.style.cssText = `
        margin-top: 0;
        margin-bottom: 10px;
        color: white;
    `;
    section.appendChild(titleElem);
    
    if (description) {
        const descElem = document.createElement('p');
        descElem.textContent = description;
        descElem.style.cssText = `
            margin-bottom: 15px;
            color: #ccc;
            font-style: italic;
        `;
        section.appendChild(descElem);
    }
    
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
        position: relative;
        height: 400px;
        width: 100%;
        background-color: rgba(50,50,50,0.3);
        border-radius: 4px;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.cssText = `
        display: block !important;
        visibility: visible !important;
        height: 400px !important;
        width: 100% !important;
        position: relative !important;
        z-index: 100 !important;
    `;
    
    canvasContainer.appendChild(canvas);
    section.appendChild(canvasContainer);
    
    return section;
}

// Function to render charts in the standalone viewer
function renderStandaloneCharts(data) {
    console.log("Rendering standalone advanced charts");
    
    if (!data || !data.results || !data.results.final_stats) {
        console.error("Invalid data for standalone charts");
        return;
    }
    
    // Make sure the viewer exists
    if (!document.getElementById('standalone-chart-viewer')) {
        createStandaloneViewer();
    }
    
    try {
        // Show the viewer
        document.getElementById('standalone-chart-viewer').style.display = 'flex';
        
        // Get data
        const roundData = data.results.rounds || {};
        const finalStats = data.results.final_stats || {};
        const strategies = Object.keys(finalStats.strategies || {});
        const dilemmaType = data.config.dilemma_type;
        
        // Render resource regeneration chart (Tragedy of Commons)
        if (dilemmaType === 'tragedy_commons' && data.results.resource_levels && data.results.harvest_levels) {
            const canvas = document.getElementById('standalone-tc-regen-chart');
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.standaloneCharts && window.standaloneCharts.tcRegen) {
                window.standaloneCharts.tcRegen.destroy();
            }
            
            if (!window.standaloneCharts) {
                window.standaloneCharts = {};
            }
            
            window.standaloneCharts.tcRegen = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.results.rounds.map((_, i) => `Round ${i+1}`),
                    datasets: [
                        {
                            label: 'Resource Level',
                            data: data.results.resource_levels,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: true,
                            tension: 0.1
                        },
                        {
                            label: 'Total Harvest',
                            data: data.results.harvest_levels,
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            fill: true,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Units'
                            }
                        }
                    }
                }
            });
        }
        
        // Render strategy performance chart
        const canvas2 = document.getElementById('standalone-strategy-chart');
        const ctx2 = canvas2.getContext('2d');
        
        if (window.standaloneCharts && window.standaloneCharts.strategy) {
            window.standaloneCharts.strategy.destroy();
        }
        
        // Prepare strategy scores by round
        const strategyDatasets = strategies.map((strategy, index) => {
            const scores = data.results.rounds.map(round => {
                if (round.strategy_scores && round.strategy_scores[strategy]) {
                    return round.strategy_scores[strategy];
                }
                return 0;
            });
            
            return {
                label: strategy.replace('_', ' ').charAt(0).toUpperCase() + strategy.replace('_', ' ').slice(1),
                data: scores,
                borderColor: getStrategyColor(strategy, index),
                backgroundColor: getStrategyColor(strategy, index, 0.1),
                tension: 0.1
            };
        });
        
        window.standaloneCharts.strategy = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: data.results.rounds.map((_, i) => `Round ${i+1}`),
                datasets: strategyDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Score'
                        }
                    }
                }
            }
        });
        
        // Render sustainability impact chart
        const canvas3 = document.getElementById('standalone-sustainability-chart');
        const ctx3 = canvas3.getContext('2d');
        
        if (window.standaloneCharts && window.standaloneCharts.sustainability) {
            window.standaloneCharts.sustainability.destroy();
        }
        
        const sustainabilityData = {
            labels: strategies.map(humanizeStrategyName),
            datasets: [{
                label: 'Sustainability Impact',
                data: strategies.map(strategy => {
                    const stratData = finalStats.strategies[strategy] || {};
                    const impact = stratData.sustainability_impact || 0;
                    return impact * 100; // Scale for better visualization
                }),
                backgroundColor: strategies.map((strategy, index) => getStrategyColor(strategy, index, 0.7)),
                borderColor: strategies.map((strategy, index) => getStrategyColor(strategy, index)),
                borderWidth: 1
            }]
        };
        
        window.standaloneCharts.sustainability = new Chart(ctx3, {
            type: 'bar',
            data: sustainabilityData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Impact Score'
                        }
                    }
                }
            }
        });
        
        // Render social welfare chart
        const canvas4 = document.getElementById('standalone-welfare-chart');
        const ctx4 = canvas4.getContext('2d');
        
        if (window.standaloneCharts && window.standaloneCharts.welfare) {
            window.standaloneCharts.welfare.destroy();
        }
        
        const welfareData = {
            labels: strategies.map(humanizeStrategyName),
            datasets: [{
                label: 'Social Welfare',
                data: strategies.map(strategy => {
                    const stratData = finalStats.strategies[strategy] || {};
                    const welfare = stratData.social_welfare || 0;
                    return welfare * 100; // Scale for better visualization
                }),
                backgroundColor: strategies.map((strategy, index) => getStrategyColor(strategy, index, 0.7)),
                borderColor: strategies.map((strategy, index) => getStrategyColor(strategy, index)),
                borderWidth: 1
            }]
        };
        
        window.standaloneCharts.welfare = new Chart(ctx4, {
            type: 'bar',
            data: welfareData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Welfare Score'
                        }
                    }
                }
            }
        });
        
        console.log("Standalone charts rendered successfully");
    } catch (error) {
        console.error("Error rendering standalone charts:", error);
    }
}

// Helper function to get color for a strategy
function getStrategyColor(strategy, index, alpha = 1) {
    const colors = {
        'sustainable': `rgba(46, 204, 113, ${alpha})`, // Green
        'greedy': `rgba(231, 76, 60, ${alpha})`,      // Red
        'adaptive': `rgba(52, 152, 219, ${alpha})`,   // Blue
        'fair_share': `rgba(241, 196, 15, ${alpha})`, // Yellow
        'random': `rgba(155, 89, 182, ${alpha})`,     // Purple
        'tit_for_tat': `rgba(230, 126, 34, ${alpha})`, // Orange
        'conservative': `rgba(149, 165, 166, ${alpha})` // Gray
    };
    
    // If we have a predefined color for this strategy, use it
    if (colors[strategy]) {
        return colors[strategy];
    }
    
    // Otherwise generate a color based on index
    const defaultColors = [
        `rgba(46, 204, 113, ${alpha})`,   // Green
        `rgba(231, 76, 60, ${alpha})`,    // Red
        `rgba(52, 152, 219, ${alpha})`,   // Blue
        `rgba(241, 196, 15, ${alpha})`,   // Yellow
        `rgba(155, 89, 182, ${alpha})`,   // Purple
        `rgba(230, 126, 34, ${alpha})`,   // Orange
        `rgba(149, 165, 166, ${alpha})`   // Gray
    ];
    
    return defaultColors[index % defaultColors.length];
}

// Function to convert strategy name to human-readable form
function humanizeStrategyName(strategy) {
    return strategy
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Advanced charts standalone script loaded");
    
    // Create the viewer container
    createStandaloneViewer();
    
    // Add a button to the advanced charts tab to open the standalone viewer
    setTimeout(() => {
        const advancedTab = document.getElementById('advanced-charts');
        if (advancedTab) {
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'text-center mb-4';
            
            const standaloneButton = document.createElement('button');
            standaloneButton.className = 'btn btn-success';
            standaloneButton.textContent = 'Open Charts in Standalone Viewer';
            standaloneButton.onclick = () => {
                if (window.simulationResults) {
                    renderStandaloneCharts(window.simulationResults);
                } else {
                    alert('No simulation results available yet. Run a simulation first.');
                }
            };
            
            buttonDiv.appendChild(standaloneButton);
            
            // Find the first element in the tab (which should be our warning)
            const firstElement = advancedTab.querySelector('.col-12');
            if (firstElement) {
                advancedTab.insertBefore(buttonDiv, firstElement.nextSibling);
            } else {
                advancedTab.prepend(buttonDiv);
            }
        }
    }, 1000);
});

// Hook into the simulation results
const originalDisplayFunction = window.displaySimulationResults;
window.displaySimulationResults = function(data) {
    if (typeof originalDisplayFunction === 'function') {
        originalDisplayFunction(data);
    }
    
    // Set up our standalone charts when results are displayed
    if (data && data.results) {
        // Store data for the standalone viewer
        window.simulationResults = data;
    }
};