import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const CostPerCpuGraph = ({ data, phase2Date, baselineCosts, costPerResource }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        console.log('CostPerCpuGraph received data:', data);
        console.log('CostPerCpuGraph received phase2Date:', phase2Date);
        if (!data?.items) {
            console.log('No data available');
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Get cost per CPU data using total costs
        const costPerCpuOnDemand = data.items.map(item => {
            const totalCost = parseFloat(item.totalCpuCostOnDemand) || 0;
            const cpuCount = parseFloat(item.cpuCountOnDemand) || 0;
            return cpuCount > 0 ? totalCost / cpuCount : 0;
        });

        const costPerCpuSpot = data.items.map(item => {
            const totalCost = parseFloat(item.totalCpuCostSpot) || 0;
            const cpuCount = parseFloat(item.cpuCountSpot) || 0;
            return cpuCount > 0 ? totalCost / cpuCount : 0;
        });

        const costPerCpuSpotFallback = data.items.map(item => {
            const totalCost = parseFloat(item.totalCpuCostSpotFallback) || 0;
            const cpuCount = parseFloat(item.cpuCountSpotFallback) || 0;
            return cpuCount > 0 ? totalCost / cpuCount : 0;
        });

        // Calculate average cost per CPU using total costs
        const averageCost = data.items.map(item => {
            const totalCost = (parseFloat(item.totalCpuCostOnDemand) || 0) + 
                            (parseFloat(item.totalCpuCostSpot) || 0) + 
                            (parseFloat(item.totalCpuCostSpotFallback) || 0);
            
            const totalCPUs = (parseFloat(item.cpuCountOnDemand) || 0) + 
                            (parseFloat(item.cpuCountSpot) || 0) + 
                            (parseFloat(item.cpuCountSpotFallback) || 0);
            
            return totalCPUs > 0 ? totalCost / totalCPUs : 0;
        });

        // Format dates for hover text
        const hoverDates = dates.map(date => 
            date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        console.log('Processed cost data:', {
            dates,
            costPerCpuOnDemand,
            costPerCpuSpot,
            costPerCpuSpotFallback,
            averageCost
        });

        // Create traces for the stacked bar chart
        const traces = [
            {
                name: 'On-Demand',
                x: dates,
                y: costPerCpuOnDemand,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(130, 180, 255, 0.7)', width: 2 },
                marker: { color: 'rgba(130, 180, 255, 0.7)', size: 6 },
                hovertemplate: 'On-Demand: $%{y:.5f}<extra></extra>'
            },
            {
                name: 'Spot',
                x: dates,
                y: costPerCpuSpot,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(211, 211, 211, 0.7)', width: 2 },
                marker: { color: 'rgba(211, 211, 211, 0.7)', size: 6 },
                hovertemplate: 'Spot: $%{y:.5f}<extra></extra>'
            },
            {
                name: 'Spot Fallback',
                x: dates,
                y: costPerCpuSpotFallback,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(250, 217, 131, 0.7)', width: 2 },
                marker: { color: 'rgba(250, 217, 131, 0.7)', size: 6 },
                hovertemplate: 'Spot Fallback: $%{y:.5f}<extra></extra>'
            },
            {
                name: 'Average',
                x: dates,
                y: averageCost,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(255, 107, 53, 0.7)', width: 2 },
                marker: { color: 'rgba(255, 107, 53, 0.7)', size: 6 },
                hovertemplate: 'Average: $%{y:.5f}<extra></extra>'
            }
        ];

        // Add vertical line for Phase 2 enablement
        if (phase2Date) {
            const automationDate = new Date(phase2Date);
            automationDate.setHours(0, 0, 0, 0);
            
            // Calculate the maximum y-value for the line
            const maxY = Math.max(
                ...costPerCpuOnDemand,
                ...costPerCpuSpot,
                ...costPerCpuSpotFallback
            );
            
            const phase2Line = {
                name: 'Automation Enabled',
                x: [automationDate, automationDate],
                y: [0, maxY],
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: 'rgba(255, 0, 0, 1)',
                    width: 1,
                    dash: 'dash'
                },
                yaxis: 'y',
                hoverinfo: 'text',
                hovertemplate: `Automation Enabled: ${automationDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}<extra></extra>`,
                showlegend: true
            };
            traces.push(phase2Line);
        }

        // Add baseline lines after phase 2 date if available
        if (phase2Date && baselineCosts) {
            console.log('Adding baseline lines with costs:', baselineCosts);
            const automationDate = new Date(phase2Date);
            const datesBeforeAutomation = dates.filter(date => date < automationDate);
            const datesAfterAutomation = dates.filter(date => date >= automationDate);
            console.log('Dates before automation:', datesBeforeAutomation.length);
            console.log('Dates after automation:', datesAfterAutomation.length);
            
            if (datesBeforeAutomation.length > 0 && datesAfterAutomation.length > 0) {
                // On-Demand baseline
                const onDemandBaseline = {
                    name: 'On-Demand Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.onDemand.cpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(130, 180, 255, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `On-Demand Baseline: $${baselineCosts.onDemand.cpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(onDemandBaseline);

                // Spot baseline
                const spotBaseline = {
                    name: 'Spot Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spot.cpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(211, 211, 211, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Baseline: $${baselineCosts.spot.cpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotBaseline);

                // Spot Fallback baseline
                const spotFallbackBaseline = {
                    name: 'Spot Fallback Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spotFallback.cpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(250, 217, 131, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Fallback Baseline: $${baselineCosts.spotFallback.cpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotFallbackBaseline);

                // Calculate and add average baseline
                const averageBaseline = (baselineCosts.onDemand.cpu + 
                                       baselineCosts.spot.cpu + 
                                       baselineCosts.spotFallback.cpu) / 3;
                
                const averageBaselineTrace = {
                    name: 'Average Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(averageBaseline),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(255, 107, 53, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Average Baseline: $${averageBaseline.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(averageBaselineTrace);
            }
        }

        console.log('Final traces array:', traces);

        setPlotData(traces);
        setLayout({
            title: {
                text: 'Cost per CPU by Instance Type',
                font: { size: 16 }
            },
            xaxis: {
                title: 'Date',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                range: [dates[0], dates[dates.length - 1]],
                automargin: true
            },
            yaxis: {
                title: 'Cost per CPU ($)',
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
            },
            annotations: phase2Date ? [{
                x: new Date(phase2Date).setHours(0, 0, 0, 0),
                y: Math.max(
                    ...costPerCpuOnDemand,
                    ...costPerCpuSpot,
                    ...costPerCpuSpotFallback
                ),
                text: 'Automation Enabled',
                showarrow: false,
                font: {
                    size: 12,
                    color: 'rgba(255, 0, 0, 1)'
                },
                xanchor: 'center',
                yanchor: 'bottom',
                yshift: 5
            }] : []
        });
        
    }, [data, phase2Date, baselineCosts]);

    if (!data?.items) {
        console.log('CostPerCpuGraph: No data available');
        return <div>No data available</div>;
    }

    return (
        <Plot
            data={plotData}
            layout={layout}
            config={{
                responsive: true,
                displayModeBar: false,
                displaylogo: false
            }}
            style={{ width: '100%', height: '400px' }}
        />
    );
};

export default CostPerCpuGraph; 