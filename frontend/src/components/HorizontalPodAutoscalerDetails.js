import React, {useState, useMemo, useEffect} from 'react';
import {ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, Cpu, Database} from 'lucide-react';
import { generateCSVContent, downloadCSV } from './HorizontalPodAutoscalerCSV.js'; // Import the utilities

// Helper functions to parse HPA metrics
const parseCurrentMetrics = (annotations) => {
    try {
        const metricsStr = annotations?.['autoscaling.alpha.kubernetes.io/current-metrics'];
        return metricsStr ? JSON.parse(metricsStr) : [];
    } catch (error) {
        console.error('Error parsing current metrics:', error);
        return [];
    }
};

const parseTargetMetrics = (annotations) => {
    try {
        const metricsStr = annotations?.['autoscaling.alpha.kubernetes.io/metrics'];
        return metricsStr ? JSON.parse(metricsStr) : [];
    } catch (error) {
        console.error('Error parsing target metrics:', error);
        return [];
    }
};

// Helper function to extract CPU and Memory metrics
const extractMetricsData = (hpa) => {
    const currentMetrics = parseCurrentMetrics(hpa.metadata.annotations);
    const targetMetrics = parseTargetMetrics(hpa.metadata.annotations);
    
    // Initialize metrics object
    const metrics = {
        cpu: { current: null, currentValue: null, target: null },
        memory: { current: null, currentValue: null, target: null }
    };
    
    // Extract current utilization metrics
    currentMetrics.forEach(metric => {
        if (metric.type === 'Resource' && metric.resource) {
            if (metric.resource.name === 'cpu' && metric.resource.currentAverageUtilization) {
                metrics.cpu.current = metric.resource.currentAverageUtilization;
                metrics.cpu.currentValue = metric.resource.currentAverageValue;
            } else if (metric.resource.name === 'memory' && metric.resource.currentAverageUtilization) {
                metrics.memory.current = metric.resource.currentAverageUtilization;
                metrics.memory.currentValue = metric.resource.currentAverageValue;
            }
        }
    });
    
    // Extract target metrics from annotations
    targetMetrics.forEach(metric => {
        if (metric.type === 'Resource' && metric.resource) {
            if (metric.resource.name === 'cpu' && metric.resource.targetAverageUtilization) {
                metrics.cpu.target = metric.resource.targetAverageUtilization;
            } else if (metric.resource.name === 'memory' && metric.resource.targetAverageUtilization) {
                metrics.memory.target = metric.resource.targetAverageUtilization;
            }
        }
    });
    
    // Also check spec for target CPU (in older versions)
    if (hpa.spec.targetCPUUtilizationPercentage && !metrics.cpu.target) {
        metrics.cpu.target = hpa.spec.targetCPUUtilizationPercentage;
    }
    
    return metrics;
};

// Format memory value from m notation
const formatMemoryValue = (memoryValue) => {
    if (!memoryValue) return 'N/A';
    
    // Remove 'm' suffix if present (representing milli-units)
    if (typeof memoryValue === 'string' && memoryValue.endsWith('m')) {
        const numericValue = parseFloat(memoryValue.slice(0, -1)) / 1000;
        
        // Convert to appropriate unit (MB, GB)
        if (numericValue >= 1000000000) {
            return `${(numericValue / 1000000000).toFixed(2)} GB`;
        } else if (numericValue >= 1000000) {
            return `${(numericValue / 1000000).toFixed(2)} MB`;
        } else if (numericValue >= 1000) {
            return `${(numericValue / 1000).toFixed(2)} KB`;
        } else {
            return `${numericValue.toFixed(2)} bytes`;
        }
    }
    
    return memoryValue;
};

