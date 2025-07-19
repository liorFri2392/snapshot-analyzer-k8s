import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const CPUUtilizationGraph = ({ data, phase2Date, baseline }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        if (!data || !data.items) {
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Calculate utilization for each type
        const utilizationOnDemand = data.items.map(item => {
            const used = parseFloat(item.cpuUsedOnDemand) || 0;
            const count = parseFloat(item.cpuCountOnDemand) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        });

        const utilizationSpot = data.items.map(item => {
            const used = parseFloat(item.cpuUsedSpot) || 0;
            const count = parseFloat(item.cpuCountSpot) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        });

        const utilizationSpotFallback = data.items.map(item => {
            const used = parseFloat(item.cpuUsedSpotFallback) || 0;
            const count = parseFloat(item.cpuCountSpotFallback) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        });

        // Calculate average utilization across all types
        const averageUtilization = data.items.map((_, i) => {
            const sum = utilizationOnDemand[i] + utilizationSpot[i] + utilizationSpotFallback[i];
            const count = [utilizationOnDemand[i], utilizationSpot[i], utilizationSpotFallback[i]]
                .filter(value => value > 0).length;
            return count > 0 ? Number((sum / count).toFixed(2)) : 0;
        });

        // Create traces for the graph
        const traces = [
            {
                name: 'On-Demand',
                x: dates,
                y: utilizationOnDemand,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(130, 180, 255, 0.7)', width: 2 },
                marker: { color: 'rgba(130, 180, 255, 0.7)', size: 6 },
                hovertemplate: 'On-Demand: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Spot',
                x: dates,
                y: utilizationSpot,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(211, 211, 211, 0.7)', width: 2 },
                marker: { color: 'rgba(211, 211, 211, 0.7)', size: 6 },
                hovertemplate: 'Spot: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Spot Fallback',
                x: dates,
                y: utilizationSpotFallback,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(250, 217, 131, 0.7)', width: 2 },
                marker: { color: 'rgba(250, 217, 131, 0.7)', size: 6 },
                hovertemplate: 'Spot Fallback: %{y:.2f}%<extra></extra>'
            },
            {
                name: 'Average',
                x: dates,
                y: averageUtilization,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(255, 107, 53, 0.7)', width: 2 },
                marker: { color: 'rgba(255, 107, 53, 0.7)', size: 6 },
                hovertemplate: 'Average: %{y:.2f}%<extra></extra>'
            }
        ];

        // Calculate baselines if phase2Date is available
        if (phase2Date) {
            const automationDate = new Date(phase2Date);
            const preAutomationData = data.items.filter(item => new Date(item.timestamp) < automationDate);
            const postAutomationData = data.items.filter(item => new Date(item.timestamp) >= automationDate);

            // Calculate pre-automation baselines
            const preAutomationOnDemand = preAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedOnDemand) || 0;
                const count = parseFloat(item.cpuCountOnDemand) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            const preAutomationSpot = preAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedSpot) || 0;
                const count = parseFloat(item.cpuCountSpot) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            const preAutomationSpotFallback = preAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedSpotFallback) || 0;
                const count = parseFloat(item.cpuCountSpotFallback) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            // Calculate post-automation baselines
            const postAutomationOnDemand = postAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedOnDemand) || 0;
                const count = parseFloat(item.cpuCountOnDemand) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            const postAutomationSpot = postAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedSpot) || 0;
                const count = parseFloat(item.cpuCountSpot) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            const postAutomationSpotFallback = postAutomationData.map(item => {
                const used = parseFloat(item.cpuUsedSpotFallback) || 0;
                const count = parseFloat(item.cpuCountSpotFallback) || 0;
                return count > 0 ? (used / count) * 100 : 0;
            }).filter(v => v > 0);

            // Calculate averages
            const preBaseline = {
                onDemand: preAutomationOnDemand.length > 0 ? preAutomationOnDemand.reduce((a, b) => a + b, 0) / preAutomationOnDemand.length : 0,
                spot: preAutomationSpot.length > 0 ? preAutomationSpot.reduce((a, b) => a + b, 0) / preAutomationSpot.length : 0,
                spotFallback: preAutomationSpotFallback.length > 0 ? preAutomationSpotFallback.reduce((a, b) => a + b, 0) / preAutomationSpotFallback.length : 0,
                average: preAutomationData.map(item => {
                    const used = parseFloat(item.cpuUsedOnDemand) + parseFloat(item.cpuUsedSpot) + parseFloat(item.cpuUsedSpotFallback);
                    const count = parseFloat(item.cpuCountOnDemand) + parseFloat(item.cpuCountSpot) + parseFloat(item.cpuCountSpotFallback);
                    return count > 0 ? (used / count) * 100 : 0;
                }).filter(v => v > 0).reduce((a, b) => a + b, 0) / preAutomationData.length
            };

            const postBaseline = {
                onDemand: postAutomationOnDemand.length > 0 ? postAutomationOnDemand.reduce((a, b) => a + b, 0) / postAutomationOnDemand.length : 0,
                spot: postAutomationSpot.length > 0 ? postAutomationSpot.reduce((a, b) => a + b, 0) / postAutomationSpot.length : 0,
                spotFallback: postAutomationSpotFallback.length > 0 ? postAutomationSpotFallback.reduce((a, b) => a + b, 0) / postAutomationSpotFallback.length : 0
            };

            // Add baseline lines
            const datesAfterAutomation = dates.filter(date => date >= automationDate);
            if (datesAfterAutomation.length > 0) {
                const baselineTraces = [
                    {
                        name: 'On-Demand Baseline',
                        x: datesAfterAutomation,
                        y: Array(datesAfterAutomation.length).fill(preBaseline.onDemand),
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
                        y: Array(datesAfterAutomation.length).fill(preBaseline.spot),
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
                        y: Array(datesAfterAutomation.length).fill(preBaseline.spotFallback),
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
                        y: Array(datesAfterAutomation.length).fill(preBaseline.average),
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

            // Calculate max utilization for scaling
            const maxUtilization = Math.max(
                ...utilizationOnDemand,
                ...utilizationSpot,
                ...utilizationSpotFallback
            );
            const yAxisMax = Math.max(10, Math.ceil(maxUtilization * 1.1)); // Ensure minimum range of 10% and add 10% padding

            traces.push({
                name: 'Automation Enabled',
                x: [automationDate, automationDate],
                y: [0, yAxisMax],
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

        // Calculate max utilization for scaling
        const maxUtilization = Math.max(
            ...utilizationOnDemand,
            ...utilizationSpot,
            ...utilizationSpotFallback
        );
        const yAxisMax = Math.max(10, Math.ceil(maxUtilization * 1.1)); // Ensure minimum range of 10% and add 10% padding

        setPlotData(traces);
        setLayout({
            title: {
                text: 'CPU Utilization by Instance Type',
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
                title: 'CPU Utilization (%)',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                rangemode: 'tozero',
                range: [0, yAxisMax],
                fixedrange: true
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
                y: yAxisMax,
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

    if (!data || !data.items) {
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

export default CPUUtilizationGraph; 