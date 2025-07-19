import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock,
    Calendar,
    Activity,
    Server,
    Database,
    Cloud,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Key,
    BarChart2,
    RefreshCw,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Cpu,
    HardDrive,
    MemoryStick,
    Settings,
    Shield,
    Sparkles,
    Users,
    Zap,
    TrendingDown
} from 'lucide-react';
import CPUAdoptionByTypeGraph from './reporting/spot-adoption-rate/CPUAdoptionByTypeGraph';
import TotalCostsGraph from './reporting/cost/TotalCostsGraph';
import MonthlyCostsGraph from './reporting/cost/MonthlyCostsGraph';
import CostSavingsGraph from './reporting/cost/CostSavingsGraph';
import CostSavingsSummary from './reporting/cost/CostSavingsSummary';
import CostPerCpuGraph from './reporting/unit-economy/CostPerCpuGraph';
import CostPerGbMemory from './reporting/unit-economy/CostPerGbMemory';
import CostPerGPUGraph from './reporting/unit-economy/CostPerGPUGraph';
import CpuOverprovisioningGraph from './reporting/efficiency/CpuOverprovisioningGraph';
import MemoryOverprovisioningGraph from './reporting/efficiency/MemoryOverprovisioningGraph';
import StorageOverprovisioningGraph from './reporting/efficiency/StorageOverprovisioningGraph';
import EfficiencySummary from './reporting/efficiency/EfficiencySummary';
import CPUUtilizationGraph from './reporting/efficiency/CPUUtilizationGraph';
import MemoryUtilizationGraph from './reporting/efficiency/MemoryUtilizationGraph';
import SpotAdoptionCards from './reporting/spot-adoption-rate/SpotAdoptionCards';
import UnitEconomySummary from './reporting/unit-economy/UnitEconomySummary';
import './reporting/cost/CostGraph.css';

const formatDate = (dateString) => {
    if (!dateString || dateString === 'Current' || dateString === 'No data') return dateString;
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
};

