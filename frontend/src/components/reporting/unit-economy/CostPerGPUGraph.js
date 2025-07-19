import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const CostPerGPUGraph = ({ data, phase2Date, baselineCosts }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        console.log('CostPerGPUGraph received data:', data);
        console.log('CostPerGPUGraph received phase2Date:', phase2Date);
        if (!data || !data.items) {
            console.log('No data or items array available');
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Get raw cost data
        const costPerGpuOnDemand = data.items.map(item => {
            const totalCost = parseFloat(item.totalGpuCostOnDemand) || 0;
            const gpuCount = parseFloat(item.gpuCountOnDemand) || 0;
            return gpuCount > 0 ? totalCost / gpuCount : 0;
        });

        const costPerGpuSpot = data.items.map(item => {
            const totalCost = parseFloat(item.totalGpuCostSpot) || 0;
            const gpuCount = parseFloat(item.gpuCountSpot) || 0;
            return gpuCount > 0 ? totalCost / gpuCount : 0;
        });

        const costPerGpuSpotFallback = data.items.map(item => {
            const totalCost = parseFloat(item.totalGpuCostSpotFallback) || 0;
            const gpuCount = parseFloat(item.gpuCountSpotFallback) || 0;
            return gpuCount > 0 ? totalCost / gpuCount : 0;
        });

        // Calculate average cost across all types
        const averageCost = data.items.map(item => {
            const totalCost = (parseFloat(item.totalGpuCostOnDemand) || 0) + 
                            (parseFloat(item.totalGpuCostSpot) || 0) + 
                            (parseFloat(item.totalGpuCostSpotFallback) || 0);
            
            const totalGPUs = (parseFloat(item.gpuCountOnDemand) || 0) + 
                            (parseFloat(item.gpuCountSpot) || 0) + 
                            (parseFloat(item.gpuCountSpotFallback) || 0);
            
            return totalGPUs > 0 ? totalCost / totalGPUs : 0;
        });

        // Format dates for hover text
        const hoverDates = dates.map(date => 
            date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        console.log('Processed GPU cost data:', {
            dates,
            costPerGpuOnDemand,
            costPerGpuSpot,
            costPerGpuSpotFallback,
            sampleItem: data.items[0]
        });

        // Create traces for the stacked bar chart
        const traces = [
            {
                name: 'On-Demand Cost/GPU',
                x: dates,
                y: costPerGpuOnDemand,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: '#82b4ff',
                    width: 2
                },
                marker: {
                    color: '#82b4ff',
                    size: 6
                }
            },
            {
                name: 'Spot Cost/GPU',
                x: dates,
                y: costPerGpuSpot,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: '#D3D3D3',
                    width: 2
                },
                marker: {
                    color: '#D3D3D3',
                    size: 6
                },
                
            },
            {
                name: 'Spot Fallback Cost/GPU',
                x: dates,
                y: costPerGpuSpotFallback,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: '#fad983',
                    width: 2
                },
                marker: {
                    color: '#fad983',
                    size: 6
                }
            },
            {
                name: 'Average Cost/GPU',
                x: dates,
                y: averageCost,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: '#FF6B35',
                    width: 2
                },
                marker: {
                    color: '#FF6B35',
                    size: 6
                },
            }
        ];

        // Add Phase 2 enablement line if date is available
        if (phase2Date) {
            console.log('Adding phase 2 line with date:', phase2Date);
            
            const automationDate = new Date(phase2Date);
            const maxY = Math.max(...averageCost) || 1;
            
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
                    size: 13,
                    family: 'Arial'
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
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.onDemand.gpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(130, 180, 255, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `On-Demand Baseline: $${baselineCosts.onDemand.gpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(onDemandBaseline);

                // Spot baseline
                const spotBaseline = {
                    name: 'Spot Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spot.gpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(211, 211, 211, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Baseline: $${baselineCosts.spot.gpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotBaseline);

                // Spot Fallback baseline
                const spotFallbackBaseline = {
                    name: 'Spot Fallback Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spotFallback.gpu),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(250, 217, 131, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Fallback Baseline: $${baselineCosts.spotFallback.gpu.toFixed(2)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotFallbackBaseline);

                // Calculate and add average baseline
                const nonZeroCosts = [
                    baselineCosts.onDemand.gpu,
                    baselineCosts.spot.gpu,
                    baselineCosts.spotFallback.gpu
                ].filter(cost => cost > 0);
                
                const averageBaseline = nonZeroCosts.length > 0 
                    ? nonZeroCosts.reduce((sum, cost) => sum + cost, 0) / nonZeroCosts.length 
                    : 0;
                
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

        // Create layout with single y-axis
        const layoutConfig = {
            title: {
                text: 'Cost per GPU by Instance Type',
                font: { size: 16 }
            },
            xaxis: {
                title: 'Date',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                range: data?.items?.length > 0 ? [
                    new Date(data.items[0].timestamp),
                    new Date(data.items[data.items.length - 1].timestamp)
                ] : undefined,
                automargin: true
            },
            yaxis: {
                title: 'Cost per GPU ($)',
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
        console.log('CostPerGPUGraph: No data available');
        return <div>No data available</div>;
    }

    return (
            <Plot
                data={plotData}
                layout={layout}
                config={{
                    responsive: true,
                    displayModeBar: false
                }}
                style={{ width: '100%', height: '400px' }}
            />
    );
};

export default CostPerGPUGraph; 