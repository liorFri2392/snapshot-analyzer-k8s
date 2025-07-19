import React, { useState } from 'react';
import { ChevronRight, ChevronDown, LayoutGrid, CheckCircle, Search, Lightbulb, BarChart } from 'lucide-react';

const GroupedResourceMenu = ({ resources, onResourceSelect, selectedResource }) => {
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const formatTypeName = (typeName) => {
        // Special cases
        if (typeName.toLowerCase() === 'resourcesearch') {
            return 'Resource Search';
        }

        if (typeName.toLowerCase() === 'overview') {
            return 'Overview';
        }

        if (typeName.toLowerCase() === 'insights') {
            return 'Insights';
        }

        // Handle known compound words with custom formatting
        const specialCases = {
            'csinodes': 'CSI Nodes',
            'horizontalpodautoscalers': 'Horizontal Pod Autoscalers',
            'poddisruptionbudgets': 'Pod Disruption Budgets',
            'persistentvolumes': 'Persistent Volumes',
            'persistentvolumeclaims': 'Persistent Volume Claims',
            'configmaps': 'Config Maps',
            'daemonsets': 'Daemon Sets',
            'replicasets': 'Replica Sets',
            'statefulsets': 'Stateful Sets',
            'replicationcontrollers': 'Replication Controllers',
            'networkpolicies': 'Network Policies',
            'clusterroles': 'Cluster Roles',
            'clusterrolebindings': 'Cluster Role Bindings',
            'rolebindings': 'Role Bindings',
            'storageclasses': 'Storage Classes',
            'podmetrics': 'Pod Metrics',
            'woop': 'WOOP'
        };

        // Check if it's a special case
        const normalizedType = typeName.toLowerCase();
        if (specialCases[normalizedType]) {
            return specialCases[normalizedType];
        }

        // Otherwise split by camelCase and capitalize first letter of each word
        return typeName
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(/[^a-zA-Z0-9]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const resourceGroups = {
        'Cluster': ['nodes', 'namespaces', 'events'],
        'Workloads': ['pods', 'deployments', 'statefulsets', 'daemonsets', 'jobs', 'replicasets', 'rollouts'],
        'Autoscaling': ['horizontalpodautoscalers', 'poddisruptionbudgets', 'woop'],
        'Service & Networking': ['services', 'ingresses', 'networkpolicies'],
        'Storage': ['persistentvolumes', 'persistentvolumeclaims', 'storageclasses', 'csinodes'],
        'Configuration': ['configmaps', 'secrets'],
        'Security': ['roles', 'rolebindings', 'clusterroles', 'clusterrolebindings']
    };

    const ResourceItem = ({ type, count }) => {
        const isSelected = selectedResource === type;
        return (
            <div
                className={`pl-4 py-2 cursor-pointer hover:bg-gray-100 rounded text-sm ${isSelected ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect(type)}
            >
                <div className="flex items-center justify-between gap-4">
                    <span className="truncate">{formatTypeName(type)}</span>
                    {count !== undefined && (
                        <span className={`text-xs whitespace-nowrap px-3 py-0.5 rounded-full mr-2 ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {count}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const LoadingSkeleton = () => (
        <div className="space-y-2">
            {/* Overview and Best Practices skeleton */}
            <div className="border rounded-lg p-4 mb-4 bg-white animate-pulse">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
            </div>

            <div className="border rounded-lg p-4 mb-4 bg-white animate-pulse">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
            </div>

            <div className="border rounded-lg p-4 mb-4 bg-white animate-pulse">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
            </div>

            <div className="border rounded-lg p-4 mb-4 bg-white animate-pulse">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
            </div>

            {/* Resource Groups skeleton */}
            {Object.entries(resourceGroups).map(([groupName]) => (
                <div key={groupName} className="border rounded-lg bg-white animate-pulse">
                    <div className="p-4 flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="border-t p-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="pl-4 py-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    // Show loading skeleton when resources is null
    if (!resources) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-2">
            {/* Overview and Best Practices */}
            <div
                className={`border rounded-lg p-4 mb-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center ${!selectedResource ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect('overview')}
            >
                <LayoutGrid className={`w-4 h-4 mr-2 ${!selectedResource ? 'text-blue-500' : ''}`}/>
                <span className="font-medium">Overview</span>
            </div>

            <div
                className={`border rounded-lg p-4 mb-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center ${selectedResource === 'bestpractices' ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect('bestpractices')}
            >
                <CheckCircle className={`w-4 h-4 mr-2 ${selectedResource === 'bestpractices' ? 'text-blue-500' : 'text-blue-500'}`}/>
                <span className="font-medium">Best Practices</span>
            </div>

            <div
                className={`border rounded-lg p-4 mb-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center ${selectedResource === 'insights' ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect('insights')}
            >
                <Lightbulb className={`w-4 h-4 mr-2 ${selectedResource === 'insights' ? 'text-blue-500' : 'text-blue-500'}`}/>
                <span className="font-medium">Insights</span>
            </div>

            <div
                className={`border rounded-lg p-4 mb-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center ${selectedResource === 'clusterreports' ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect('clusterreports')}
            >
                <BarChart className={`w-4 h-4 mr-2 ${selectedResource === 'clusterreports' ? 'text-blue-500' : 'text-blue-500'}`}/>
                <span className="font-medium">Cluster Reports</span>
            </div>

            {/* Resource Search */}
            <div
                className={`border rounded-lg p-4 mb-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center ${selectedResource === 'resourcesearch' ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => onResourceSelect('resourcesearch')}
            >
                <Search className={`w-4 h-4 mr-2 ${selectedResource === 'resourcesearch' ? 'text-blue-500' : ''}`}/>
                <span className="font-medium">Resource Search</span>
            </div>

            {/* Resource Groups */}
            {Object.entries(resourceGroups).map(([groupName, resourceTypes]) => {
                const hasResources = resourceTypes.some(type => resources && type in resources);
                if (!hasResources) return null;

                // Check if any resource in this group is selected
                const hasSelectedResource = resourceTypes.includes(selectedResource);

                return (
                    <div key={groupName} className={`border rounded-lg bg-white ${hasSelectedResource ? 'border-blue-200' : ''}`}>
                        <div
                            className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${hasSelectedResource ? 'bg-blue-50' : ''}`}
                            onClick={() => toggleGroup(groupName)}
                        >
                            <span className={`font-medium ${hasSelectedResource ? 'text-blue-700' : ''}`}>{groupName}</span>
                            {expandedGroups[groupName] ? (
                                <ChevronDown className={`w-4 h-4 ${hasSelectedResource ? 'text-blue-500' : ''}`} />
                            ) : (
                                <ChevronRight className={`w-4 h-4 ${hasSelectedResource ? 'text-blue-500' : ''}`} />
                            )}
                        </div>
                        {expandedGroups[groupName] && (
                            <div className="border-t">
                                {resourceTypes.map(type => {
                                    if (resources && type in resources) {
                                        return (
                                            <ResourceItem
                                                key={type}
                                                type={type}
                                                count={resources[type]}
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default GroupedResourceMenu; 