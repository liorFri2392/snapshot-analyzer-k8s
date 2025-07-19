import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const StorageOverprovisioningGraph = ({ data, phase2Date, baseline }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        if (!data || !data.items) {
            return;
        }

        // Process the data
        const dates = data.items.map(item => new Date(item.timestamp));

        // Get storage overprovisioning data
        const overprovisioning = data.items.map(item => {
            const value = parseFloat(item.storageOverprovisioningPercent) || 0;
            return value;
        });

        // Format dates for hover text
        const hoverDates = dates.map(date =>
            date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        );

        // Create traces for the graph
        const traces = [
            {
                name: 'Storage',
                x: dates,
                y: overprovisioning,
                type: 'scatter',
                mode: 'lines+markers',
                line: { color: 'rgba(130, 180, 255, 0.7)', width: 2 },
                marker: { color: 'rgba(130, 180, 255, 0.7)', size: 6 },
                hovertemplate: 'Storage: %{y:.2f}%<extra></extra>'
            }
        ];

        // Add baseline line if available
        if (baseline && phase2Date) {
            const automationDate = new Date(phase2Date);
            const datesAfterAutomation = dates.filter(date => date >= automationDate);

            if (datesAfterAutomation.length > 0) {
                const baselineTrace = {
                    name: 'Storage Baseline',
                    x: datesAfterAutomation,
                    y: Array(datesAfterAutomation.length).fill(baseline.average),
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        color: 'rgba(130, 180, 255, 0.7)',
                        width: 3,
                        dash: 'dash'
                    },
                    hoverinfo: 'text',
                    hovertemplate: `Storage Baseline: %{y:.2f}%<extra></extra>`,
                    showlegend: true
                };
                traces.push(baselineTrace);
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
                text: 'Storage Overprovisioning',
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
                title: 'Storage Overprovisioning (%)',
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

export default StorageOverprovisioningGraph; 