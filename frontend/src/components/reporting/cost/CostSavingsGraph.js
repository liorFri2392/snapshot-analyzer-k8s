import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from 'date-fns';
import './CostGraph.css';

const CostSavingsGraph = ({ data, phase2Date, baselineCosts }) => {
    const [plotData, setPlotData] = useState([]);
    const [layout, setLayout] = useState({});

    useEffect(() => {
        if (!data || !data.items) {
            return;
        }

        // Get all months in the date range
        const dates = data.items.map(item => new Date(item.timestamp));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        const months = eachMonthOfInterval({ start: startDate, end: endDate });

        // Calculate monthly costs and savings percentages
        const monthlyData = months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const isCurrentMonth = isSameMonth(month, new Date());
            const currentDate = new Date();
            const daysInCurrentMonth = currentDate.getDate();
            
            // Filter data for this month
            const monthData = data.items.filter(item => {
                const date = new Date(item.timestamp);
                return date >= monthStart && date <= monthEnd;
            });

            // Calculate actual costs
            const actualCosts = monthData.reduce((acc, item) => {
                const onDemandCost = 
                    (parseFloat(item.totalCpuCostOnDemand) || 0) +
                    (parseFloat(item.totalRamCostOnDemand) || 0) +
                    (parseFloat(item.totalGpuCostOnDemand) || 0);
                
                const spotCost = 
                    (parseFloat(item.totalCpuCostSpot) || 0) +
                    (parseFloat(item.totalRamCostSpot) || 0) +
                    (parseFloat(item.totalGpuCostSpot) || 0);
                
                const spotFallbackCost = 
                    (parseFloat(item.totalCpuCostSpotFallback) || 0) +
                    (parseFloat(item.totalRamCostSpotFallback) || 0) +
                    (parseFloat(item.totalGpuCostSpotFallback) || 0);

                return {
                    onDemand: acc.onDemand + onDemandCost,
                    spot: acc.spot + spotCost,
                    spotFallback: acc.spotFallback + spotFallbackCost,
                    total: acc.total + onDemandCost + spotCost + spotFallbackCost
                };
            }, { onDemand: 0, spot: 0, spotFallback: 0, total: 0 });

            // Calculate projected costs if after automation date
            let projectedCost = 0;
            if (phase2Date && baselineCosts) {
                const phase2DateObj = new Date(phase2Date);
                const monthStart = startOfMonth(month);
                const monthEnd = endOfMonth(month);
                
                // Calculate savings for the month containing phase2Date and all months after
                if (phase2DateObj >= monthStart && phase2DateObj <= monthEnd || monthStart > phase2DateObj) {
                    // Calculate total costs for the month
                    const monthCosts = monthData.reduce((acc, item) => {
                        const itemDate = new Date(item.timestamp);
                        
                        // Only include data points from after phase2Date
                        if (itemDate >= phase2DateObj) {
                            const actualCost = 
                                (parseFloat(item.totalCpuCostOnDemand) || 0) +
                                (parseFloat(item.totalRamCostOnDemand) || 0) +
                                (parseFloat(item.totalGpuCostOnDemand) || 0) +
                                (parseFloat(item.totalCpuCostSpot) || 0) +
                                (parseFloat(item.totalRamCostSpot) || 0) +
                                (parseFloat(item.totalGpuCostSpot) || 0) +
                                (parseFloat(item.totalCpuCostSpotFallback) || 0) +
                                (parseFloat(item.totalRamCostSpotFallback) || 0) +
                                (parseFloat(item.totalGpuCostSpotFallback) || 0);

                            const projectedCost = 
                                (parseFloat(item.cpuCountOnDemand) || 0) * baselineCosts.onDemand.cpu +
                                (parseFloat(item.ramGibOnDemand) || 0) * baselineCosts.onDemand.memory +
                                (parseFloat(item.gpuCountOnDemand) || 0) * baselineCosts.onDemand.gpu +
                                (parseFloat(item.cpuCountSpot) || 0) * baselineCosts.spot.cpu +
                                (parseFloat(item.ramGibSpot) || 0) * baselineCosts.spot.memory +
                                (parseFloat(item.gpuCountSpot) || 0) * baselineCosts.spot.gpu +
                                (parseFloat(item.cpuCountSpotFallback) || 0) * baselineCosts.spotFallback.cpu +
                                (parseFloat(item.ramGibSpotFallback) || 0) * baselineCosts.spotFallback.memory +
                                (parseFloat(item.gpuCountSpotFallback) || 0) * baselineCosts.spotFallback.gpu;

                            return {
                                actual: acc.actual + actualCost,
                                projected: acc.projected + projectedCost,
                                days: acc.days + 1
                            };
                        }
                        return acc;
                    }, { actual: 0, projected: 0, days: 0 });

                    // If it's the current month, estimate the full month's costs
                    if (isCurrentMonth && monthCosts.days > 0) {
                        const dailyAverageActual = monthCosts.actual / monthCosts.days;
                        const dailyAverageProjected = monthCosts.projected / monthCosts.days;
                        
                        actualCosts.total = dailyAverageActual * daysInCurrentMonth;
                        projectedCost = dailyAverageProjected * daysInCurrentMonth;
                    } else {
                        actualCosts.total = monthCosts.actual;
                        projectedCost = monthCosts.projected;
                    }
                }
            }

            const savings = projectedCost > 0 ? projectedCost - actualCosts.total : 0;
            const savingsPercentage = projectedCost > 0 ? (savings / projectedCost) * 100 : 0;

            return {
                month,
                savings,
                savingsPercentage,
                actualCosts,
                projectedCost
            };
        });

        // Create traces for savings bars and percentage line
        const traces = [
            {
                name: 'Cost Savings',
                x: monthlyData.map(d => d.month),
                y: monthlyData.map(d => d.savings),
                type: 'bar',
                marker: {
                    color: 'rgba(0, 200, 0, 0.7)'
                },
                yaxis: 'y2',
                hovertemplate: 'Savings: %{y:$,.0f}<extra></extra>'
            },
            {
                name: 'Cost Savings %',
                x: monthlyData.map(d => d.month),
                y: monthlyData.map(d => d.savingsPercentage),
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: 'rgba(255, 69, 0, 0.7)',
                    width: 2
                },
                marker: {
                    color: 'rgba(255, 69, 0, 0.7)',
                    size: 6
                },
                hovertemplate: 'Savings: %{y:.1f}%<extra></extra>'
            }
        ];

        // Create layout
        const layoutConfig = {
            title: {
                text: 'Monthly Cost Savings',
                font: { size: 16 }
            },
            xaxis: {
                title: 'Month',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                tickformat: '%b %Y',
                type: 'date',
                automargin: true
            },
            yaxis: {
                title: 'Savings (%)',
                gridcolor: 'rgba(0, 0, 0, 0.1)',
                zerolinecolor: 'rgba(0, 0, 0, 0.1)',
                rangemode: 'tozero',
                range: [0, null],
                tickformat: '.1f'
            },
            yaxis2: {
                gridcolor: 'rgba(0, 0, 0, 0)',
                zerolinecolor: 'rgba(0, 0, 0, 0)',
                rangemode: 'tozero',
                range: [0, null],
                tickformat: '$,.0f',
                overlaying: 'y',
                side: 'right',
                showticklabels: false,
                showgrid: false,
                showline: false
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

export default CostSavingsGraph; 