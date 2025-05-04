/**
 * Chart configuration and utility functions for the social dilemmas simulation results
 * 
 * This module provides utility functions for creating and configuring various chart types
 * used throughout the application to visualize simulation data. It handles consistent
 * color schemes, chart formatting, and data processing.
 * 
 * @author Theodore Mui
 * @version 1.0.1
 * @date May 4, 2025
 */

// Only declare these variables once - prevent redeclaration error
if (typeof window.chartColors === 'undefined') {
    window.chartColors = [
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

    window.chartBorderColors = [
        'rgb(54, 162, 235)',
        'rgb(255, 99, 132)',
        'rgb(75, 192, 192)',
        'rgb(255, 159, 64)',
        'rgb(153, 102, 255)',
        'rgb(255, 205, 86)',
        'rgb(201, 203, 207)',
        'rgb(255, 99, 255)',
        'rgb(99, 255, 132)',
        'rgb(100, 149, 237)'
    ];

    // Strategy-specific colors
    window.strategyColors = {
        'sustainable': 'rgba(75, 192, 192, 0.7)',  // Green
        'greedy': 'rgba(255, 99, 132, 0.7)',       // Red
        'adaptive': 'rgba(54, 162, 235, 0.7)',     // Blue
        'fair_share': 'rgba(255, 159, 64, 0.7)',   // Orange
        'cooperator': 'rgba(75, 192, 192, 0.7)',   // Green
        'defector': 'rgba(255, 99, 132, 0.7)',     // Red
        'partial': 'rgba(54, 162, 235, 0.7)',      // Blue
        'random': 'rgba(153, 102, 255, 0.7)',      // Purple
        'conditional': 'rgba(255, 205, 86, 0.7)',  // Yellow
        'tit_for_tat': 'rgba(201, 203, 207, 0.7)', // Grey
        'generous': 'rgba(255, 159, 64, 0.7)'      // Orange
    };
}

// These variables should always exist as they are set in the conditional block above
// Use direct window variables for all references to avoid declaration conflicts

// Strategy border colors - store in window to avoid redeclaration issues
if (typeof window.strategyBorderColors === 'undefined') {
    window.strategyBorderColors = {
        'sustainable': 'rgb(75, 192, 192)',
        'greedy': 'rgb(255, 99, 132)',
        'adaptive': 'rgb(54, 162, 235)',
        'fair_share': 'rgb(255, 159, 64)',
        'cooperator': 'rgb(75, 192, 192)',
        'defector': 'rgb(255, 99, 132)',
        'partial': 'rgb(54, 162, 235)',
        'random': 'rgb(153, 102, 255)',
        'conditional': 'rgb(255, 205, 86)',
        'tit_for_tat': 'rgb(201, 203, 207)',
        'generous': 'rgb(255, 159, 64)'
    };
}

/**
 * Creates a line chart for round-by-round data
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @param {string} yAxisLabel - Label for Y axis
 * @returns {Chart} The created chart
 */
function createLineChart(canvasId, data, title, yAxisLabel) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    padding: 10,
                    bodyFont: {
                        size: 14
                    },
                    titleFont: {
                        size: 16
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Round',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: yAxisLabel,
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 10
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

/**
 * Creates a bar chart for strategy performance comparison
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @param {string} yAxisLabel - Label for Y axis
 * @returns {Chart} The created chart
 */
function createBarChart(canvasId, data, title, yAxisLabel) {
    const canvas = document.getElementById(canvasId);
    
    // Ensure canvas is visible with correct dimensions
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.height = '450px';
        canvas.style.width = '100%';
    }
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas before creating a new chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    return new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500 // Faster animation for better performance
            },
            plugins: {
                legend: {
                    display: false,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 15
                    }
                },
                tooltip: {
                    padding: 10,
                    bodyFont: {
                        size: 14
                    },
                    titleFont: {
                        size: 16
                    },
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Strategy',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: yAxisLabel,
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 10
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

/**
 * Creates a pie chart for distribution data
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @returns {Chart} The created chart
 */
function createPieChart(canvasId, data, title) {
    const canvas = document.getElementById(canvasId);
    
    // Ensure canvas is visible with correct dimensions
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.height = '450px';
        canvas.style.width = '100%';
    }
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas before creating a new chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    return new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500 // Faster animation for better performance
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 15
                    }
                },
                tooltip: {
                    padding: 10,
                    bodyFont: {
                        size: 14
                    },
                    titleFont: {
                        size: 16
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Creates a doughnut chart for distribution data
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data
 * @param {string} title - Chart title
 * @returns {Chart} The created chart
 */
function createDoughnutChart(canvasId, data, title) {
    const canvas = document.getElementById(canvasId);
    
    // Ensure canvas is visible with correct dimensions
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.height = '450px';
        canvas.style.width = '100%';
    }
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas before creating a new chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500 // Faster animation for better performance
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 15
                    }
                },
                tooltip: {
                    padding: 10,
                    bodyFont: {
                        size: 14
                    },
                    titleFont: {
                        size: 16
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Gets a color for a strategy, with fallback to generic colors
 * @param {string} strategy - Strategy name
 * @param {number} index - Index for fallback color
 * @returns {string} Color in rgba format
 */
function getStrategyColor(strategy, index) {
    return window.strategyColors[strategy] || window.chartColors[index % window.chartColors.length];
}

/**
 * Gets a border color for a strategy, with fallback to generic colors
 * @param {string} strategy - Strategy name
 * @param {number} index - Index for fallback color
 * @returns {string} Color in rgb format
 */
function getStrategyBorderColor(strategy, index) {
    return window.strategyBorderColors[strategy] || window.chartBorderColors[index % window.chartBorderColors.length];
}

/**
 * Prepares line chart data with multiple series
 * @param {Object} roundData - Round-by-round data
 * @param {Array} strategies - List of strategies
 * @param {string} dataKey - Key to extract from roundData
 * @returns {Object} Formatted chart data
 */
function prepareLineChartData(roundData, strategies, dataKey) {
    const labels = Object.keys(roundData).map(Number).sort((a, b) => a - b);
    
    const datasets = strategies.map((strategy, index) => {
        const data = labels.map(round => {
            const roundDataValue = roundData[round] || {};
            
            // Check for strategy_harvests or strategy_contributions
            if (dataKey === 'harvest' && roundDataValue.strategy_harvests) {
                return roundDataValue.strategy_harvests[strategy] || 0;
            } 
            else if (dataKey === 'contribution' && roundDataValue.strategy_contributions) {
                return roundDataValue.strategy_contributions[strategy] || 0;
            }
            else {
                // Fallback to original behavior
                const strategyData = roundDataValue[strategy] || {};
                return strategyData[dataKey] || 0;
            }
        });
        
        return {
            label: humanizeStrategyName(strategy),
            data: data,
            backgroundColor: getStrategyColor(strategy, index),
            borderColor: getStrategyBorderColor(strategy, index),
            borderWidth: 2,
            tension: 0.1,
            fill: false
        };
    });
    
    return {
        labels: labels,
        datasets: datasets
    };
}

/**
 * Prepares bar chart data for final results
 * @param {Object} finalStats - Final statistics
 * @param {string} dataKey - Key to extract from finalStats
 * @returns {Object} Formatted chart data
 */
function prepareBarChartData(finalStats, dataKey) {
    const strategies = Object.keys(finalStats.strategies || {});
    const data = strategies.map(strategy => finalStats.strategies[strategy][dataKey] || 0);
    
    const bgColors = strategies.map((strategy, index) => getStrategyColor(strategy, index));
    const borderColors = strategies.map((strategy, index) => getStrategyBorderColor(strategy, index));
    
    return {
        labels: strategies.map(humanizeStrategyName),
        datasets: [{
            label: capitalizeFirstLetter(dataKey),
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    };
}

/**
 * Prepares pie chart data for resource distribution
 * @param {Object} finalStats - Final statistics
 * @returns {Object} Formatted chart data
 */
function preparePieChartData(finalStats, dataKey = 'final_resources') {
    const strategies = Object.keys(finalStats.strategies || {});
    const data = strategies.map(strategy => finalStats.strategies[strategy][dataKey] || 0);
    
    const bgColors = strategies.map((strategy, index) => getStrategyColor(strategy, index));
    const borderColors = strategies.map((strategy, index) => getStrategyBorderColor(strategy, index));
    
    return {
        labels: strategies.map(humanizeStrategyName),
        datasets: [{
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    };
}

/**
 * Converts strategy names to human-readable format
 * @param {string} strategy - Strategy name in snake_case
 * @returns {string} Human-readable name
 */
function humanizeStrategyName(strategy) {
    return strategy
        .split('_')
        .map(capitalizeFirstLetter)
        .join(' ');
}

/**
 * Capitalizes the first letter of a string
 * @param {string} string - Input string
 * @returns {string} String with first letter capitalized
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}