const InfoCard = ({ title, value, icon: Icon, color, subtitle, startDate, endDate }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {subtitle && (
            <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
        )}
        {value !== 'No data' && (
            <div className="mt-4 space-y-2">
                <div>
                    <div className="text-sm text-gray-500">Start Date</div>
                    <div className="font-medium">{formatDate(startDate)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500">Until</div>
                    <div className="font-medium">{endDate === 'Current' ? 'Now' : formatDate(endDate)}</div>
                </div>
            </div>
        )}
    </div>
);

const ClusterReports = ({ clusterDetails }) => {
    const [clusterInfo, setClusterInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [reportDates, setReportDates] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [costData, setCostData] = useState(null);
    const [efficiencyData, setEfficiencyData] = useState(null);
    const [phase2Date, setPhase2Date] = useState(null);
    const [activeTab, setActiveTab] = useState('costs');
    const [activeEfficiencyTab, setActiveEfficiencyTab] = useState('overprovisioning');

    useEffect(() => {
        const fetchClusterInfo = async () => {
            try {
                if (!clusterDetails) {
                    throw new Error('No cluster selected');
                }

                if (!clusterDetails.apiKey) {
                    setError('API key not set. Please add your API key in the cluster settings.');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:8000/cluster/info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cluster_id: clusterDetails.id,
                        api_key: clusterDetails.apiKey,
                        region: clusterDetails.region || 'US'
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch cluster info');
                }
                const data = await response.json();
                console.log('Cluster info response:', data);
                console.log('Phase 2 date:', data.phase2?.date);
                setClusterInfo(data);
                setPhase2Date(data.phase2?.date);
            } catch (error) {
                console.error('Error fetching cluster info:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchReportDates = async () => {
            try {
                const response = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/report-dates?region=${clusterDetails.region || 'US'}`);
                if (!response.ok) throw new Error('Failed to fetch report dates');
                const data = await response.json();
                setReportDates(data);
            } catch (err) {
                console.error('Error fetching report dates:', err);
            }
        };

        const fetchCostData = async () => {
            try {
                console.log('Fetching initial cost data for cluster:', clusterDetails.id);
                const response = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/cost-data?region=${clusterDetails.region || 'US'}`);
                console.log('Initial cost response status:', response.status);
                const rawResponse = await response.text();
                console.log('Initial raw cost response:', rawResponse);

                if (response.ok) {
                    let costData;
                    try {
                        costData = JSON.parse(rawResponse);
                    } catch (e) {
                        console.error('Failed to parse initial cost data JSON:', e);
                        setCostData(null);
                        return;
                    }
                    console.log('Initial parsed cost data:', costData);
                    if (costData && costData.items && costData.items.length > 0) {
                        setCostData(costData);
                    } else {
                        console.log('Initial cost data is empty or invalid');
                        setCostData(null);
                    }
                } else {
                    console.error('Failed to fetch initial cost data:', rawResponse);
                    setCostData(null);
                }
            } catch (err) {
                console.error('Error fetching initial cost data:', err);
                setCostData(null);
            }
        };

        const fetchEfficiencyData = async () => {
            try {
                console.log('Fetching efficiency data for cluster:', clusterDetails.id);
                const response = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/efficiency-data?region=${clusterDetails.region || 'US'}`);
                console.log('Efficiency response status:', response.status);
                const rawResponse = await response.text();
                console.log('Raw efficiency response:', rawResponse);

                if (response.ok) {
                    let efficiencyData;
                    try {
                        efficiencyData = JSON.parse(rawResponse);
                        console.log('Parsed efficiency data structure:', {
                            hasItems: efficiencyData?.items?.length > 0,
                            firstItem: efficiencyData?.items?.[0],
                            fields: efficiencyData?.items?.[0] ? Object.keys(efficiencyData.items[0]) : []
                        });
                    } catch (e) {
                        console.error('Failed to parse efficiency data JSON:', e);
                        setEfficiencyData(null);
                        return;
                    }
                    if (efficiencyData && efficiencyData.items && efficiencyData.items.length > 0) {
                        setEfficiencyData(efficiencyData);
                    } else {
                        console.log('Efficiency data is empty or invalid');
                        setEfficiencyData(null);
                    }
                } else {
                    console.error('Failed to fetch efficiency data:', rawResponse);
                    setEfficiencyData(null);
                }
            } catch (err) {
                console.error('Error fetching efficiency data:', err);
                setEfficiencyData(null);
            }
        };

        if (clusterDetails?.id) {
            fetchClusterInfo();
            fetchReportDates();
            fetchCostData();
            fetchEfficiencyData();
        }
    }, [clusterDetails]);

    // Calculate baseline costs per resource
    const baselineCostsPerResource = useMemo(() => {
        if (!costData || !phase2Date) return null;

        // Filter data before phase 2 date
        const preAutomationData = costData.items.filter(item => 
            new Date(item.timestamp) < new Date(phase2Date)
        );

        if (preAutomationData.length === 0) return null;

        // Calculate average costs for each resource type
        const onDemand = {
            cpu: preAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostOnDemand) || 0;
                const cpuCount = parseFloat(item.cpuCountOnDemand) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / preAutomationData.length,
            memory: preAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostOnDemand) || 0;
                const ramGib = parseFloat(item.ramGibOnDemand) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / preAutomationData.length,
            gpu: preAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostOnDemand) || 0;
                const gpuCount = parseFloat(item.gpuCountOnDemand) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / preAutomationData.length,
            instance: preAutomationData.reduce((sum, item) => {
                const cost = parseFloat(item.costOnDemand) || 0;
                const count = parseFloat(item.instanceCountOnDemand) || 0;
                return sum + (count > 0 ? cost / count : 0);
            }, 0) / preAutomationData.length
        };

        const spot = {
            cpu: preAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostSpot) || 0;
                const cpuCount = parseFloat(item.cpuCountSpot) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / preAutomationData.length,
            memory: preAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostSpot) || 0;
                const ramGib = parseFloat(item.ramGibSpot) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / preAutomationData.length,
            gpu: preAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostSpot) || 0;
                const gpuCount = parseFloat(item.gpuCountSpot) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / preAutomationData.length,
            instance: preAutomationData.reduce((sum, item) => {
                const cost = parseFloat(item.costSpot) || 0;
                const count = parseFloat(item.instanceCountSpot) || 0;
                return sum + (count > 0 ? cost / count : 0);
            }, 0) / preAutomationData.length
        };

        const spotFallback = {
            cpu: preAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostSpotFallback) || 0;
                const cpuCount = parseFloat(item.cpuCountSpotFallback) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / preAutomationData.length,
            memory: preAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostSpotFallback) || 0;
                const ramGib = parseFloat(item.ramGibSpotFallback) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / preAutomationData.length,
            gpu: preAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostSpotFallback) || 0;
                const gpuCount = parseFloat(item.gpuCountSpotFallback) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / preAutomationData.length,
            instance: preAutomationData.reduce((sum, item) => {
                const cost = parseFloat(item.costSpotFallback) || 0;
                const count = parseFloat(item.instanceCountSpotFallback) || 0;
                return sum + (count > 0 ? cost / count : 0);
            }, 0) / preAutomationData.length
        };

        return { onDemand, spot, spotFallback };
    }, [costData, phase2Date]);

    // Log baseline costs for debugging
    useEffect(() => {
        if (baselineCostsPerResource) {
            console.log('Calculated baseline costs (averages):', {
                onDemand: {
                    cpu: baselineCostsPerResource.onDemand.cpu.toFixed(2),
                    memory: baselineCostsPerResource.onDemand.memory.toFixed(2),
                    gpu: baselineCostsPerResource.onDemand.gpu.toFixed(2),
                    instance: baselineCostsPerResource.onDemand.instance.toFixed(2)
                },
                spot: {
                    cpu: baselineCostsPerResource.spot.cpu.toFixed(2),
                    memory: baselineCostsPerResource.spot.memory.toFixed(2),
                    gpu: baselineCostsPerResource.spot.gpu.toFixed(2),
                    instance: baselineCostsPerResource.spot.instance.toFixed(2)
                },
                spotFallback: {
                    cpu: baselineCostsPerResource.spotFallback.cpu.toFixed(2),
                    memory: baselineCostsPerResource.spotFallback.memory.toFixed(2),
                    gpu: baselineCostsPerResource.spotFallback.gpu.toFixed(2),
                    instance: baselineCostsPerResource.spotFallback.instance.toFixed(2)
                }
            });
        }
    }, [baselineCostsPerResource]);

    // Helper function to calculate average of non-zero values
    const calculateAverage = (values) => {
        const nonZeroValues = values.filter(v => v !== 0 && !isNaN(v));
        if (nonZeroValues.length === 0) return 0;
        return nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length;
    };

    // Calculate baseline overprovisioning values (pre-automation)
    const baselineOverprovisioning = useMemo(() => {
        if (!efficiencyData?.items || !phase2Date) return null;

        // Filter data points before automation
        const preAutomationData = efficiencyData.items.filter(item =>
            new Date(item.timestamp) < new Date(phase2Date)
        );

        if (preAutomationData.length === 0) return null;

        // Calculate averages for the entire pre-automation period
        const cpuOnDemandValues = preAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningOnDemandPercent) || 0;
            return value;
        });

        const cpuSpotValues = preAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningSpotPercent) || 0;
            return value;
        });

        const cpuSpotFallbackValues = preAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningSpotFallbackPercent) || 0;
            return value;
        });

        const ramOnDemandValues = preAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningOnDemandPercent) || 0;
            return value;
        });
        const ramSpotValues = preAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotPercent) || 0;
            return value;
        });
        const ramSpotFallbackValues = preAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotFallbackPercent) || 0;
            return value;
        });
        
        const storageValues = preAutomationData.map(item => {
            const value = parseFloat(item.storageOverprovisioningPercent) || 0;
            return value;
        });

        return {
            cpu: {
                onDemand: calculateAverage(cpuOnDemandValues),
                spot: calculateAverage(cpuSpotValues),
                spotFallback: calculateAverage(cpuSpotFallbackValues),
                average: calculateAverage([
                    ...cpuOnDemandValues,
                    ...cpuSpotValues,
                    ...cpuSpotFallbackValues
                ])
            },
            memory: {
                onDemand: calculateAverage(ramOnDemandValues),
                spot: calculateAverage(ramSpotValues),
                spotFallback: calculateAverage(ramSpotFallbackValues),
                average: calculateAverage([
                    ...ramOnDemandValues,
                    ...ramSpotValues,
                    ...ramSpotFallbackValues
                ])
            },
            storage: {
                onDemand: calculateAverage(storageValues),
                spot: calculateAverage(storageValues),
                spotFallback: calculateAverage(storageValues),
                average: calculateAverage(storageValues)
            }
        };
    }, [efficiencyData, phase2Date]);

    // Calculate post-automation overprovisioning values
    const postAutomationOverprovisioning = useMemo(() => {
        if (!efficiencyData?.items || !phase2Date) return null;

        // Filter data points after automation
        const postAutomationData = efficiencyData.items.filter(item =>
            new Date(item.timestamp) >= new Date(phase2Date)
        );

        if (postAutomationData.length === 0) return null;

        // Calculate averages for the post-automation period
        const cpuOnDemandValues = postAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningOnDemandPercent) || 0;
            return value;
        });

        const cpuSpotValues = postAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningSpotPercent) || 0;
            return value;
        });

        const cpuSpotFallbackValues = postAutomationData.map(item => {
            const value = parseFloat(item.cpuOverprovisioningSpotFallbackPercent) || 0;
            return value;
        });

        const ramOnDemandValues = postAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningOnDemandPercent) || 0;
            return value;
        });
        const ramSpotValues = postAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotPercent) || 0;
            return value;
        });
        const ramSpotFallbackValues = postAutomationData.map(item => {
            const value = parseFloat(item.ramOverprovisioningSpotFallbackPercent) || 0;
            return value;
        });
        
        const storageValues = postAutomationData.map(item => {
            const value = parseFloat(item.storageOverprovisioningPercent) || 0;
            return value;
        });

        return {
            cpu: {
                onDemand: calculateAverage(cpuOnDemandValues),
                spot: calculateAverage(cpuSpotValues),
                spotFallback: calculateAverage(cpuSpotFallbackValues),
                average: calculateAverage([
                    ...cpuOnDemandValues,
                    ...cpuSpotValues,
                    ...cpuSpotFallbackValues
                ])
            },
            memory: {
                onDemand: calculateAverage(ramOnDemandValues),
                spot: calculateAverage(ramSpotValues),
                spotFallback: calculateAverage(ramSpotFallbackValues),
                average: calculateAverage([
                    ...ramOnDemandValues,
                    ...ramSpotValues,
                    ...ramSpotFallbackValues
                ])
            },
            storage: {
                onDemand: calculateAverage(storageValues),
                spot: calculateAverage(storageValues),
                spotFallback: calculateAverage(storageValues),
                average: calculateAverage(storageValues)
            }
        };
    }, [efficiencyData, phase2Date]);

    // Calculate baseline utilization values (pre-automation)
    const baselineUtilization = useMemo(() => {
        if (!efficiencyData?.items || !phase2Date) return null;

        // Filter data points before automation
        const preAutomationData = efficiencyData.items.filter(item =>
            new Date(item.timestamp) < new Date(phase2Date)
        );

        if (preAutomationData.length === 0) return null;

        // Calculate CPU utilization
        const cpuOnDemandValues = preAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedOnDemand) || 0;
            const count = parseFloat(item.cpuCountOnDemand) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        const cpuSpotValues = preAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedSpot) || 0;
            const count = parseFloat(item.cpuCountSpot) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        const cpuSpotFallbackValues = preAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedSpotFallback) || 0;
            const count = parseFloat(item.cpuCountSpotFallback) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        // Calculate Memory utilization
        const ramOnDemandValues = preAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibOnDemand) || 0;
            const total = parseFloat(item.ramGibOnDemand) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        const ramSpotValues = preAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibSpot) || 0;
            const total = parseFloat(item.ramGibSpot) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        const ramSpotFallbackValues = preAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibSpotFallback) || 0;
            const total = parseFloat(item.ramGibSpotFallback) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        return {
            cpu: {
                onDemand: calculateAverage(cpuOnDemandValues),
                spot: calculateAverage(cpuSpotValues),
                spotFallback: calculateAverage(cpuSpotFallbackValues),
                average: calculateAverage([
                    ...cpuOnDemandValues,
                    ...cpuSpotValues,
                    ...cpuSpotFallbackValues
                ])
            },
            memory: {
                onDemand: calculateAverage(ramOnDemandValues),
                spot: calculateAverage(ramSpotValues),
                spotFallback: calculateAverage(ramSpotFallbackValues),
                average: calculateAverage([
                    ...ramOnDemandValues,
                    ...ramSpotValues,
                    ...ramSpotFallbackValues
                ])
            }
        };
    }, [efficiencyData, phase2Date]);

    // Calculate post-automation utilization values
    const postAutomationUtilization = useMemo(() => {
        if (!efficiencyData?.items || !phase2Date) return null;

        // Filter data points after automation
        const postAutomationData = efficiencyData.items.filter(item =>
            new Date(item.timestamp) >= new Date(phase2Date)
        );

        if (postAutomationData.length === 0) return null;

        // Calculate CPU utilization
        const cpuOnDemandValues = postAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedOnDemand) || 0;
            const count = parseFloat(item.cpuCountOnDemand) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        const cpuSpotValues = postAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedSpot) || 0;
            const count = parseFloat(item.cpuCountSpot) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        const cpuSpotFallbackValues = postAutomationData.map(item => {
            const used = parseFloat(item.cpuUsedSpotFallback) || 0;
            const count = parseFloat(item.cpuCountSpotFallback) || 0;
            return count > 0 ? (used / count) * 100 : 0;
        }).filter(v => v > 0);

        // Calculate Memory utilization
        const ramOnDemandValues = postAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibOnDemand) || 0;
            const total = parseFloat(item.ramGibOnDemand) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        const ramSpotValues = postAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibSpot) || 0;
            const total = parseFloat(item.ramGibSpot) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        const ramSpotFallbackValues = postAutomationData.map(item => {
            const used = parseFloat(item.ramUsedGibSpotFallback) || 0;
            const total = parseFloat(item.ramGibSpotFallback) || 0;
            return total > 0 ? (used / total) * 100 : 0;
        }).filter(v => v > 0);

        return {
            cpu: {
                onDemand: calculateAverage(cpuOnDemandValues),
                spot: calculateAverage(cpuSpotValues),
                spotFallback: calculateAverage(cpuSpotFallbackValues),
                average: calculateAverage([
                    ...cpuOnDemandValues,
                    ...cpuSpotValues,
                    ...cpuSpotFallbackValues
                ])
            },
            memory: {
                onDemand: calculateAverage(ramOnDemandValues),
                spot: calculateAverage(ramSpotValues),
                spotFallback: calculateAverage(ramSpotFallbackValues),
                average: calculateAverage([
                    ...ramOnDemandValues,
                    ...ramSpotValues,
                    ...ramSpotFallbackValues
                ])
            }
        };
    }, [efficiencyData, phase2Date]);

    // Calculate spot adoption rates
    const spotAdoptionRates = useMemo(() => {
        if (!costData?.items || !phase2Date) return null;

        const automationDate = new Date(phase2Date);
        const preAutomationData = costData.items.filter(item => new Date(item.timestamp) < automationDate);
        const postAutomationData = costData.items.filter(item => new Date(item.timestamp) >= automationDate);

        if (preAutomationData.length === 0 || postAutomationData.length === 0) return null;

        // Calculate average spot CPU count and total CPU count for both periods
        const preAutomationSpotCPUs = preAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpot) || 0), 0);
        const preAutomationTotalCPUs = preAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.cpuCountOnDemand) || 0) + (parseFloat(item.cpuCountSpot) || 0) + (parseFloat(item.cpuCountSpotFallback) || 0), 0);

        const postAutomationSpotCPUs = postAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpot) || 0), 0);
        const postAutomationTotalCPUs = postAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.cpuCountOnDemand) || 0) + (parseFloat(item.cpuCountSpot) || 0) + (parseFloat(item.cpuCountSpotFallback) || 0), 0);

        const preAutomationRate = preAutomationTotalCPUs > 0 ? (preAutomationSpotCPUs / preAutomationTotalCPUs) * 100 : 0;
        const postAutomationRate = postAutomationTotalCPUs > 0 ? (postAutomationSpotCPUs / postAutomationTotalCPUs) * 100 : 0;
        const rateChange = postAutomationRate - preAutomationRate;

        return {
            preAutomation: preAutomationRate,
            postAutomation: postAutomationRate,
            change: rateChange
        };
    }, [costData, phase2Date]);

    // Calculate cost per resource for each type
    const costPerResource = useMemo(() => {
        if (!costData?.items) {
            return null;
        }

        return costData.items.map(item => ({
            timestamp: new Date(item.timestamp),
            cpu: {
                onDemand: (parseFloat(item.cpuCountOnDemand) || 0) > 0 
                    ? (parseFloat(item.totalCpuCostOnDemand) || 0) / (parseFloat(item.cpuCountOnDemand) || 0) 
                    : 0,
                spot: (parseFloat(item.cpuCountSpot) || 0) > 0 
                    ? (parseFloat(item.totalCpuCostSpot) || 0) / (parseFloat(item.cpuCountSpot) || 0) 
                    : 0,
                spotFallback: (parseFloat(item.cpuCountSpotFallback) || 0) > 0 
                    ? (parseFloat(item.totalCpuCostSpotFallback) || 0) / (parseFloat(item.cpuCountSpotFallback) || 0) 
                    : 0,
                average: (parseFloat(item.cpuCountOnDemand) || 0) + (parseFloat(item.cpuCountSpot) || 0) + (parseFloat(item.cpuCountSpotFallback) || 0) > 0
                    ? (parseFloat(item.totalCpuCostOnDemand) || 0) + (parseFloat(item.totalCpuCostSpot) || 0) + (parseFloat(item.totalCpuCostSpotFallback) || 0)
                    / ((parseFloat(item.cpuCountOnDemand) || 0) + (parseFloat(item.cpuCountSpot) || 0) + (parseFloat(item.cpuCountSpotFallback) || 0))
                    : 0
            },
            memory: {
                onDemand: (parseFloat(item.ramGibOnDemand) || 0) > 0 
                    ? (parseFloat(item.totalRamCostOnDemand) || 0) / (parseFloat(item.ramGibOnDemand) || 0) 
                    : 0,
                spot: (parseFloat(item.ramGibSpot) || 0) > 0 
                    ? (parseFloat(item.totalRamCostSpot) || 0) / (parseFloat(item.ramGibSpot) || 0) 
                    : 0,
                spotFallback: (parseFloat(item.ramGibSpotFallback) || 0) > 0 
                    ? (parseFloat(item.totalRamCostSpotFallback) || 0) / (parseFloat(item.ramGibSpotFallback) || 0) 
                    : 0,
                average: (parseFloat(item.ramGibOnDemand) || 0) + (parseFloat(item.ramGibSpot) || 0) + (parseFloat(item.ramGibSpotFallback) || 0) > 0
                    ? (parseFloat(item.totalRamCostOnDemand) || 0) + (parseFloat(item.totalRamCostSpot) || 0) + (parseFloat(item.totalRamCostSpotFallback) || 0)
                    / ((parseFloat(item.ramGibOnDemand) || 0) + (parseFloat(item.ramGibSpot) || 0) + (parseFloat(item.ramGibSpotFallback) || 0))
                    : 0
            },
            gpu: {
                onDemand: (parseFloat(item.gpuCountOnDemand) || 0) > 0 
                    ? (parseFloat(item.totalGpuCostOnDemand) || 0) / (parseFloat(item.gpuCountOnDemand) || 0) 
                    : 0,
                spot: (parseFloat(item.gpuCountSpot) || 0) > 0 
                    ? (parseFloat(item.totalGpuCostSpot) || 0) / (parseFloat(item.gpuCountSpot) || 0) 
                    : 0,
                spotFallback: (parseFloat(item.gpuCountSpotFallback) || 0) > 0 
                    ? (parseFloat(item.totalGpuCostSpotFallback) || 0) / (parseFloat(item.gpuCountSpotFallback) || 0) 
                    : 0,
                average: (parseFloat(item.gpuCountOnDemand) || 0) + (parseFloat(item.gpuCountSpot) || 0) + (parseFloat(item.gpuCountSpotFallback) || 0) > 0
                    ? (parseFloat(item.totalGpuCostOnDemand) || 0) + (parseFloat(item.totalGpuCostSpot) || 0) + (parseFloat(item.totalGpuCostSpotFallback) || 0)
                    / ((parseFloat(item.gpuCountOnDemand) || 0) + (parseFloat(item.gpuCountSpot) || 0) + (parseFloat(item.gpuCountSpotFallback) || 0))
                    : 0
            }
        }));
    }, [costData]);

    // Calculate post-automation costs per resource
    const postAutomationCostsPerResource = useMemo(() => {
        if (!costData || !phase2Date) return null;

        // Filter data after phase 2 date
        const postAutomationData = costData.items.filter(item => 
            new Date(item.timestamp) >= new Date(phase2Date)
        );

        if (postAutomationData.length === 0) return null;

        // Calculate average costs for each resource type
        const onDemand = {
            cpu: postAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostOnDemand) || 0;
                const cpuCount = parseFloat(item.cpuCountOnDemand) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / postAutomationData.length,
            memory: postAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostOnDemand) || 0;
                const ramGib = parseFloat(item.ramGibOnDemand) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / postAutomationData.length,
            gpu: postAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostOnDemand) || 0;
                const gpuCount = parseFloat(item.gpuCountOnDemand) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / postAutomationData.length
        };

        const spot = {
            cpu: postAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostSpot) || 0;
                const cpuCount = parseFloat(item.cpuCountSpot) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / postAutomationData.length,
            memory: postAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostSpot) || 0;
                const ramGib = parseFloat(item.ramGibSpot) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / postAutomationData.length,
            gpu: postAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostSpot) || 0;
                const gpuCount = parseFloat(item.gpuCountSpot) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / postAutomationData.length
        };

        const spotFallback = {
            cpu: postAutomationData.reduce((sum, item) => {
                const totalCpuCost = parseFloat(item.totalCpuCostSpotFallback) || 0;
                const cpuCount = parseFloat(item.cpuCountSpotFallback) || 0;
                return sum + (cpuCount > 0 ? totalCpuCost / cpuCount : 0);
            }, 0) / postAutomationData.length,
            memory: postAutomationData.reduce((sum, item) => {
                const totalRamCost = parseFloat(item.totalRamCostSpotFallback) || 0;
                const ramGib = parseFloat(item.ramGibSpotFallback) || 0;
                return sum + (ramGib > 0 ? totalRamCost / ramGib : 0);
            }, 0) / postAutomationData.length,
            gpu: postAutomationData.reduce((sum, item) => {
                const totalGpuCost = parseFloat(item.totalGpuCostSpotFallback) || 0;
                const gpuCount = parseFloat(item.gpuCountSpotFallback) || 0;
                return sum + (gpuCount > 0 ? totalGpuCost / gpuCount : 0);
            }, 0) / postAutomationData.length
        };

        return { onDemand, spot, spotFallback };
    }, [costData, phase2Date]);

    // Calculate average costs for summary
    const averageBaselineCosts = useMemo(() => {
        if (!baselineCostsPerResource) return null;

        // Calculate weighted averages based on resource counts
        const preAutomationData = costData.items.filter(item => 
            new Date(item.timestamp) < new Date(phase2Date)
        );

        const totalCpuCount = preAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.cpuCountOnDemand) || 0) + 
            (parseFloat(item.cpuCountSpot) || 0) + 
            (parseFloat(item.cpuCountSpotFallback) || 0), 0);

        const totalRamGib = preAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.ramGibOnDemand) || 0) + 
            (parseFloat(item.ramGibSpot) || 0) + 
            (parseFloat(item.ramGibSpotFallback) || 0), 0);

        const totalGpuCount = preAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.gpuCountOnDemand) || 0) + 
            (parseFloat(item.gpuCountSpot) || 0) + 
            (parseFloat(item.gpuCountSpotFallback) || 0), 0);

        return {
            cpu: totalCpuCount > 0 ? 
                (baselineCostsPerResource.onDemand.cpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountOnDemand) || 0), 0) +
                baselineCostsPerResource.spot.cpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpot) || 0), 0) +
                baselineCostsPerResource.spotFallback.cpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpotFallback) || 0), 0)) / totalCpuCount : 0,
            memory: totalRamGib > 0 ? 
                (baselineCostsPerResource.onDemand.memory * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibOnDemand) || 0), 0) +
                baselineCostsPerResource.spot.memory * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibSpot) || 0), 0) +
                baselineCostsPerResource.spotFallback.memory * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibSpotFallback) || 0), 0)) / totalRamGib : 0,
            gpu: totalGpuCount > 0 ? 
                (baselineCostsPerResource.onDemand.gpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountOnDemand) || 0), 0) +
                baselineCostsPerResource.spot.gpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountSpot) || 0), 0) +
                baselineCostsPerResource.spotFallback.gpu * preAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountSpotFallback) || 0), 0)) / totalGpuCount : 0
        };
    }, [baselineCostsPerResource, costData, phase2Date]);

    const averagePostAutomationCosts = useMemo(() => {
        if (!postAutomationCostsPerResource) return null;

        // Calculate weighted averages based on resource counts
        const postAutomationData = costData.items.filter(item => 
            new Date(item.timestamp) >= new Date(phase2Date)
        );

        const totalCpuCount = postAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.cpuCountOnDemand) || 0) + 
            (parseFloat(item.cpuCountSpot) || 0) + 
            (parseFloat(item.cpuCountSpotFallback) || 0), 0);

        const totalRamGib = postAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.ramGibOnDemand) || 0) + 
            (parseFloat(item.ramGibSpot) || 0) + 
            (parseFloat(item.ramGibSpotFallback) || 0), 0);

        const totalGpuCount = postAutomationData.reduce((sum, item) => 
            sum + (parseFloat(item.gpuCountOnDemand) || 0) + 
            (parseFloat(item.gpuCountSpot) || 0) + 
            (parseFloat(item.gpuCountSpotFallback) || 0), 0);

        return {
            cpu: totalCpuCount > 0 ? 
                (postAutomationCostsPerResource.onDemand.cpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountOnDemand) || 0), 0) +
                postAutomationCostsPerResource.spot.cpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpot) || 0), 0) +
                postAutomationCostsPerResource.spotFallback.cpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.cpuCountSpotFallback) || 0), 0)) / totalCpuCount : 0,
            memory: totalRamGib > 0 ? 
                (postAutomationCostsPerResource.onDemand.memory * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibOnDemand) || 0), 0) +
                postAutomationCostsPerResource.spot.memory * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibSpot) || 0), 0) +
                postAutomationCostsPerResource.spotFallback.memory * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.ramGibSpotFallback) || 0), 0)) / totalRamGib : 0,
            gpu: totalGpuCount > 0 ? 
                (postAutomationCostsPerResource.onDemand.gpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountOnDemand) || 0), 0) +
                postAutomationCostsPerResource.spot.gpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountSpot) || 0), 0) +
                postAutomationCostsPerResource.spotFallback.gpu * postAutomationData.reduce((sum, item) => sum + (parseFloat(item.gpuCountSpotFallback) || 0), 0)) / totalGpuCount : 0
        };
    }, [postAutomationCostsPerResource, costData, phase2Date]);

    const handleFetchDetails = async () => {
        setIsFetchingDetails(true);
        setFetchError(null);
        try {
            const response = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: clusterDetails.apiKey,
                    region: clusterDetails.region || 'US'
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch cluster data: ${errorText}`);
            }
            // Refresh cluster info and report dates after fetching new data
            const infoResponse = await fetch('http://localhost:8000/cluster/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cluster_id: clusterDetails.id,
                    api_key: clusterDetails.apiKey,
                    region: clusterDetails.region || 'US'
                })
            });
            if (infoResponse.ok) {
                const data = await infoResponse.json();
                setClusterInfo(data);
            }
            // Refresh report dates
            const datesResponse = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/report-dates?region=${clusterDetails.region || 'US'}`);
            if (datesResponse.ok) {
                const datesData = await datesResponse.json();
                setReportDates(datesData);
            }
            // Fetch cost data
            console.log('Fetching cost data for cluster:', clusterDetails.id);
            const costResponse = await fetch(`http://localhost:8000/clusters/${clusterDetails.id}/cost-data?region=${clusterDetails.region || 'US'}`);
            console.log('Cost response status:', costResponse.status);
            const rawResponse = await costResponse.text();
            console.log('Raw cost response:', rawResponse);

            if (costResponse.ok) {
                let costData;
                try {
                    costData = JSON.parse(rawResponse);
                } catch (e) {
                    console.error('Failed to parse cost data JSON:', e);
                    setCostData(null);
                    return;
                }
                console.log('Parsed cost data:', costData);
                if (costData && costData.items && costData.items.length > 0) {
                    setCostData(costData);
                } else {
                    console.log('Cost data is empty or invalid');
                    setCostData(null);
                }
            } else {
                console.error('Failed to fetch cost data:', rawResponse);
                setCostData(null);
            }
        } catch (err) {
            console.error('Error in handleFetchDetails:', err);
            setFetchError(err.message);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'costs':
                return (
                    <div className="space-y-6">
                        <TotalCostsGraph data={costData} phase2Date={phase2Date} />
                        <MonthlyCostsGraph data={costData} phase2Date={phase2Date} />
                        <CostSavingsSummary 
                            data={costData} 
                            phase2Date={clusterInfo?.phase2?.date} 
                            baselineCosts={baselineCostsPerResource} 
                        />
                        <CostSavingsGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                        <CostPerCpuGraph data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                        <CostPerGbMemory data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                        <CostPerGPUGraph data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                    </div>
                );
            case 'spot-adoption-rate':
                return (
                    <div className="space-y-6">
                        <SpotAdoptionCards spotAdoptionRates={spotAdoptionRates} />
                        <div className="bg-white rounded-lg p-6 shadow-sm border mt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Adoption by Type</h3>
                            <div className="cost-analysis-section">
                                <CPUAdoptionByTypeGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                            </div>
                        </div>
                    </div>
                );
            case 'efficiency':
                return (
                    <div className="space-y-6">
                        <EfficiencySummary
                            baselineOverprovisioning={baselineOverprovisioning}
                            postAutomationOverprovisioning={postAutomationOverprovisioning}
                            baselineUtilization={baselineUtilization}
                            postAutomationUtilization={postAutomationUtilization}
                        />
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveEfficiencyTab('overprovisioning')}
                                    className={`${
                                        activeEfficiencyTab === 'overprovisioning'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    Overprovisioning
                                </button>
                                <button
                                    onClick={() => setActiveEfficiencyTab('utilization')}
                                    className={`${
                                        activeEfficiencyTab === 'utilization'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                >
                                    Utilization
                                </button>
                            </nav>
                        </div>

                        {activeEfficiencyTab === 'overprovisioning' ? (
                            <div className="space-y-6">
                                <CpuOverprovisioningGraph 
                                    data={efficiencyData} 
                                    phase2Date={phase2Date} 
                                    baseline={baselineOverprovisioning?.cpu}
                                />
                                <MemoryOverprovisioningGraph 
                                    data={efficiencyData} 
                                    phase2Date={phase2Date} 
                                    baseline={baselineOverprovisioning?.memory}
                                />
                                <StorageOverprovisioningGraph 
                                    data={efficiencyData} 
                                    phase2Date={phase2Date} 
                                    baseline={baselineOverprovisioning?.storage}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <CPUUtilizationGraph 
                                    data={efficiencyData} 
                                    phase2Date={phase2Date}
                                    baseline={baselineUtilization?.cpu}
                                />
                                <MemoryUtilizationGraph 
                                    data={efficiencyData} 
                                    phase2Date={phase2Date}
                                    baseline={baselineUtilization?.memory}
                                />
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            </div>
        );
    }

    if (!clusterInfo) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">No cluster information available</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {fetchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center text-red-700">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {fetchError}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Cluster Reports</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center text-sm text-gray-500">
                        <Cloud className="w-4 h-4 mr-1" />
                        {clusterInfo.region} Region
                    </div>
                    <button
                        onClick={handleFetchDetails}
                        disabled={isFetchingDetails}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                    >
                        {isFetchingDetails ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        {isFetchingDetails ? 'Fetching Data...' : 'Fetch Cluster Data'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-center">
                    <div className="text-lg font-medium text-gray-900">
                        {clusterInfo.is_phase2
                            ? "Cluster is now in Automation Phase"
                            : "Cluster is not in Automation Phase"}
                    </div>
                    {clusterInfo.is_phase2 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-500 ml-2" />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                    title="Monitoring Phase"
                    value={clusterInfo.phase1.data_available.duration}
                    icon={Calendar}
                    color="text-purple-500"
                    subtitle="Initial monitoring period"
                    startDate={clusterInfo.phase1.date}
                    endDate={clusterInfo.phase1.data_available.to}
                />
                <InfoCard
                    title="Automation Phase"
                    value={clusterInfo.phase2.data_available.duration}
                    icon={Activity}
                    color="text-green-500"
                    subtitle="Active automation period"
                    startDate={clusterInfo.phase2.date}
                    endDate={clusterInfo.phase2.data_available.to}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                    title="Cost Data"
                    value={formatDate(reportDates?.cost) || 'No data'}
                    icon={DollarSign}
                    color="text-blue-500"
                    subtitle="Latest cost data available"
                    startDate={formatDate(clusterInfo.phase1.date)}
                    endDate={formatDate(reportDates?.cost)}
                />
                <InfoCard
                    title="Efficiency Data"
                    value={formatDate(reportDates?.efficiency) || 'No data'}
                    icon={TrendingUp}
                    color="text-green-500"
                    subtitle="Latest efficiency data available"
                    startDate={formatDate(clusterInfo.phase1.date)}
                    endDate={formatDate(reportDates?.efficiency)}
                />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('costs')}
                        className={`${
                            activeTab === 'costs'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Costs
                    </button>
                    <button
                        onClick={() => setActiveTab('unit-economy')}
                        className={`${
                            activeTab === 'unit-economy'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Unit Economy
                    </button>
                    <button
                        onClick={() => setActiveTab('efficiency')}
                        className={`${
                            activeTab === 'efficiency'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Efficiency
                    </button>
                    <button
                        onClick={() => setActiveTab('spot-adoption-rate')}
                        className={`${
                            activeTab === 'spot-adoption-rate'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Spot Adoption
                    </button>
                </nav>
            </div>

            {/* Costs Tab */}
            {activeTab === 'costs' && costData && (
                <>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Savings Impact</h3>
                        <CostSavingsSummary 
                            data={costData} 
                            phase2Date={clusterInfo?.phase2?.date} 
                            baselineCosts={baselineCostsPerResource} 
                        />
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Costs by Type</h3>
                        <div className="cost-analysis-section">
                            <TotalCostsGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Costs</h3>
                        <div className="cost-analysis-section">
                            <MonthlyCostsGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Savings Trend</h3>
                        <div className="cost-analysis-section">
                            <CostSavingsGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                        </div>
                    </div>
                </>
            )}

            {/* Unit Economy Tab */}
            {activeTab === 'unit-economy' && costData && (
                <>
                    <UnitEconomySummary 
                        costData={costData}
                        phase2Date={phase2Date}
                    />
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost per CPU Analysis</h3>
                        <div className="cost-analysis-section">
                            <CostPerCpuGraph data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost per GB Memory Analysis</h3>
                        <div className="cost-analysis-section">
                            <CostPerGbMemory data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost per GPU Analysis</h3>
                        <div className="cost-analysis-section">
                            <CostPerGPUGraph data={costData} phase2Date={phase2Date} baselineCosts={baselineCostsPerResource} costPerResource={costPerResource} />
                        </div>
                    </div>
                </>
            )}

            {/* Efficiency Tab */}
            {activeTab === 'efficiency' && renderTabContent()}

            {/* Spot Adoption Rate Tab */}
            {activeTab === 'spot-adoption-rate' && costData && (
                <>
                    <SpotAdoptionCards spotAdoptionRates={spotAdoptionRates} />
                    <div className="bg-white rounded-lg p-6 shadow-sm border mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Adoption by Type</h3>
                        <div className="cost-analysis-section">
                            <CPUAdoptionByTypeGraph data={costData} phase2Date={clusterInfo?.phase2?.date} baselineCosts={baselineCostsPerResource} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClusterReports; 