import React, {useState, useMemo, useEffect} from 'react';
import {ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon} from 'lucide-react';
import YamlViewer from './YamlViewer';

const POD_MUTATION_NAME_ANNOTATION = "pod-mutations.cast.ai/pod-mutation-name";
const POD_MUTATION_ID_ANNOTATION = "pod-mutations.cast.ai/pod-mutation-id";
const POD_MUTATION_APPLIED_PATCH_ANNOTATION = "pod-mutations.cast.ai/pod-mutation-applied-patch";

const NodeSelectorTable = ({nodeSelector}) => {
    if (!nodeSelector || Object.keys(nodeSelector).length === 0) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500">
                No node selector defined
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
                {Object.entries(nodeSelector).map(([key, value]) => (
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

const OwnerReferencesTable = ({ownerReferences}) => {
    if (!ownerReferences || ownerReferences.length === 0) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500">
                No owner references found
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Kind</th>
                    <th className="py-2 px-3 font-medium">Name</th>
                    <th className="py-2 px-3 font-medium">API Version</th>
                    <th className="py-2 px-3 font-medium">Controller</th>
                </tr>
                </thead>
                <tbody>
                {ownerReferences.map((ref, index) => (
                    <tr key={index} className="border-t">
                        <td className="py-2 px-3">{ref.kind}</td>
                        <td className="py-2 px-3">{ref.name}</td>
                        <td className="py-2 px-3">{ref.apiVersion}</td>
                        <td className="py-2 px-3">{ref.controller ? 'Yes' : 'No'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const SchedulingDetailsTable = ({spec}) => {
    const schedulingDetails = [
        {label: 'Node Name', value: spec.nodeName || 'Not assigned'},
        {label: 'Scheduler Name', value: spec.schedulerName || 'Default'},
        {label: 'Restart Policy', value: spec.restartPolicy || 'Always'},
        {label: 'DNS Policy', value: spec.dnsPolicy || 'ClusterFirst'},
        {label: 'Service Account', value: spec.serviceAccountName || 'Default'}
    ];

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
                {schedulingDetails.map(({label, value}) => (
                    <tr key={label} className="border-t">
                        <td className="py-2 px-3 font-medium">{label}</td>
                        <td className="py-2 px-3 break-all">{value}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const TolerationsTable = ({tolerations}) => {
    if (!tolerations || tolerations.length === 0) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500">
                No tolerations found
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Key</th>
                    <th className="py-2 px-3 font-medium">Operator</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                    <th className="py-2 px-3 font-medium">Effect</th>
                </tr>
                </thead>
                <tbody>
                {tolerations.map((toleration, index) => (
                    <tr key={index} className="border-t">
                        <td className="py-2 px-3">{toleration.key || '<all taints>'}</td>
                        <td className="py-2 px-3">{toleration.operator}</td>
                        <td className="py-2 px-3">{toleration.value || 'N/A'}</td>
                        <td className="py-2 px-3">{toleration.effect}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const PodMetadataTable = ({metadata}) => {
    const metadataEntries = [
        {label: 'Name', value: metadata.name},
        {label: 'Namespace', value: metadata.namespace},
        {label: 'UID', value: metadata.uid},
        {label: 'Resource Version', value: metadata.resourceVersion},
        {label: 'Creation Timestamp', value: metadata.creationTimestamp}
    ];

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
                {metadataEntries.map(({label, value}) => (
                    <tr key={label} className="border-t">
                        <td className="py-2 px-3 font-medium">{label}</td>
                        <td className="py-2 px-3 break-all">{value || 'N/A'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const ContainersTable = ({containers}) => {
    return (
        <div className="space-y-4">
            {containers.map((container, index) => (
                <div key={index} className="bg-white rounded-lg">
                    <div className="p-4 border-b">
                        <h4 className="font-semibold">{container.name}</h4>
                    </div>
                    <table className="w-full text-left">
                        <tbody>
                        <tr className="border-b">
                            <td className="py-2 px-3 font-medium">Image</td>
                            <td className="py-2 px-3 break-all">{container.image}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-3 font-medium">Resources</td>
                            <td className="py-2 px-3">
                                <div>Limits:</div>
                                {Object.entries(container.resources?.limits || {}).map(([key, value]) => (
                                    <div key={key} className="text-sm">{key}: {value}</div>
                                ))}
                                <div className="mt-2">Requests:</div>
                                {Object.entries(container.resources?.requests || {}).map(([key, value]) => (
                                    <div key={key} className="text-sm">{key}: {value}</div>
                                ))}
                            </td>
                        </tr>
                        {container.ports && (
                            <tr className="border-b">
                                <td className="py-2 px-3 font-medium">Ports</td>
                                <td className="py-2 px-3">
                                    {container.ports.map((port, portIndex) => (
                                        <div key={portIndex} className="text-sm">
                                            {port.name}: {port.containerPort} ({port.protocol})
                                        </div>
                                    ))}
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

const VolumesTable = ({volumes}) => {
    return (
        <div className="space-y-4">
            {volumes.map((volume, index) => (
                <div key={index} className="bg-white rounded-lg">
                    <div className="p-4 border-b">
                        <h4 className="font-semibold">{volume.name}</h4>
                    </div>
                    <table className="w-full text-left">
                        <tbody>
                        {Object.entries(volume).map(([key, value]) => (
                            <tr key={key} className="border-b">
                                <td className="py-2 px-3 font-medium">{key}</td>
                                <td className="py-2 px-3 break-all">
                                    {typeof value === 'object'
                                        ? JSON.stringify(value, null, 2)
                                        : value?.toString() || 'N/A'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

const ConditionsTable = ({conditions}) => {
    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Type</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 px-3 font-medium">Last Transition Time</th>
                </tr>
                </thead>
                <tbody>
                {conditions.map((condition, index) => (
                    <tr key={index} className="border-t">
                        <td className="py-2 px-3">{condition.type}</td>
                        <td className="py-2 px-3">{condition.status}</td>
                        <td className="py-2 px-3">{condition.lastTransitionTime}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

const PodMutationTable = ({annotations}) => {
    const name = annotations[POD_MUTATION_NAME_ANNOTATION] || 'N/A';
    const id = annotations[POD_MUTATION_ID_ANNOTATION] || 'N/A';
    const rawPatch = annotations[POD_MUTATION_APPLIED_PATCH_ANNOTATION] || 'N/A';

    let formattedPatch;
    try {
        const parsedPatch = JSON.parse(rawPatch);
        formattedPatch = JSON.stringify(parsedPatch, null, 2);
    } catch {
        formattedPatch = rawPatch;
    }

    return (
        <div className="bg-white rounded-lg">
            <table className="w-full text-left mb-4">
                <thead className="bg-gray-50">
                <tr>
                    <th className="py-2 px-3 font-medium">Field</th>
                    <th className="py-2 px-3 font-medium">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Name</td>
                    <td className="py-2 px-3 break-all">{name}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">ID</td>
                    <td className="py-2 px-3 break-all">{id}</td>
                </tr>
                <tr className="border-t">
                    <td className="py-2 px-3 font-medium">Applied patch</td>
                    <td className="py-2 px-3 break-all">
                        <div className="px-3 pb-3">
                            <pre className="whitespace-pre-wrap text-sm">{formattedPatch}</pre>
                        </div>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

const PodDetails = ({items = []}) => {
    const [expandedPods, setExpandedPods] = useState({});
    const [activeTab, setActiveTab] = useState({});
    const [filters, setFilters] = useState({
        namespace: '',
        status: '',
        search: '',
        nodeSelector: 'any'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const podsPerPage = 100;

    // Extract unique namespaces and statuses
    const namespaces = [...new Set(items.map(pod => pod.metadata.namespace))].sort();
    const statuses = [...new Set(items.map(pod => pod.status.phase))].sort();

    // Check for pod name filter on component mount
    useEffect(() => {
        const filterPodName = localStorage.getItem('filterPodName');
        if (filterPodName) {
            // Set the search filter to the pod name
            setFilters(prev => ({
                ...prev,
                search: filterPodName
            }));
            
            // Find the pod index in the filtered list
            const podIndex = items.findIndex(pod => 
                pod.metadata.name.toLowerCase().includes(filterPodName.toLowerCase())
            );
            
            // If found, expand it
            if (podIndex >= 0) {
                setExpandedPods(prev => ({
                    ...prev,
                    [podIndex]: true
                }));
            }
            
            // Clear the filter from localStorage
            localStorage.removeItem('filterPodName');
        }
    }, [items]);

    // Filter and paginate pods
    const filteredPods = useMemo(() => {
        return items.filter(pod => {
            const matchNamespace = !filters.namespace || pod.metadata.namespace === filters.namespace;
            const matchStatus = !filters.status || pod.status.phase === filters.status;
            const matchSearch = !filters.search ||
                pod.metadata.name.toLowerCase().includes(filters.search.toLowerCase());
            const matchNodeSelector =
                filters.nodeSelector === 'any' ||
                (filters.nodeSelector === 'hasNodeSelector' &&
                    pod.spec.nodeSelector && Object.keys(pod.spec.nodeSelector).length > 0) ||
                (filters.nodeSelector === 'noNodeSelector' &&
                    (!pod.spec.nodeSelector || Object.keys(pod.spec.nodeSelector).length === 0));

            return matchNamespace && matchStatus && matchSearch && matchNodeSelector;
        });
    }, [items, filters]);

    // Paginate filtered pods
    const paginatedPods = useMemo(() => {
        const startIndex = (currentPage - 1) * podsPerPage;
        return filteredPods.slice(startIndex, startIndex + podsPerPage);
    }, [filteredPods, currentPage]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredPods.length / podsPerPage);

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

    const togglePod = (podIndex) => {
        setExpandedPods(prev => ({
            ...prev,
            [podIndex]: !prev[podIndex]
        }));
    };

    const getActiveTab = (podIndex) => {
        return activeTab[podIndex] || 'details';
    };

    const getStatusColor = (phase) => {
        switch (phase?.toLowerCase()) {
            case 'running':
                return 'text-green-600 bg-green-50';
            case 'pending':
                return 'text-yellow-600 bg-yellow-50';
            case 'failed':
                return 'text-red-600 bg-red-50';
            case 'succeeded':
                return 'text-blue-600 bg-blue-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const PodStatusBadge = ({status}) => (
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
      {status || 'Unknown'}
    </span>
    );

    // Base tabs that are shown for all pods
    const baseTabs = [
        {id: 'yaml', label: 'YAML'},
        {id: 'details', label: 'Details'},
        {id: 'containers', label: 'Containers'},
        {id: 'volumes', label: 'Volumes'},
        {id: 'conditions', label: 'Conditions'},
        {id: 'labels', label: 'Labels'},
        {id: 'annotations', label: 'Annotations'},
        {id: 'owner', label: 'Owner References'},
        {id: 'scheduling', label: 'Scheduling'},
        {id: 'tolerations', label: 'Tolerations'},
        {id: 'nodeSelector', label: 'Node Selector'}
    ];

    const hasPodMutation = (pod) => !!pod.metadata.annotations?.[POD_MUTATION_NAME_ANNOTATION];

    // Conditionally include Pod Mutation tab if pod is mutated
    const getTabsForPod = (pod) => {
        return hasPodMutation(pod)
            ? [...baseTabs, {id: 'mutation', label: 'Pod Mutation'}]
            : baseTabs;
    };

    if (!items?.length) {
        return (
            <div className="bg-white p-4 rounded-lg text-center text-gray-500">
                No pod details available
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow flex gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        className="w-full border rounded-md py-2 px-3"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        className="w-full border rounded-md py-2 px-3"
                        placeholder="Search by pod name..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Node Selector</label>
                    <select
                        className="w-full border rounded-md py-2 px-3"
                        value={filters.nodeSelector}
                        onChange={(e) => handleFilterChange('nodeSelector', e.target.value)}
                    >
                        <option value="any">Any</option>
                        <option value="hasNodeSelector">Has Node Selector</option>
                        <option value="noNodeSelector">No Node Selector</option>
                    </select>
                </div>
            </div>

            <div className="text-sm text-gray-500 mb-2">
                Showing {paginatedPods.length} of {filteredPods.length} pods
            </div>

            {paginatedPods.map((pod, podIndex) => (
                <div key={pod.metadata.uid} className="bg-white rounded-lg shadow">
                    <button
                        onClick={() => togglePod(podIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                        <div className="w-full flex items-center">
                            <div className="flex-grow">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-lg font-medium">{pod.metadata.name}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Namespace: {pod.metadata.namespace}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {hasPodMutation(pod) && (
                                    <span className="text-purple-800 bg-blue-50 px-2 py-1 rounded-full text-sm font-medium">
                                        Pod Mutation: {pod.metadata.annotations[POD_MUTATION_NAME_ANNOTATION]}
                                    </span>
                                )}
                                <PodStatusBadge status={pod.status.phase}/>
                            </div>

                        </div>
                        {expandedPods[podIndex] ? (
                            <ChevronDown className="w-5 h-5"/>
                        ) : (
                            <ChevronRight className="w-5 h-5"/>
                        )}
                    </button>

                    {expandedPods[podIndex] && (
                        <div>
                            <div className="border-t border-gray-200">
                                <nav className="flex overflow-x-auto">
                                    {getTabsForPod(pod).map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(prev => ({...prev, [podIndex]: tab.id}))}
                                            className={`
                                                px-6 py-4 text-sm font-medium whitespace-nowrap
                                                focus:outline-none
                                                ${getActiveTab(podIndex) === tab.id
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
                                {getActiveTab(podIndex) === 'yaml' && (
                                    <YamlViewer data={pod} />
                                )}
                                {getActiveTab(podIndex) === 'details' && (
                                    <PodMetadataTable metadata={pod.metadata}/>
                                )}
                                {getActiveTab(podIndex) === 'containers' && (
                                    <ContainersTable containers={pod.spec.containers}/>
                                )}
                                {getActiveTab(podIndex) === 'volumes' && (
                                    <VolumesTable volumes={pod.spec.volumes}/>
                                )}
                                {getActiveTab(podIndex) === 'conditions' && (
                                    <ConditionsTable conditions={pod.status.conditions}/>
                                )}
                                {getActiveTab(podIndex) === 'labels' && (
                                    <div className="bg-white rounded-lg">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="py-2 px-3 font-medium">Key</th>
                                                <th className="py-2 px-3 font-medium">Value</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {Object.entries(pod.metadata.labels || {}).map(([key, value]) => (
                                                <tr key={key} className="border-t">
                                                    <td className="py-2 px-3">{key}</td>
                                                    <td className="py-2 px-3 break-all">{value}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {getActiveTab(podIndex) === 'annotations' && (
                                    <div className="bg-white rounded-lg">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="py-2 px-3 font-medium">Key</th>
                                                <th className="py-2 px-3 font-medium">Value</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {Object.entries(pod.metadata.annotations || {}).map(([key, value]) => (
                                                <tr key={key} className="border-t">
                                                    <td className="py-2 px-3">{key}</td>
                                                    <td className="py-2 px-3 break-all">
                                                        {value.length > 100 ? `${value.slice(0, 100)}...` : value}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {getActiveTab(podIndex) === 'owner' && (
                                    <OwnerReferencesTable ownerReferences={pod.metadata.ownerReferences}/>
                                )}
                                {getActiveTab(podIndex) === 'scheduling' && (
                                    <SchedulingDetailsTable spec={pod.spec}/>
                                )}
                                {getActiveTab(podIndex) === 'tolerations' && (
                                    <TolerationsTable tolerations={pod.spec.tolerations}/>
                                )}
                                {getActiveTab(podIndex) === 'nodeSelector' && (
                                    <NodeSelectorTable nodeSelector={pod.spec.nodeSelector}/>
                                )}
                                {getActiveTab(podIndex) === 'mutation' && hasPodMutation(pod) && (
                                    <PodMutationTable annotations={pod.metadata.annotations}/>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Pagination Controls */}
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
        </div>);
};

export default PodDetails;