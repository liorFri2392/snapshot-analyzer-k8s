import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const MemoryOverprovisioningGraph = ({ data, phase2Date, baseline }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        console.log('MemoryOverprovisioningGraph received data:', data);
        console.log('MemoryOverprovisioningGraph received phase2Date:', phase2Date);
        if (!data || !data.items) {
            console.log('No data or items array available');
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Get overprovisioning data for each type
        const overprovisioningOnDemand = data.items.map(item => {
            const value = parseFloat(item.ramOverprovisioningOnDemandPercent) || 0;
            console.log('On-Demand overprovisioning:', {
                timestamp: item.timestamp,
                rawValue: item.ramOverprovisioningOnDemandPercent,
                parsedValue: value
            });
            return value;
        });

        const overprovisioningSpot = data.items.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotPercent) || 0;
            console.log('Spot overprovisioning:', {
                timestamp: item.timestamp,
                rawValue: item.ramOverprovisioningSpotPercent,
                parsedValue: value
            });
            return value;
        });

        const overprovisioningSpotFallback = data.items.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotFallbackPercent) || 0;
            console.log('Spot Fallback overprovisioning:', {
                timestamp: item.timestamp,
                rawValue: item.ramOverprovisioningSpotFallbackPercent,
                parsedValue: value
            });
            return value;
        });

        // Calculate average overprovisioning across all types
        const averageOverprovisioning = data.items.map((_, i) => {
            const sum = overprovisioningOnDemand[i] + overprovisioningSpot[i] + overprovisioningSpotFallback[i];
            const count = [overprovisioningOnDemand[i], overprovisioningSpot[i], overprovisioningSpotFallback[i]]
                .filter(value => value > 0).length;
            const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;
            console.log('Average calculation:', {
                index: i,
                sum,
                count,
                average
            });
            return average;
        });

        // Format dates for hover text
        const hoverDates = dates.map(date =>
            date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        console.log('Processed overprovisioning data:', {
            dates,
            overprovisioningOnDemand,
            overprovisioningSpot,
            overprovisioningSpotFallback,
            sampleItem: data.items[0]
        });

        // Create traces for the graph
        const traces = [
            {
                name: 'On-Demand',
                x: dates,
                y: overprovisioningOnDemand,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(130, 180, 255, 0.7)', width: 2 },
                marker: { color: 'rgba(130, 180, 255, 0.7)', size: 6 },
                hovertemplate: 'On-Demand: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Spot',
                x: dates,
                y: overprovisioningSpot,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(211, 211, 211, 0.7)', width: 2 },
                marker: { color: 'rgba(211, 211, 211, 0.7)', size: 6 },
                hovertemplate: 'Spot: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Spot Fallback',
                x: dates,
                y: overprovisioningSpotFallback,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(250, 217, 131, 0.7)', width: 2 },
                marker: { color: 'rgba(250, 217, 131, 0.7)', size: 6 },
                hovertemplate: 'Spot Fallback: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Average',
                x: dates,
                y: averageOverprovisioning,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(255, 107, 53, 0.7)', width: 2 },
                marker: { color: 'rgba(255, 107, 53, 0.7)', size: 6 },
                hovertemplate: 'Average: %{y:.2f}%<extra></extra>'
            }
        ];

        // Add baseline lines if available
        if (baseline && phase2Date) {
            const automationDate = new Date(phase2Date);
            const datesAfterAutomation = dates.filter(date => date >= automationDate);

            if (datesAfterAutomation.length > 0) {
                const baselineTraces = [
                    {
                        name: 'On-Demand Baseline',
                        x: datesAfterAutomation,
                        y: Array(datesAfterAutomation.length).fill(baseline.onDemand),
                        type: 'scatter',
                        mode: 'lines',
                        line: {
                            color: 'rgba(130, 180, 255, 0.7)',
                            width: 3,
                            dash: 'dash'
                        },
                        hoverinfo: 'text',
                        hovertemplate: `On-Demand Baseline: %{y:.2f}%<extra></extra>`,
                        showlegend: true
                    },
                    {
                        name: 'Spot Baseline',
                        x: datesAfterAutomation,
                        y: Array(datesAfterAutomation.length).fill(baseline.spot),
                        type: 'scatter',
                        mode: 'lines',
                        line: {
                            color: 'rgba(211, 211, 211, 0.7)',
                            width: 3,
                            dash: 'dash'
                        },
                        hoverinfo: 'text',
                        hovertemplate: `Spot Baseline: %{y:.2f}%<extra></extra>`,
                        showlegend: true
                    },
                    {
                        name: 'Spot Fallback Baseline',
                        x: datesAfterAutomation,
                        y: Array(datesAfterAutomation.length).fill(baseline.spotFallback),
                        type: 'scatter',
                        mode: 'lines',
                        line: {
                            color: 'rgba(250, 217, 131, 0.7)',
                            width: 3,
                            dash: 'dash'
                        },
                        hoverinfo: 'text',
                        hovertemplate: `Spot Fallback Baseline: %{y:.2f}%<extra></extra>`,
                        showlegend: true
                    },
                    {
                        name: 'Average Baseline',
                        x: datesAfterAutomation,
                        y: Array(datesAfterAutomation.length).fill(baseline.average),
                        type: 'scatter',
                        mode: 'lines',
                        line: {
                            color: 'rgba(255, 107, 53, 0.7)',
                            width: 3,
                            dash: 'dash'
                        },
                        hoverinfo: 'text',
                        hovertemplate: `Average Baseline: %{y:.2f}%<extra></extra>`,
                        showlegend: true
                    }
                ];
                traces.push(...baselineTraces);
            }
        }

        // Add Phase 2 enablement line if date is available
        if (phase2Date) {
            const automationDate = new Date(phase2Date);
            automationDate.setHours(0, 0, 0, 0);

            // Use a fixed maximum height for the line
            const maxY = 100; // This will ensure the line extends to the full height

            traces.push({
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
                hoverinfo: 'text',
                hovertemplate: `Automation Enabled: ${automationDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}<extra></extra>`,
                showlegend: true
            });
        }

        setPlotData(traces);
        setLayout({
            title: {
                text: 'Memory Overprovisioning by Instance Type',
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
                title: 'Memory Overprovisioning (%)',
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
                y: 100,
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
    }, [data, phase2Date, baseline]);

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

export default MemoryOverprovisioningGraph; 