import React from 'react';
import { TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, isSameMonth, isAfter } from 'date-fns';

const CostSavingsSummary = ({ data, phase2Date, baselineCosts }) => {
    if (!data || !data.items || !phase2Date || !baselineCosts) {
        return null;
    }

    // Calculate total and average savings
    const postAutomationData = data.items.filter(item => {
        const itemDate = new Date(item.timestamp);
        const phase2DateObj = new Date(phase2Date);
        return itemDate >= phase2DateObj;
    });

    // Group data by month
    const monthlyData = postAutomationData.reduce((acc, item) => {
        const date = new Date(item.timestamp);
        const monthStart = startOfMonth(date);
        const monthKey = monthStart.toISOString();
        const phase2DateObj = new Date(phase2Date);

        if (!acc[monthKey]) {
            acc[monthKey] = {
                month: monthStart,
                actualCost: 0,
                projectedCost: 0,
                daysInMonth: 0,
                isCurrentMonth: isSameMonth(date, new Date()),
                isPhase2Month: isSameMonth(monthStart, phase2DateObj)
            };
        }

        // Only include data points from after phase2Date
        if (date >= phase2DateObj) {
            // Add to actual costs
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

            // Add to projected costs
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

            acc[monthKey].actualCost += actualCost;
            acc[monthKey].projectedCost += projectedCost;
            acc[monthKey].daysInMonth++;
        }

        return acc;
    }, {});

    // Calculate monthly savings and adjust for partial months
    const monthlySavings = Object.values(monthlyData).map(month => {
        const daysInMonth = month.daysInMonth;
        const isCurrentMonth = month.isCurrentMonth;
        const currentDate = new Date();
        const daysInCurrentMonth = currentDate.getDate();
        
        // Calculate savings for the month
        const savings = month.projectedCost - month.actualCost;
        const savingsPercentage = month.projectedCost > 0 ? (savings / month.projectedCost) * 100 : 0;

        // If it's the current month, adjust the costs to estimate the full month
        if (isCurrentMonth && daysInMonth > 0) {
            const dailyAverageActual = month.actualCost / daysInMonth;
            const dailyAverageProjected = month.projectedCost / daysInMonth;
            const estimatedActualCost = dailyAverageActual * daysInCurrentMonth;
            const estimatedProjectedCost = dailyAverageProjected * daysInCurrentMonth;
            
            const estimatedSavings = estimatedProjectedCost - estimatedActualCost;
            const estimatedSavingsPercentage = estimatedProjectedCost > 0 ? (estimatedSavings / estimatedProjectedCost) * 100 : 0;

            return {
                ...month,
                savings: estimatedSavings,
                savingsPercentage: estimatedSavingsPercentage
            };
        }

        return {
            ...month,
            savings,
            savingsPercentage
        };
    });

    // Filter out months with no savings
    const monthsWithSavings = monthlySavings.filter(month => month.savings > 0);
    
    // Calculate total savings (including current month's actual savings)
    const totalSavings = monthsWithSavings.reduce((sum, month) => sum + month.savings, 0);
    
    // Calculate averages - if we only have current month data, use that
    const currentMonthData = monthlySavings.find(month => month.isCurrentMonth);
    const completedMonthsWithSavings = monthlySavings.filter(month => !month.isCurrentMonth && month.savings > 0);
    
    const averageMonthlySavings = completedMonthsWithSavings.length > 0 
        ? completedMonthsWithSavings.reduce((sum, month) => sum + month.savings, 0) / completedMonthsWithSavings.length 
        : currentMonthData?.savings || 0;
    
    const averageSavingsPercentage = completedMonthsWithSavings.length > 0
        ? completedMonthsWithSavings.reduce((sum, month) => sum + month.savingsPercentage, 0) / completedMonthsWithSavings.length
        : currentMonthData?.savingsPercentage || 0;

    // Calculate daily savings
    const dailySavings = postAutomationData.reduce((acc, item) => {
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

        const savings = projectedCost - actualCost;
        return savings > 0 ? [...acc, savings] : acc;
    }, []);

    const averageDailySavings = dailySavings.length > 0 ? dailySavings.reduce((sum, savings) => sum + savings, 0) / dailySavings.length : 0;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value / 100);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Total Savings</p>
                        <p className="text-2xl font-semibold text-green-600">{formatCurrency(totalSavings)}</p>
                    </div>
                    <DollarSign className="w-6 h-6 text-green-500" />
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Average Daily Savings</p>
                        <p className="text-2xl font-semibold text-green-600">{formatCurrency(averageDailySavings)}</p>
                    </div>
                    <Calendar className="w-6 h-6 text-green-500" />
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Average Monthly Savings</p>
                        <p className="text-2xl font-semibold text-green-600">{formatCurrency(averageMonthlySavings)}</p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Average Savings %</p>
                        <p className="text-2xl font-semibold text-green-600">{formatPercentage(averageSavingsPercentage)}</p>
                    </div>
                    <Percent className="w-6 h-6 text-green-500" />
                </div>
            </div>
        </div>
    );
};

export default CostSavingsSummary; 