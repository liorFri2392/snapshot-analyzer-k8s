import React from 'react';
import { TrendingUp, TrendingDown, Cpu, MemoryStick, Server } from 'lucide-react';

const calculateImpact = (baseline, current) => {
    if (!baseline || baseline === 0) return 0;
    return ((baseline - current) / baseline) * 100;
};

const formatCost = (cost) => {
    return `$${cost.toFixed(5)}`;
};

const formatImpact = (impact) => {
    return `${impact > 0 ? '+' : ''}${impact.toFixed(1)}%`;
};

const calculateAverage = (values) => {
    const nonZeroValues = values.filter(v => v !== 0 && !isNaN(v));
    if (nonZeroValues.length === 0) return 0;
    return nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
};

const renderResourceCard = (title, icon, baseline, current, baselineBreakdown, currentBreakdown) => {
    const impact = calculateImpact(baseline, current);
    const isImprovement = impact > 0;

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {icon}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-sm text-gray-500">Before Automation</div>
                    <div className="text-2xl font-semibold">{formatCost(baseline)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">After Automation</div>
                    <div className="text-2xl font-semibold">{formatCost(current)}</div>
                </div>
            </div>
            <div className={`mb-4 flex items-center ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                {isImprovement ? <TrendingDown className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                <span>{Math.abs(impact).toFixed(1)}% {isImprovement ? 'improvement' : 'increase'}</span>
            </div>
            <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">By Instance Type</div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm py-1">
                        <div className="text-gray-500">On-Demand</div>
                        <div className="flex items-center gap-2">
                            <div className="text-gray-700">{formatCost(baselineBreakdown.onDemand)}</div>
                            <div className="flex items-center">
                                {isImprovement ? <TrendingDown className="w-3 h-3 text-green-600" /> : <TrendingUp className="w-3 h-3 text-red-600" />}
                                <span className={`text-xs ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.abs(calculateImpact(baselineBreakdown.onDemand, currentBreakdown.onDemand)).toFixed(1)}%
                                </span>
                            </div>
                            <div className="text-gray-700">{formatCost(currentBreakdown.onDemand)}</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                        <div className="text-gray-500">Spot</div>
                        <div className="flex items-center gap-2">
                            <div className="text-gray-700">{formatCost(baselineBreakdown.spot)}</div>
                            <div className="flex items-center">
                                {isImprovement ? <TrendingDown className="w-3 h-3 text-green-600" /> : <TrendingUp className="w-3 h-3 text-red-600" />}
                                <span className={`text-xs ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.abs(calculateImpact(baselineBreakdown.spot, currentBreakdown.spot)).toFixed(1)}%
                                </span>
                            </div>
                            <div className="text-gray-700">{formatCost(currentBreakdown.spot)}</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                        <div className="text-gray-500">Spot Fallback</div>
                        <div className="flex items-center gap-2">
                            <div className="text-gray-700">{formatCost(baselineBreakdown.spotFallback)}</div>
                            <div className="flex items-center">
                                {isImprovement ? <TrendingDown className="w-3 h-3 text-green-600" /> : <TrendingUp className="w-3 h-3 text-red-600" />}
                                <span className={`text-xs ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.abs(calculateImpact(baselineBreakdown.spotFallback, currentBreakdown.spotFallback)).toFixed(1)}%
                                </span>
                            </div>
                            <div className="text-gray-700">{formatCost(currentBreakdown.spotFallback)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UnitEconomySummary = ({ costData, phase2Date }) => {
    if (!costData?.items || !phase2Date) {
        return null;
    }

    // Split data into pre and post automation periods
    const preAutomationData = costData.items.filter(item => 
        new Date(item.timestamp) < new Date(phase2Date)
    );
    const postAutomationData = costData.items.filter(item => 
        new Date(item.timestamp) >= new Date(phase2Date)
    );

    // Calculate averages for each resource type
    const calculateResourceAverages = (data) => {
        const cpuOnDemand = data.map(item => 
            (parseFloat(item.cpuCountOnDemand) || 0) > 0 
                ? (parseFloat(item.totalCpuCostOnDemand) || 0) / (parseFloat(item.cpuCountOnDemand) || 0) 
                : 0
        );
        const cpuSpot = data.map(item => 
            (parseFloat(item.cpuCountSpot) || 0) > 0 
                ? (parseFloat(item.totalCpuCostSpot) || 0) / (parseFloat(item.cpuCountSpot) || 0) 
                : 0
        );
        const cpuSpotFallback = data.map(item => 
            (parseFloat(item.cpuCountSpotFallback) || 0) > 0 
                ? (parseFloat(item.totalCpuCostSpotFallback) || 0) / (parseFloat(item.cpuCountSpotFallback) || 0) 
                : 0
        );

        const memoryOnDemand = data.map(item => 
            (parseFloat(item.ramGibOnDemand) || 0) > 0 
                ? (parseFloat(item.totalRamCostOnDemand) || 0) / (parseFloat(item.ramGibOnDemand) || 0) 
                : 0
        );
        const memorySpot = data.map(item => 
            (parseFloat(item.ramGibSpot) || 0) > 0 
                ? (parseFloat(item.totalRamCostSpot) || 0) / (parseFloat(item.ramGibSpot) || 0) 
                : 0
        );
        const memorySpotFallback = data.map(item => 
            (parseFloat(item.ramGibSpotFallback) || 0) > 0 
                ? (parseFloat(item.totalRamCostSpotFallback) || 0) / (parseFloat(item.ramGibSpotFallback) || 0) 
                : 0
        );

        const gpuOnDemand = data.map(item => 
            (parseFloat(item.gpuCountOnDemand) || 0) > 0 
                ? (parseFloat(item.totalGpuCostOnDemand) || 0) / (parseFloat(item.gpuCountOnDemand) || 0) 
                : 0
        );
        const gpuSpot = data.map(item => 
            (parseFloat(item.gpuCountSpot) || 0) > 0 
                ? (parseFloat(item.totalGpuCostSpot) || 0) / (parseFloat(item.gpuCountSpot) || 0) 
                : 0
        );
        const gpuSpotFallback = data.map(item => 
            (parseFloat(item.gpuCountSpotFallback) || 0) > 0 
                ? (parseFloat(item.totalGpuCostSpotFallback) || 0) / (parseFloat(item.gpuCountSpotFallback) || 0) 
                : 0
        );

        return {
            cpu: {
                average: calculateAverage([...cpuOnDemand, ...cpuSpot, ...cpuSpotFallback]),
                onDemand: calculateAverage(cpuOnDemand),
                spot: calculateAverage(cpuSpot),
                spotFallback: calculateAverage(cpuSpotFallback)
            },
            memory: {
                average: calculateAverage([...memoryOnDemand, ...memorySpot, ...memorySpotFallback]),
                onDemand: calculateAverage(memoryOnDemand),
                spot: calculateAverage(memorySpot),
                spotFallback: calculateAverage(memorySpotFallback)
            },
            gpu: {
                average: calculateAverage([...gpuOnDemand, ...gpuSpot, ...gpuSpotFallback]),
                onDemand: calculateAverage(gpuOnDemand),
                spot: calculateAverage(gpuSpot),
                spotFallback: calculateAverage(gpuSpotFallback)
            }
        };
    };

    const baselineAverages = calculateResourceAverages(preAutomationData);
    const currentAverages = calculateResourceAverages(postAutomationData);

    const averageCpuCost = (baselineAverages.cpu.onDemand + 
                           baselineAverages.cpu.spot + 
                           baselineAverages.cpu.spotFallback) / 3;
    const averageMemoryCost = (baselineAverages.memory.onDemand + 
                              baselineAverages.memory.spot + 
                              baselineAverages.memory.spotFallback) / 3;
    const averageGpuCost = (baselineAverages.gpu.onDemand + 
                           baselineAverages.gpu.spot + 
                           baselineAverages.gpu.spotFallback) / 3;

    const currentAverageCpuCost = (currentAverages.cpu.onDemand + 
                                  currentAverages.cpu.spot + 
                                  currentAverages.cpu.spotFallback) / 3;
    const currentAverageMemoryCost = (currentAverages.memory.onDemand + 
                                     currentAverages.memory.spot + 
                                     currentAverages.memory.spotFallback) / 3;
    const currentAverageGpuCost = (currentAverages.gpu.onDemand + 
                                  currentAverages.gpu.spot + 
                                  currentAverages.gpu.spotFallback) / 3;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Unit Economy Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderResourceCard(
                    "Cost per CPU",
                    <Cpu className="w-5 h-5 text-gray-500" />,
                    averageCpuCost,
                    currentAverageCpuCost,
                    {
                        onDemand: baselineAverages.cpu.onDemand,
                        spot: baselineAverages.cpu.spot,
                        spotFallback: baselineAverages.cpu.spotFallback
                    },
                    {
                        onDemand: currentAverages.cpu.onDemand,
                        spot: currentAverages.cpu.spot,
                        spotFallback: currentAverages.cpu.spotFallback
                    }
                )}
                {renderResourceCard(
                    "Cost per GB Memory",
                    <MemoryStick className="w-5 h-5 text-gray-500" />,
                    averageMemoryCost,
                    currentAverageMemoryCost,
                    {
                        onDemand: baselineAverages.memory.onDemand,
                        spot: baselineAverages.memory.spot,
                        spotFallback: baselineAverages.memory.spotFallback
                    },
                    {
                        onDemand: currentAverages.memory.onDemand,
                        spot: currentAverages.memory.spot,
                        spotFallback: currentAverages.memory.spotFallback
                    }
                )}
                {renderResourceCard(
                    "Cost per GPU",
                    <Server className="w-5 h-5 text-gray-500" />,
                    averageGpuCost,
                    currentAverageGpuCost,
                    {
                        onDemand: baselineAverages.gpu.onDemand,
                        spot: baselineAverages.gpu.spot,
                        spotFallback: baselineAverages.gpu.spotFallback
                    },
                    {
                        onDemand: currentAverages.gpu.onDemand,
                        spot: currentAverages.gpu.spot,
                        spotFallback: currentAverages.gpu.spotFallback
                    }
                )}
            </div>
        </div>
    );
};

export default UnitEconomySummary; 