const HorizontalPodAutoscalerDetails = ({items = []}) => {
    const [expandedAutoscalers, setExpandedAutoscalers] = useState({});
    const [activeTab, setActiveTab] = useState({});
    const [filters, setFilters] = useState({
        namespace: '',
        search: '',
        atMaxCapacity: false,
        cpuOverThreshold: false,
        memoryOverThreshold: false,
        hasMemoryHPA: false,
        hasCPUHPA: false
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;


    // Extract unique namespaces
    const namespaces = [...new Set(items.map(hpa => hpa.metadata.namespace))].sort();

    // Check if HPA is at max capacity
    const isAtMaxCapacity = (hpa) => {
        const status = hpa.status || {};
        const spec = hpa.spec || {};
        return spec.maxReplicas > 0 && status.currentReplicas === spec.maxReplicas;
    };

    const doesHaveCPUHPA = (hpa) => {
        const metrics = extractMetricsData(hpa);
        return metrics.cpu.current !== null && 
               metrics.cpu.target !== null;
    };

    const doesHaveMemoryHPA = (hpa) => {
        const metrics = extractMetricsData(hpa);
        return metrics.memory.current !== null && 
               metrics.memory.target !== null;
    };


    // Check if CPU utilization is over threshold
    const isCpuOverThreshold = (hpa) => {
        const metrics = extractMetricsData(hpa);
        return metrics.cpu.current !== null && 
               metrics.cpu.target !== null && 
               metrics.cpu.current >= metrics.cpu.target;
    };

    // Check if Memory utilization is over threshold
    const isMemoryOverThreshold = (hpa) => {
        const metrics = extractMetricsData(hpa);
        return metrics.memory.current !== null && 
               metrics.memory.target !== null && 
               metrics.memory.current >= metrics.memory.target;
    };

    // Filter and paginate HPAs
    const filteredAutoscalers = useMemo(() => {
        return items.filter(hpa => {
            const matchNamespace = !filters.namespace || hpa.metadata.namespace === filters.namespace;
            const matchSearch = !filters.search ||
                hpa.metadata.name.toLowerCase().includes(filters.search.toLowerCase());
            
            // New filters
            const matchMaxCapacity = !filters.atMaxCapacity || isAtMaxCapacity(hpa);
            const matchCpuThreshold = !filters.cpuOverThreshold || isCpuOverThreshold(hpa);
            const matchMemoryThreshold = !filters.memoryOverThreshold || isMemoryOverThreshold(hpa);

            const matchCPUHPA = !filters.hasCPUHPA || doesHaveCPUHPA(hpa);
            const matchMemoryHPA = !filters.hasMemoryHPA || doesHaveMemoryHPA(hpa);

            return matchNamespace && matchSearch && matchMaxCapacity && 
                   matchCpuThreshold && matchMemoryThreshold && matchCPUHPA && matchMemoryHPA;
        });
    }, [items, filters]);

    const handleCSVDownload = () => {
        const csvContent = generateCSVContent(filteredAutoscalers, extractMetricsData, formatMemoryValue);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadCSV(csvContent, `hpa-data-${timestamp}.csv`);
    };


    // Paginate filtered autoscalers
    const paginatedAutoscalers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAutoscalers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAutoscalers, currentPage]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredAutoscalers.length / itemsPerPage);

    // Reset current page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleAutoscaler = (autoscalerIndex) => {
        setExpandedAutoscalers(prev => ({
            ...prev,
            [autoscalerIndex]: !prev[autoscalerIndex]
        }));
    };

    const getActiveTab = (autoscalerIndex) => {
        return activeTab[autoscalerIndex] || 'details';
    };

    const tabs = [
        {id: 'details', label: 'Details'},
        {id: 'spec', label: 'Spec'},
        {id: 'status', label: 'Status'},
        {id: 'labels', label: 'Labels'},
        {id: 'annotations', label: 'Annotations'}
    ];

    if (!items?.length) {
        return (
            <div className="bg-white p-4 rounded-lg text-center text-gray-500">
                No horizontal pod autoscalers available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
                {/* Search and Namespace filters row */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
                        <select
                            className="w-full border rounded-md py-2 px-3"
                            value={filters.namespace}
                            onChange={(e) => handleFilterChange('namespace', e.target.value)}
                        >
                            <option value="">All Namespaces</option>
                            {namespaces.map(namespace => (
                                <option key={namespace} value={namespace}>{namespace}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            className="w-full border rounded-md py-2 px-3"
                            placeholder="Search by name..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Status filters row */}
                <div className="flex flex-wrap gap-6">
                    <div className="flex items-center">
                        <input
                            id="atMaxCapacity"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={filters.atMaxCapacity}
                            onChange={(e) => handleFilterChange('atMaxCapacity', e.target.checked)}
                        />
                        <label htmlFor="atMaxCapacity" className="ml-2 text-sm text-gray-700">
                            At Max Capacity
                        </label>
                    </div>
                    
                    <div className="flex items-center">
                        <input
                            id="cpuOverThreshold"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={filters.cpuOverThreshold}
                            onChange={(e) => handleFilterChange('cpuOverThreshold', e.target.checked)}
                        />
                        <label htmlFor="cpuOverThreshold" className="ml-2 text-sm text-gray-700">
                            CPU Over Threshold
                        </label>
                    </div>
                    
                    <div className="flex items-center">
                        <input
                            id="memoryOverThreshold"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={filters.memoryOverThreshold}
                            onChange={(e) => handleFilterChange('memoryOverThreshold', e.target.checked)}
                        />
                        <label htmlFor="memoryOverThreshold" className="ml-2 text-sm text-gray-700">
                            Memory Over Threshold
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="hasMemoryHPA"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={filters.hasMemoryHPA}
                            onChange={(e) => handleFilterChange('hasMemoryHPA', e.target.checked)}
                        />
                        <label htmlFor="hasMemoryHPA" className="ml-2 text-sm text-gray-700">
                            has Memory HPA
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="hasCPUHPA"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={filters.hasCPUHPA}
                            onChange={(e) => handleFilterChange('hasCPUHPA', e.target.checked)}
                        />
                        <label htmlFor="hasCPUHPA" className="ml-2 text-sm text-gray-700">
                            has CPU HPA
                        </label>
                    </div>
                </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">
                Showing {paginatedAutoscalers.length} of {filteredAutoscalers.length} horizontal pod autoscalers
            </div>
            <button
                    onClick={handleCSVDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md 
                              flex items-center transition-colors duration-200 shadow-md hover:shadow-lg"
                    title="Download filtered HPA data as CSV"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export to CSV
                </button>

            {/* HPA List */}
            {paginatedAutoscalers.map((hpa, autoscalerIndex) => (
                <div key={hpa.metadata.uid} className="bg-white rounded-lg shadow">
                    <button
                        onClick={() => toggleAutoscaler(autoscalerIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                        <div className="flex-grow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium">{hpa.metadata.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        Namespace: {hpa.metadata.namespace}
                                    </p>
                                </div>
                                <HPASummary hpa={hpa}/>
                            </div>
                        </div>
                        {expandedAutoscalers[autoscalerIndex] ? (
                            <ChevronDown className="w-5 h-5 ml-4"/>
                        ) : (
                            <ChevronRight className="w-5 h-5 ml-4"/>
                        )}
                    </button>

                    {expandedAutoscalers[autoscalerIndex] && (
                        <div>
                            <div className="border-t border-gray-200">
                                <nav className="flex overflow-x-auto">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(prev => ({...prev, [autoscalerIndex]: tab.id}))}
                                            className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(autoscalerIndex) === tab.id
                                                ? 'border-b-2 border-blue-500 text-blue-600'
                                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                      `}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-6">
                                {getActiveTab(autoscalerIndex) === 'details' && (
                                    <HPADetailsView hpa={hpa} />
                                )}
                                {getActiveTab(autoscalerIndex) === 'spec' && (
                                    <HPASpecDetails spec={hpa.spec}/>
                                )}
                                {getActiveTab(autoscalerIndex) === 'status' && (
                                    <HPAStatusDetails
                                        status={hpa.status}
                                        annotations={hpa.metadata.annotations}
                                    />
                                )}
                                {getActiveTab(autoscalerIndex) === 'labels' && (
                                    <MetadataTable metadata={hpa.metadata.labels} title="Labels"/>
                                )}
                                {getActiveTab(autoscalerIndex) === 'annotations' && (
                                    <MetadataTable metadata={hpa.metadata.annotations} title="Annotations"/>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Show message if no HPA matches the filters */}
            {filteredAutoscalers.length === 0 && (
                <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                    No horizontal pod autoscalers match the selected filters
                </div>
            )}

            {/* Pagination Controls */}
            {filteredAutoscalers.length > 0 && (
                <div className="flex justify-center items-center space-x-4 mt-4">
                    <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5"/>
                    </button>
                    <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
                    <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded disabled:opacity-50"
                    >
                        <ChevronRightIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}
        </div>
    );
};

// New comprehensive HPA summary component for the list view
const HPASummary = ({hpa}) => {
    const status = hpa.status || {};
    const spec = hpa.spec || {};
    const metrics = extractMetricsData(hpa);
    
    // Determine if at max capacity
    const isAtMaxCapacity = spec.maxReplicas > 0 && status.currentReplicas === spec.maxReplicas;
    
    // Determine if CPU/Memory are over threshold
    const isCpuOverThreshold = metrics.cpu.current !== null && 
                               metrics.cpu.target !== null && 
                               metrics.cpu.current >= metrics.cpu.target;
    
    const isMemoryOverThreshold = metrics.memory.current !== null && 
                                  metrics.memory.target !== null && 
                                  metrics.memory.current >= metrics.memory.target;
    
    // Icons
    const AlertIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
    );
    
    const getStatusColor = () => {
        if (isAtMaxCapacity) {
            return 'text-red-600 bg-red-50';
        }
        if (status.currentReplicas === status.desiredReplicas) {
            return 'text-green-600 bg-green-50';
        }
        return 'text-yellow-600 bg-yellow-50';
    };
    
    const getUtilizationColor = (current, target) => {
        if (current === null || target === null) return 'text-gray-600 bg-gray-50';
        if (current >= target) return 'text-red-600 bg-red-50';
        if (current >= target * 0.8) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    return (
        <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center">
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                    {status.currentReplicas || 0} / {spec.minReplicas || 1} - {spec.maxReplicas} Replicas
                </span>
                
                {isAtMaxCapacity && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50 flex items-center">
                        <AlertIcon />
                        Max Capacity
                    </span>
                )}
            </div>
            
            <div className="flex space-x-2">
                {metrics.cpu.current !== null && (
                    <div className="flex items-center">
                        <Cpu className="w-4 h-4 mr-1" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(metrics.cpu.current, metrics.cpu.target)}`}>
                            {isCpuOverThreshold && <AlertIcon />}
                            CPU: {metrics.cpu.current}% / {metrics.cpu.target || 'N/A'}%
                        </span>
                    </div>
                )}
                
                {metrics.memory.current !== null && (
                    <div className="flex items-center">
                        <Database className="w-4 h-4 mr-1" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(metrics.memory.current, metrics.memory.target)}`}>
                            {isMemoryOverThreshold && <AlertIcon />}
                            Memory: {metrics.memory.current}% / {metrics.memory.target || 'N/A'}%
                        </span>
                    </div>
                )}
            </div>
            
            {/* Status badges */}
            {(isAtMaxCapacity || isCpuOverThreshold || isMemoryOverThreshold) && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {isCpuOverThreshold && !isAtMaxCapacity && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50 flex items-center">
                            CPU Over Threshold
                        </span>
                    )}
                    {isMemoryOverThreshold && !isAtMaxCapacity && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50 flex items-center">
                            Memory Over Threshold
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// New comprehensive details view for the expanded section
const HPADetailsView = ({hpa}) => {
    const metadata = hpa.metadata || {};
    const spec = hpa.spec || {};
    const status = hpa.status || {};
    const metrics = extractMetricsData(hpa);
    
    // Determine critical states
    const isAtMaxCapacity = spec.maxReplicas > 0 && status.currentReplicas === spec.maxReplicas;
    const isCpuOverThreshold = metrics.cpu.current !== null && metrics.cpu.target !== null && metrics.cpu.current >= metrics.cpu.target;
    const isMemoryOverThreshold = metrics.memory.current !== null && metrics.memory.target !== null && metrics.memory.current >= metrics.memory.target;
    const hasWarnings = isAtMaxCapacity || isCpuOverThreshold || isMemoryOverThreshold;
    
    // Get utilization percentage relative to target
    const getCpuUtilizationPercentage = () => {
        if (metrics.cpu.current === null || metrics.cpu.target === null) return 0;
        return Math.min(100, (metrics.cpu.current / metrics.cpu.target) * 100);
    };
    
    const getMemoryUtilizationPercentage = () => {
        if (metrics.memory.current === null || metrics.memory.target === null) return 0;
        return Math.min(100, (metrics.memory.current / metrics.memory.target) * 100);
    };
    
    // Get color classes based on utilization level
    const getUtilizationColorClass = (percentage) => {
        if (percentage >= 100) return 'bg-red-600';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-blue-600';
    };
    
    return (
        <div className="space-y-6">
            {/* Alert banner for critical states */}
            {hasWarnings && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Warning: Critical Resource State</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {isAtMaxCapacity && (
                                        <li>This HPA is at maximum capacity ({spec.maxReplicas} replicas)</li>
                                    )}
                                    {isCpuOverThreshold && (
                                        <li>CPU utilization ({metrics.cpu.current}%) exceeds target ({metrics.cpu.target}%)</li>
                                    )}
                                    {isMemoryOverThreshold && (
                                        <li>Memory utilization ({metrics.memory.current}%) exceeds target ({metrics.memory.target}%)</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border">
                <h3 className="text-lg font-medium p-4 border-b">Scaling Configuration</h3>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-1">Current Replicas</h4>
                            <div className={`text-2xl font-bold ${isAtMaxCapacity ? 'text-red-600' : ''}`}>
                                {status.currentReplicas || 0}
                                {isAtMaxCapacity && (
                                    <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-0.5 rounded">Max</span>
                                )}
                            </div>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-1">Min Replicas</h4>
                            <div className="text-2xl font-bold">{spec.minReplicas || 1}</div>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-1">Max Replicas</h4>
                            <div className="text-2xl font-bold">{spec.maxReplicas}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-lg border">
                <h3 className="text-lg font-medium p-4 border-b">Current Resource Utilization</h3>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CPU Metrics */}
                        <div className={`border rounded-lg p-4 ${isCpuOverThreshold ? 'border-red-300 bg-red-50' : ''}`}>
                            <div className="flex items-center mb-2">
                                <Cpu className={`w-5 h-5 mr-2 ${isCpuOverThreshold ? 'text-red-600' : 'text-blue-500'}`} />
                                <h4 className={`text-lg font-semibold ${isCpuOverThreshold ? 'text-red-700' : ''}`}>CPU</h4>
                                {isCpuOverThreshold && (
                                    <span className="ml-auto px-2 py-1 text-xs font-bold rounded-full text-red-800 bg-red-100">Over Threshold</span>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {metrics.cpu.current !== null ? (
                                    <>
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-500">Current Utilization</h5>
                                            <div className={`text-xl font-bold ${isCpuOverThreshold ? 'text-red-700' : ''}`}>
                                                {metrics.cpu.current}%
                                            </div>
                                            <div className="text-sm text-gray-500">({metrics.cpu.currentValue || 'N/A'})</div>
                                        </div>
                                        
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-500">Target Utilization</h5>
                                            <div className="text-xl font-bold">{metrics.cpu.target || 'N/A'}%</div>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        {metrics.cpu.target && (
                                            <div>
                                                <div className="flex justify-between items-center text-xs mb-1">
                                                    <span>0%</span>
                                                    <span>Target: {metrics.cpu.target}%</span>
                                                    <span>100%+</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div 
                                                        className={`${getUtilizationColorClass(getCpuUtilizationPercentage())} h-2.5 rounded-full`} 
                                                        style={{width: `${getCpuUtilizationPercentage()}%`}}></div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-gray-500">No CPU metrics available</div>
                                )}
                            </div>
                        </div>
                        
                        {/* Memory Metrics */}
                        <div className={`border rounded-lg p-4 ${isMemoryOverThreshold ? 'border-red-300 bg-red-50' : ''}`}>
                            <div className="flex items-center mb-2">
                                <Database className={`w-5 h-5 mr-2 ${isMemoryOverThreshold ? 'text-red-600' : 'text-green-500'}`} />
                                <h4 className={`text-lg font-semibold ${isMemoryOverThreshold ? 'text-red-700' : ''}`}>Memory</h4>
                                {isMemoryOverThreshold && (
                                    <span className="ml-auto px-2 py-1 text-xs font-bold rounded-full text-red-800 bg-red-100">Over Threshold</span>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {metrics.memory.current !== null ? (
                                    <>
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-500">Current Utilization</h5>
                                            <div className={`text-xl font-bold ${isMemoryOverThreshold ? 'text-red-700' : ''}`}>
                                                {metrics.memory.current}%
                                            </div>
                                            <div className="text-sm text-gray-500">({formatMemoryValue(metrics.memory.currentValue)})</div>
                                        </div>
                                        
                                        <div>
                                            <h5 className="text-sm font-medium text-gray-500">Target Utilization</h5>
                                            <div className="text-xl font-bold">{metrics.memory.target || 'N/A'}%</div>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        {metrics.memory.target && (
                                            <div>
                                                <div className="flex justify-between items-center text-xs mb-1">
                                                    <span>0%</span>
                                                    <span>Target: {metrics.memory.target}%</span>
                                                    <span>100%+</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div 
                                                        className={`${getUtilizationColorClass(getMemoryUtilizationPercentage())} h-2.5 rounded-full`} 
                                                        style={{width: `${getMemoryUtilizationPercentage()}%`}}></div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-gray-500">No memory metrics available</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {spec.scaleTargetRef && (
                <div className="bg-white rounded-lg border">
                    <h3 className="text-lg font-medium p-4 border-b">Scale Target</h3>
                    <div className="p-4">
                        <table className="w-full text-left">
                            <tbody>
                                <tr className="border-b">
                                    <td className="py-2 px-3 font-medium">Kind</td>
                                    <td className="py-2 px-3">{spec.scaleTargetRef.kind}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-3 font-medium">Name</td>
                                    <td className="py-2 px-3">{spec.scaleTargetRef.name}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 px-3 font-medium">API Version</td>
                                    <td className="py-2 px-3">{spec.scaleTargetRef.apiVersion}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Basic metadata */}
            <div className="bg-white rounded-lg border">
                <h3 className="text-lg font-medium p-4 border-b">Metadata</h3>
                <div className="p-4">
                    <table className="w-full text-left">
                        <tbody>
                            {[
                                {label: 'Name', value: metadata.name},
                                {label: 'Namespace', value: metadata.namespace},
                                {label: 'UID', value: metadata.uid},
                                {label: 'Creation Timestamp', value: metadata.creationTimestamp},
                                {label: 'Last Scale Time', value: status.lastScaleTime}
                            ].map(({label, value}) => value && (
                                <tr key={label} className="border-b">
                                    <td className="py-2 px-3 font-medium">{label}</td>
                                    <td className="py-2 px-3">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const HPASpecDetails = ({spec}) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border">
                <h3 className="text-lg font-medium p-4 border-b">Scaling Configuration</h3>
                <table className="w-full text-left">
                    <tbody>
                    <tr className="border-t">
                        <td className="py-2 px-3 font-medium">Min Replicas</td>
                        <td className="py-2 px-3">{spec.minReplicas || 1}</td>
                    </tr>
                    <tr className="border-t">
                        <td className="py-2 px-3 font-medium">Max Replicas</td>
                        <td className="py-2 px-3">{spec.maxReplicas}</td>
                    </tr>
                    {spec.targetCPUUtilizationPercentage && (
                        <tr className="border-t">
                            <td className="py-2 px-3 font-medium">Target CPU Utilization</td>
                            <td className="py-2 px-3">{spec.targetCPUUtilizationPercentage}%</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* For newer HPA versions with metrics in spec */}
            {spec.metrics && spec.metrics.length > 0 && (
                <div className="bg-white rounded-lg border">
                    <h3 className="text-lg font-medium p-4 border-b">Target Metrics</h3>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-2 px-3 font-medium">Type</th>
                                <th className="py-2 px-3 font-medium">Resource</th>
                                <th className="py-2 px-3 font-medium">Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spec.metrics.map((metric, index) => {
                                if (metric.type === 'Resource' && metric.resource) {
                                    let targetValue = 'N/A';
                                    
                                    if (metric.resource.targetAverageUtilization) {
                                        targetValue = `${metric.resource.targetAverageUtilization}%`;
                                    } else if (metric.resource.targetAverageValue) {
                                        targetValue = metric.resource.targetAverageValue;
                                        if (metric.resource.name === 'memory') {
                                            targetValue = formatMemoryValue(targetValue);
                                        }
                                    }
                                    
                                    return (
                                        <tr key={index} className="border-t">
                                            <td className="py-2 px-3">{metric.type}</td>
                                            <td className="py-2 px-3 capitalize">{metric.resource.name}</td>
                                            <td className="py-2 px-3">{targetValue}</td>
                                        </tr>
                                    );
                                }
                                
                                // Handle other metric types (Pods, Object, External)
                                return (
                                    <tr key={index} className="border-t">
                                        <td className="py-2 px-3">{metric.type}</td>
                                        <td className="py-2 px-3 break-all" colSpan={2}>
                                            {JSON.stringify(metric, null, 2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {spec.scaleTargetRef && (
                <div className="bg-white rounded-lg border">
                    <h3 className="text-lg font-medium p-4 border-b">Scale Target</h3>
                    <table className="w-full text-left">
                        <tbody>
                        <tr className="border-t">
                            <td className="py-2 px-3 font-medium">Kind</td>
                            <td className="py-2 px-3">{spec.scaleTargetRef.kind}</td>
                        </tr>
                        <tr className="border-t">
                            <td className="py-2 px-3 font-medium">Name</td>
                            <td className="py-2 px-3">{spec.scaleTargetRef.name}</td>
                        </tr>
                        <tr className="border-t">
                            <td className="py-2 px-3 font-medium">API Version</td>
                            <td className="py-2 px-3">{spec.scaleTargetRef.apiVersion}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Behavior section for newer HPAs */}
            {spec.behavior && (
                <div className="bg-white rounded-lg border">
                    <h3 className="text-lg font-medium p-4 border-b">Scaling Behavior</h3>
                    <div className="p-4">
                        {spec.behavior.scaleUp && (
                            <div className="mb-4">
                                <h4 className="font-medium mb-2">Scale Up</h4>
                                <div className="pl-4">
                                    {spec.behavior.scaleUp.stabilizationWindowSeconds && (
                                        <div className="mb-2">
                                            <span className="font-medium">Stabilization Window:</span> {spec.behavior.scaleUp.stabilizationWindowSeconds}s
                                        </div>
                                    )}
                                    {spec.behavior.scaleUp.policies && spec.behavior.scaleUp.policies.length > 0 && (
                                        <div>
                                            <span className="font-medium">Policies:</span>
                                            <ul className="list-disc pl-6">
                                                {spec.behavior.scaleUp.policies.map((policy, idx) => (
                                                    <li key={idx}>
                                                        {policy.type === 'Percent' ? 'Percent' : 'Pods'}: {policy.value} / {policy.periodSeconds}s
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {spec.behavior.scaleDown && (
                            <div>
                                <h4 className="font-medium mb-2">Scale Down</h4>
                                <div className="pl-4">
                                    {spec.behavior.scaleDown.stabilizationWindowSeconds && (
                                        <div className="mb-2">
                                            <span className="font-medium">Stabilization Window:</span> {spec.behavior.scaleDown.stabilizationWindowSeconds}s
                                        </div>
                                    )}
                                    {spec.behavior.scaleDown.policies && spec.behavior.scaleDown.policies.length > 0 && (
                                        <div>
                                            <span className="font-medium">Policies:</span>
                                            <ul className="list-disc pl-6">
                                                {spec.behavior.scaleDown.policies.map((policy, idx) => (
                                                    <li key={idx}>
                                                        {policy.type === 'Percent' ? 'Percent' : 'Pods'}: {policy.value} / {policy.periodSeconds}s
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const HPAStatusDetails = ({ status, annotations }) => {
  // Parse conditions from annotations
  const parseConditions = () => {
    try {
      const conditionsStr = annotations?.['autoscaling.alpha.kubernetes.io/conditions'];
      return conditionsStr ? JSON.parse(conditionsStr) : [];
    } catch (error) {
      console.error('Error parsing conditions:', error);
      return [];
    }
  };

  // Use the global helper function for current metrics
  const currentMetrics = parseCurrentMetrics(annotations);
  const targetMetrics = parseTargetMetrics(annotations);
  
  const conditions = parseConditions();

  const details = [
    { label: 'Current Replicas', value: status.currentReplicas },
    { label: 'Desired Replicas', value: status.desiredReplicas },
    { label: 'Last Scale Time', value: status.lastScaleTime }
  ];

  return (
    <div className="space-y-6">
      {/* Replica Details */}
      <div className="bg-white rounded-lg border">
        <h3 className="text-lg font-medium p-4 border-b">Replica Information</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Metric</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {details.map(({ label, value }) => (
              value !== undefined && (
                <tr key={label} className="border-t">
                  <td className="py-2 px-3 font-medium">{label}</td>
                  <td className="py-2 px-3">{value}</td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* Current Metrics */}
      {currentMetrics.length > 0 && (
        <div className="bg-white rounded-lg border">
          <h3 className="text-lg font-medium p-4 border-b">Current Metrics</h3>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 font-medium">Resource</th>
                <th className="py-2 px-3 font-medium">Current Utilization</th>
                <th className="py-2 px-3 font-medium">Current Value</th>
                <th className="py-2 px-3 font-medium">Target Utilization</th>
              </tr>
            </thead>
            <tbody>
              {currentMetrics.map((metric, index) => {
                if (metric.type === 'Resource' && metric.resource) {
                  // Find corresponding target for this resource
                  const targetMetric = targetMetrics.find(
                    t => t.type === 'Resource' && t.resource && t.resource.name === metric.resource.name
                  );
                  
                  const targetUtilization = targetMetric?.resource?.targetAverageUtilization || 
                    (metric.resource.name === 'cpu' ? status.targetCPUUtilizationPercentage : null);
                  
                  // Format current value based on resource type
                  let formattedValue = metric.resource.currentAverageValue;
                  if (metric.resource.name === 'memory' && formattedValue) {
                    formattedValue = formatMemoryValue(formattedValue);
                  }
                  
                  return (
                    <tr key={index} className="border-t">
                      <td className="py-2 px-3 capitalize">{metric.resource.name}</td>
                      <td className="py-2 px-3">
                        {metric.resource.currentAverageUtilization !== undefined 
                          ? `${metric.resource.currentAverageUtilization}%` 
                          : 'N/A'}
                      </td>
                      <td className="py-2 px-3">{formattedValue || 'N/A'}</td>
                      <td className="py-2 px-3">
                        {targetUtilization ? `${targetUtilization}%` : 'N/A'}
                      </td>
                    </tr>
                  );
                }
                
                // Fallback for other metric types
                return (
                  <tr key={index} className="border-t">
                    <td className="py-2 px-3">{metric.type || 'Unknown'}</td>
                    <td className="py-2 px-3 break-all" colSpan={3}>
                      {JSON.stringify(metric, null, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Target Metrics */}
      {targetMetrics.length > 0 && (
        <div className="bg-white rounded-lg border">
          <h3 className="text-lg font-medium p-4 border-b">Target Metrics</h3>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 font-medium">Resource</th>
                <th className="py-2 px-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {targetMetrics.map((metric, index) => {
                if (metric.type === 'Resource' && metric.resource) {
                  return (
                    <tr key={index} className="border-t">
                      <td className="py-2 px-3 capitalize">{metric.resource.name}</td>
                      <td className="py-2 px-3">
                        {metric.resource.targetAverageUtilization !== undefined 
                          ? `${metric.resource.targetAverageUtilization}%` 
                          : (metric.resource.targetAverageValue 
                              ? metric.resource.targetAverageValue 
                              : 'N/A')}
                      </td>
                    </tr>
                  );
                }
                
                // Fallback for other metric types
                return (
                  <tr key={index} className="border-t">
                    <td className="py-2 px-3">{metric.type || 'Unknown'}</td>
                    <td className="py-2 px-3 break-all">
                      {JSON.stringify(metric, null, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Conditions */}
      {conditions.length > 0 && (
        <div className="bg-white rounded-lg border">
          <h3 className="text-lg font-medium p-4 border-b">Conditions</h3>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Reason</th>
                <th className="py-2 px-3 font-medium">Last Transition</th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((condition, index) => (
                <tr key={index} className="border-t">
                  <td className="py-2 px-3">{condition.type}</td>
                  <td className="py-2 px-3">{condition.status}</td>
                  <td className="py-2 px-3">{condition.reason}</td>
                  <td className="py-2 px-3">{condition.lastTransitionTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const MetadataTable = ({ metadata, title }) => {
  const entries = Object.entries(metadata || {}).sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No {title.toLowerCase()} found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Key</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-t">
              <td className="py-2 px-3">{key}</td>
              <td className="py-2 px-3 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HorizontalPodAutoscalerDetails;