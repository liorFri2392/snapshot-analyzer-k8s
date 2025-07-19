import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../cost/CostGraph.css';

const CPUAdoptionByTypeGraph = ({ data, phase2Date, baselineCosts }) => {
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

        const cpuOnDemand = data.items.map(item => Number(parseFloat(item.cpuCountOnDemand || 0).toFixed(2)));
        const cpuSpot = data.items.map(item => Number(parseFloat(item.cpuCountSpot || 0).toFixed(2)));
        const cpuSpotFallback = data.items.map(item => Number(parseFloat(item.cpuCountSpotFallback || 0).toFixed(2)));
        
        // Calculate total CPUs for each day
        const totalCPUsPerDay = data.items.map(item => 
            (parseFloat(item.cpuCountOnDemand) || 0) + 
            (parseFloat(item.cpuCountSpot) || 0) + 
            (parseFloat(item.cpuCountSpotFallback) || 0)
        );

        // Create traces for the stacked bar chart
        const traces = [
            {
                name: 'On-Demand CPUs',
                x: dates,
                y: cpuOnDemand,
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
                name: 'Spot CPUs',
                x: dates,
                y: cpuSpot,
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
                name: 'Spot Fallback CPUs',
                x: dates,
                y: cpuSpotFallback,
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
                name: 'Total CPUs',
                x: dates,
                y: totalCPUsPerDay,
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
            const maxY = Math.max(...totalCPUsPerDay) || 1;
            
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

        // Create layout with single y-axis
        const layoutConfig = {
            title: {
                text: 'Adoption by Type',
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
                title: 'Number of CPUs',
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
            config={{
                responsive: true,
                displayModeBar: false,
                displaylogo: false
            }}
            style={{ width: '100%', height: '400px' }}
        />
    );
};

export default CPUAdoptionByTypeGraph; 