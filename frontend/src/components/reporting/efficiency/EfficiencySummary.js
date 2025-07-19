import React from 'react';
import { Cpu, MemoryStick, HardDrive, TrendingUp, TrendingDown, Server } from 'lucide-react';

const InstanceTypeBreakdown = ({ preValue, postValue, type, isUtilization = false }) => {
    const change = postValue - preValue;
    const percentageChange = preValue !== 0 ? ((change / preValue) * 100).toFixed(1) : 0;
    const isImprovement = isUtilization ? change > 0 : change < 0;

    return (
        <div className="flex items-center justify-between text-sm py-1">
            <div className="text-gray-500">{type}</div>
            <div className="flex items-center gap-2">
                <div className="text-gray-700">{preValue.toFixed(1)}%</div>
                <div className="flex items-center">
                    {isImprovement ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                    <span className={`text-xs ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(percentageChange)}%
                    </span>
                </div>
                <div className="text-gray-700">{postValue.toFixed(1)}%</div>
            </div>
        </div>
    );
};

const EfficiencySummaryCard = ({ title, preValues, postValues, unit = '%', icon: Icon, isUtilization = false }) => {
    const preAverage = preValues.average;
    const postAverage = postValues.average;
    const change = postAverage - preAverage;
    const percentageChange = preAverage !== 0 ? ((change / preAverage) * 100).toFixed(1) : 0;
    const isImprovement = isUtilization ? change > 0 : change < 0;

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <Icon className="w-5 h-5 text-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-sm text-gray-500">Before Automation</div>
                    <div className="text-2xl font-semibold">{preAverage.toFixed(1)}{unit}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">After Automation</div>
                    <div className="text-2xl font-semibold">{postAverage.toFixed(1)}{unit}</div>
                </div>
            </div>
            <div className={`mb-4 flex items-center ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                {isImprovement ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                <span>{Math.abs(percentageChange)}% {isImprovement ? 'improvement' : 'decrease'}</span>
            </div>
            <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">By Instance Type</div>
                <InstanceTypeBreakdown
                    preValue={preValues.onDemand}
                    postValue={postValues.onDemand}
                    type="On-Demand"
                    isUtilization={isUtilization}
                />
                <InstanceTypeBreakdown
                    preValue={preValues.spot}
                    postValue={postValues.spot}
                    type="Spot"
                    isUtilization={isUtilization}
                />
                <InstanceTypeBreakdown
                    preValue={preValues.spotFallback}
                    postValue={postValues.spotFallback}
                    type="Spot Fallback"
                    isUtilization={isUtilization}
                />
            </div>
        </div>
    );
};

const EfficiencySummary = ({ 
    baselineOverprovisioning, 
    postAutomationOverprovisioning,
    baselineUtilization,
    postAutomationUtilization 
}) => {
    if (!baselineOverprovisioning || !postAutomationOverprovisioning) return null;

    return (
        <div className="space-y-6">
            <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <EfficiencySummaryCard
                        title="CPU Overprovisioning"
                        preValues={baselineOverprovisioning.cpu}
                        postValues={postAutomationOverprovisioning.cpu}
                        icon={Cpu}
                        isUtilization={false}
                    />
                    <EfficiencySummaryCard
                        title="Memory Overprovisioning"
                        preValues={baselineOverprovisioning.memory}
                        postValues={postAutomationOverprovisioning.memory}
                        icon={MemoryStick}
                        isUtilization={false}
                    />
                    <EfficiencySummaryCard
                        title="Storage Overprovisioning"
                        preValues={baselineOverprovisioning.storage}
                        postValues={postAutomationOverprovisioning.storage}
                        icon={HardDrive}
                        isUtilization={false}
                    />
                </div>
            </div>

            {baselineUtilization && postAutomationUtilization && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EfficiencySummaryCard
                            title="CPU Utilization"
                            preValues={baselineUtilization.cpu}
                            postValues={postAutomationUtilization.cpu}
                            icon={Cpu}
                            isUtilization={true}
                        />
                        <EfficiencySummaryCard
                            title="Memory Utilization"
                            preValues={baselineUtilization.memory}
                            postValues={postAutomationUtilization.memory}
                            icon={MemoryStick}
                            isUtilization={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default EfficiencySummary; 