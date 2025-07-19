import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const CostPerGbMemory = ({ data, phase2Date, baselineCosts }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        console.log('CostPerGbMemory received data:', data);
        console.log('CostPerGbMemory received phase2Date:', phase2Date);
        if (!data?.items) {
            console.log('No data available');
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Get cost per GB memory data using unit costs
        const costPerGbOnDemand = data.items.map(item => {
            const totalCost = parseFloat(item.totalRamCostOnDemand) || 0;
            const ramGib = parseFloat(item.ramGibOnDemand) || 0;
            return ramGib > 0 ? totalCost / ramGib : 0;
        });

        const costPerGbSpot = data.items.map(item => {
            const totalCost = parseFloat(item.totalRamCostSpot) || 0;
            const ramGib = parseFloat(item.ramGibSpot) || 0;
            return ramGib > 0 ? totalCost / ramGib : 0;
        });

        const costPerGbSpotFallback = data.items.map(item => {
            const totalCost = parseFloat(item.totalRamCostSpotFallback) || 0;
            const ramGib = parseFloat(item.ramGibSpotFallback) || 0;
            return ramGib > 0 ? totalCost / ramGib : 0;
        });

        // Calculate average cost per GB using unit costs
        const averageCost = data.items.map(item => {
            const totalCost = (parseFloat(item.totalRamCostOnDemand) || 0) + 
                            (parseFloat(item.totalRamCostSpot) || 0) + 
                            (parseFloat(item.totalRamCostSpotFallback) || 0);
            
            const totalRam = (parseFloat(item.ramGibOnDemand) || 0) + 
                           (parseFloat(item.ramGibSpot) || 0) + 
                           (parseFloat(item.ramGibSpotFallback) || 0);
            
            return totalRam > 0 ? totalCost / totalRam : 0;
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
            costPerGbOnDemand,
            costPerGbSpot,
            costPerGbSpotFallback,
            averageCost
        });

        // Create traces for the stacked bar chart
        const traces = [
            {
                name: 'On-Demand',
                x: dates,
                y: costPerGbOnDemand,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(130, 180, 255, 0.7)', width: 2 },
                marker: { color: 'rgba(130, 180, 255, 0.7)', size: 6 },
                hovertemplate: 'On-Demand: $%{y:.5f}<extra></extra>'
            },
            {
                name: 'Spot',
                x: dates,
                y: costPerGbSpot,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(211, 211, 211, 0.7)', width: 2 },
                marker: { color: 'rgba(211, 211, 211, 0.7)', size: 6 },
                hovertemplate: 'Spot: $%{y:.5f}<extra></extra>'
            },
            {
                name: 'Spot Fallback',
                x: dates,
                y: costPerGbSpotFallback,
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
                ...costPerGbOnDemand,
                ...costPerGbSpot,
                ...costPerGbSpotFallback
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
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.onDemand.memory),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(130, 180, 255, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `On-Demand Baseline: $${baselineCosts.onDemand.memory.toFixed(5)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(onDemandBaseline);

                // Spot baseline
                const spotBaseline = {
                    name: 'Spot Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spot.memory),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(211, 211, 211, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Baseline: $${baselineCosts.spot.memory.toFixed(5)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotBaseline);

                // Spot Fallback baseline
                const spotFallbackBaseline = {
                    name: 'Spot Fallback Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baselineCosts.spotFallback.memory),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(250, 217, 131, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Spot Fallback Baseline: $${baselineCosts.spotFallback.memory.toFixed(5)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(spotFallbackBaseline);

                // Calculate and add average baseline
                const averageBaseline = (baselineCosts.onDemand.memory + 
                                       baselineCosts.spot.memory + 
                                       baselineCosts.spotFallback.memory) / 3;
                
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
                    hovertemplate: `Average Baseline: $${averageBaseline.toFixed(5)}<extra></extra>`,
                    showlegend: true
                };
                traces.push(averageBaselineTrace);
            }
        }

        console.log('Final traces array:', traces);

        setPlotData(traces);
        setLayout({
            title: {
                text: 'Cost per GB Memory by Instance Type',
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
                title: 'Cost per GB Memory ($)',
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
                    ...costPerGbOnDemand,
                    ...costPerGbSpot,
                    ...costPerGbSpotFallback
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
        console.log('CostPerGbMemory: No data available');
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

export default CostPerGbMemory; 