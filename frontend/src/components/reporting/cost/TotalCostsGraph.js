import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import './CostGraph.css';

const TotalCostsGraph = ({ data, phase2Date, baselineCosts }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        if (!data || !data.items) {
            return;
        }

        // Process the data
        const dates = data.items.map(item => {
            const date = new Date(item.timestamp);
            date.setHours(0, 0, 0, 0);
            return date;
        });

        // Calculate total costs for each type
        const onDemandCosts = data.items.map(item => {
            const cpuCost = parseFloat(item.totalCpuCostOnDemand || 0);
            const ramCost = parseFloat(item.totalRamCostOnDemand || 0);
            const gpuCost = parseFloat(item.totalGpuCostOnDemand || 0);
            return Number((cpuCost + ramCost + gpuCost).toFixed(2));
        });

        const spotCosts = data.items.map(item => {
            const cpuCost = parseFloat(item.totalCpuCostSpot || 0);
            const ramCost = parseFloat(item.totalRamCostSpot || 0);
            const gpuCost = parseFloat(item.totalGpuCostSpot || 0);
            return Number((cpuCost + ramCost + gpuCost).toFixed(2));
        });

        const spotFallbackCosts = data.items.map(item => {
            const cpuCost = parseFloat(item.totalCpuCostSpotFallback || 0);
            const ramCost = parseFloat(item.totalRamCostSpotFallback || 0);
            const gpuCost = parseFloat(item.totalGpuCostSpotFallback || 0);
            return Number((cpuCost + ramCost + gpuCost).toFixed(2));
        });
        
        // Calculate total costs for each day
        const totalCostsPerDay = data.items.map((_, index) => 
            Number((onDemandCosts[index] + spotCosts[index] + spotFallbackCosts[index]).toFixed(2))
        );

        // Format dates for hover text
        const hoverDates = dates.map(date => 
            date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        // Create traces for the stacked bar chart
        const traces = [
            {
                name: 'On-Demand Cost',
                x: dates,
                y: onDemandCosts,
                type: 'bar',
                textposition: 'none',
                marker: {
                    color: 'rgba(130, 180, 255, 0.7)',
                    line: {
                        color: 'rgba(130, 180, 255, 1)',
                        width: 1
                    }
                }
            },
            {
                name: 'Spot Cost',
                x: dates,
                y: spotCosts,
                type: 'bar',
                textposition: 'none',
                marker: {
                    color: 'rgba(211, 211, 211, 0.7)',
                    line: {
                        color: 'rgba(211, 211, 211, 1)',
                        width: 1
                    }
                }
            },
            {
                name: 'Spot Fallback Cost',
                x: dates,
                y: spotFallbackCosts,
                type: 'bar',
                textposition: 'none',
                marker: {
                    color: 'rgba(250, 217, 131, 0.7)',
                    line: {
                        color: 'rgba(250, 217, 131, 1)',
                        width: 1
                    }
                }
            },
            {
                name: 'Total Cost',
                x: dates,
                y: totalCostsPerDay,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: '#FF6B35',
                    width: 2
                },
                marker: {
                    color: '#FF6B35',
                    size: 6
                }
            }
        ];

        // Add vertical line for Phase 2 enablement
        if (phase2Date) {
            const automationDate = new Date(phase2Date);
            automationDate.setHours(0, 0, 0, 0);
            
            // Calculate the maximum y-value for the line
            const maxY = Math.max(...totalCostsPerDay) || 1;
            
            const phase2Line = {
                name: 'Automation Enabled',
                x: [automationDate, automationDate],
                y: [0, maxY],
                type: 'scatter',
                mode: 'lines+text',
                line: {
                    color: 'rgba(255, 0, 0, 1)',
                    width: 1,
                    dash: 'dash'
                },
                text: ['', 'Automation Enabled'],
                textposition: 'top center',
                textfont: {
                    color: 'rgba(255, 0, 0, 1)',
                    size: 12,
                },
                yaxis: 'y',
                showlegend: true,
                hoverinfo: 'text',
                hovertemplate: `Automation Enabled: ${automationDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}<extra></extra>`,
            };
            traces.push(phase2Line);
        }

        // Add projected cost trace after phase 2 date if available
        if (phase2Date && baselineCosts) {
            const automationDate = new Date(phase2Date);
            const datesAfterAutomation = dates.filter(date => date >= automationDate);
            
            if (datesAfterAutomation.length > 0) {
                // Calculate projected costs using baseline values and current resource counts
                const projectedCosts = datesAfterAutomation.map((date, index) => {
                    const dateIndex = dates.indexOf(date);
                    const item = data.items[dateIndex];
                    
                    // Calculate projected costs for each instance type separately
                    const onDemandCost = 
                        (parseFloat(item.cpuCountOnDemand) || 0) * baselineCosts.onDemand.cpu +
                        (parseFloat(item.ramGibOnDemand) || 0) * baselineCosts.onDemand.memory +
                        (parseFloat(item.gpuCountOnDemand) || 0) * baselineCosts.onDemand.gpu;
                    
                    const spotCost = 
                        (parseFloat(item.cpuCountSpot) || 0) * baselineCosts.spot.cpu +
                        (parseFloat(item.ramGibSpot) || 0) * baselineCosts.spot.memory +
                        (parseFloat(item.gpuCountSpot) || 0) * baselineCosts.spot.gpu;
                    
                    const spotFallbackCost = 
                        (parseFloat(item.cpuCountSpotFallback) || 0) * baselineCosts.spotFallback.cpu +
                        (parseFloat(item.ramGibSpotFallback) || 0) * baselineCosts.spotFallback.memory +
                        (parseFloat(item.gpuCountSpotFallback) || 0) * baselineCosts.spotFallback.gpu;
                    
                    return onDemandCost + spotCost + spotFallbackCost;
                });

                // Add projected cost trace
                const projectedTrace = {
                    name: 'Projected Cost (No Automation)',
                    x: datesAfterAutomation,
                    y: projectedCosts,
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(255, 107, 53, 0.7)',
                        width: 2,
                        dash: 'dot'
                    },
                    hovertemplate: 'Projected Cost: $%{y:.2f}<extra></extra>',
                    showlegend: false
                };
                traces.push(projectedTrace);
            }
        }

        // Create layout with single y-axis
        const layoutConfig = {
            title: {
                text: 'Total Cost by Instance Type',
                font: { size: 16 }
            },
            barmode: 'stack',
            xaxis: {
                title: 'Date',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                range: data?.items?.length > 0 ? [
                    new Date(data.items[0].timestamp).setHours(0, 0, 0, 0),
                    new Date(data.items[data.items.length - 1].timestamp).setHours(0, 0, 0, 0)
                ] : undefined,
                automargin: true
            },
            yaxis: {
                title: 'Cost ($)',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                rangemode: 'tozero',
                range: [0, null]
            },
            hovermode: 'x unified',
            showlegend: false,
            margin: { t: 40, r: 0, b: 40, l: 60 },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            hoverlabel: {
                bgcolor: 'white',
                bordercolor: 'rgba(0, 0, 0, 0.1)',
                font: { color: 'black' }
            }
        };

        setPlotData(traces);
        setLayout(layoutConfig);
    }, [data, phase2Date, baselineCosts]);

    if (!data || !data.items) {
        return <div>No data available</div>;
    }

    return (
            <Plot
                data={plotData}
                layout={layout}
                style={{ width: '100%', height: '400px' }}
                config={{
                    responsive: true,
                    displayModeBar: false
                }}
            />
    );
};

export default TotalCostsGraph; 