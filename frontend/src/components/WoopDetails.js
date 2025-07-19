import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Database, Code, LayoutGrid } from 'lucide-react';

const WoopDetails = ({ items = [] }) => {
    const [expandedItems, setExpandedItems] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('formatted'); // 'formatted' or 'raw'
    const itemsPerPage = 10;

    // Calculate pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const toggleItem = (index) => {
        setExpandedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const formatMemoryValue = (value) => {
        if (!value) return 'N/A';
        if (value.endsWith('Mi')) {
            return `${parseFloat(value) / 1024}Gi`;
        }
        if (value.endsWith('Gi')) {
            return value;
        }
        const valueInGi = parseFloat(value) / (1024 * 1024 * 1024);
        return `${valueInGi.toFixed(2)}Gi`;
    };

    const getStatusColor = (conditions) => {
        if (!conditions || conditions.length === 0) return 'bg-gray-100 text-gray-600';
        
        const healthyCondition = conditions.find(c => c.type === 'Healthy');
        if (!healthyCondition) return 'bg-gray-100 text-gray-600';
        
        return healthyCondition.status === 'True' 
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800';
    };

    const renderFormattedView = (item) => (
        <div className="space-y-4">
            {/* Container Recommendations */}
            {item.spec?.recommendation?.map((rec, recIndex) => (
                <div key={rec.containerName} className="border-b last:border-0 pb-4">
                    <h4 className="font-medium mb-2">
                        {rec.containerName}:
                    </h4>
                    <div className="ml-2 text-gray-600">
                        {/* Requests */}
                        {rec.requests && (
                            <div className="mb-2">
                                <div className="text-sm font-medium text-gray-500 mb-1">Requests:</div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                        <Cpu className="w-4 h-4 mr-2" />
                                        <span className="text-xs text-gray-500 mr-1">CPU:</span>
                                        {rec.requests.cpu || 'N/A'}
                                    </div>
                                    <div className="flex items-center">
                                        <Database className="w-4 h-4 mr-2" />
                                        <span className="text-xs text-gray-500 mr-1">Mem:</span>
                                        {formatMemoryValue(rec.requests.memory)}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Limits */}
                        {rec.limits && (
                            <div>
                                <div className="text-sm font-medium text-gray-500 mb-1">Limits:</div>
                                <div className="flex items-center space-x-4">
                                    {rec.limits.cpu && (
                                        <div className="flex items-center">
                                            <Cpu className="w-4 h-4 mr-2" />
                                            <span className="text-xs text-gray-500 mr-1">CPU:</span>
                                            {rec.limits.cpu}
                                        </div>
                                    )}
                                    {rec.limits.memory && (
                                        <div className="flex items-center">
                                            <Database className="w-4 h-4 mr-2" />
                                            <span className="text-xs text-gray-500 mr-1">Mem:</span>
                                            {formatMemoryValue(rec.limits.memory)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Status Message */}
            {item.status?.conditions?.[0]?.message && (
                <div>
                    <h4 className="font-medium mb-2">Message</h4>
                    <div className="text-gray-600">
                        {item.status.conditions[0].message}
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div>
                <h4 className="font-medium mb-2">Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Created:</span>{' '}
                        {new Date(item.metadata?.creationTimestamp).toLocaleString()}
                    </div>
                    <div>
                        <span className="text-gray-500">Last Transition:</span>{' '}
                        {item.status?.conditions?.[0]?.lastTransitionTime
                            ? new Date(item.status.conditions[0].lastTransitionTime).toLocaleString()
                            : 'N/A'}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRawView = (item) => (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(item, null, 2)}
        </pre>
    );

    if (!items || items.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                No WOOP data available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {paginatedItems.map((item, index) => (
                <div key={`${item.metadata?.name}-${index}`} className="bg-white rounded-lg shadow">
                    <div
                        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleItem(index)}
                    >
                        <div className="space-y-1">
                            <div className="font-medium">{item.metadata?.name}</div>
                            <div className="text-sm text-gray-500">
                                Namespace: {item.metadata?.namespace}
                            </div>
                            <div className="text-sm text-gray-500">
                                Target: {item.spec?.targetRef?.kind}/{item.spec?.targetRef?.name}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status?.conditions)}`}>
                                {item.status?.conditions?.[0]?.type || 'Unknown'}
                            </div>
                            {expandedItems[index] ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                    </div>

                    {expandedItems[index] && (
                        <div className="border-t p-4">
                            {/* View Mode Tabs */}
                            <div className="flex space-x-4 mb-4 border-b">
                                <button
                                    onClick={() => setViewMode('formatted')}
                                    className={`pb-2 px-1 flex items-center space-x-1 ${
                                        viewMode === 'formatted'
                                            ? 'border-b-2 border-blue-500 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    <span>Formatted</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('raw')}
                                    className={`pb-2 px-1 flex items-center space-x-1 ${
                                        viewMode === 'raw'
                                            ? 'border-b-2 border-blue-500 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Code className="w-4 h-4" />
                                    <span>Raw JSON</span>
                                </button>
                            </div>

                            {/* Content based on view mode */}
                            {viewMode === 'formatted' ? renderFormattedView(item) : renderRawView(item)}
                        </div>
                    )}
                </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4 mt-4">
                    <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default WoopDetails; 