import React, {useState, useEffect, useRef} from 'react';
import {
    Search,
    Check,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    X,
    AlertTriangle,
    FileText
} from 'lucide-react';
import {useSearchContext} from '../context/SearchContext';

// Custom CSS for dynamic tooltips
const tooltipStyles = `
  .tooltip-container {
    position: relative;
  }
  
  .tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    white-space: normal;
  }
  
  /* Default position (above) */
  .tooltip-container .tooltip {
    bottom: 100%;
    margin-bottom: 5px;
  }
  
  /* Tooltip positioned below the element */
  .tooltip-container .tooltip.tooltip-bottom {
    bottom: auto;
    top: 100%;
    margin-bottom: 0;
    margin-top: 5px;
  }
`;

// Smart tooltip component that chooses the best direction
const SmartTooltip = ({children}) => {
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);
    const [isTop, setIsTop] = useState(false);

    // Check position when hovering or when the parent scrolls
    const checkPosition = () => {
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const containerTop = containerRect.top;

            // Find the scrollable parent
            const scrollableParent = document.querySelector('.tooltip-scrollable-container');
            if (scrollableParent) {
                const scrollableRect = scrollableParent.getBoundingClientRect();
                const relativeTop = containerTop - scrollableRect.top;
                setIsTop(relativeTop < 80);
            } else {
                setIsTop(containerTop < 100);
            }
        }
    };

    // Add a scroll event listener when the tooltip is hovered
    useEffect(() => {
        const handleScroll = () => {
            checkPosition();
        };

        const scrollableParent = document.querySelector('.tooltip-scrollable-container');
        if (scrollableParent) {
            scrollableParent.addEventListener('scroll', handleScroll);

            return () => {
                scrollableParent.removeEventListener('scroll', handleScroll);
            };
        }
    }, []);

    return (
        <div
            className="ml-2 text-amber-500 flex items-center group relative tooltip-container"
            ref={containerRef}
            onMouseEnter={checkPosition}
        >
            <AlertTriangle className="w-4 h-4 cursor-help"/>
            <div
                ref={tooltipRef}
                className={`tooltip absolute opacity-0 group-hover:opacity-100 px-2 py-1 bg-gray-900 text-white text-xs rounded w-56 transition-opacity duration-200 pointer-events-none z-50 ${isTop ? 'tooltip-bottom' : ''}`}
            >
                {children}
            </div>
        </div>
    );
};

// Define the search options for YAML components
const YAML_COMPONENTS = [
    {id: 'topologySpreadConstraints', label: 'Topology Spread Constraints'},
    {id: 'resources.requests', label: 'Resource Requests'},
    {id: 'livenessProbe', label: 'Liveness Probes'},
    {id: 'readinessProbe', label: 'Readiness Probes'},
    {id: 'startupProbe', label: 'Startup Probes'},
    {id: 'podAntiAffinity', label: 'Pod Anti-Affinities'},
    {id: 'podAffinity', label: 'Pod Affinities'},
    {id: 'nodeAffinity', label: 'Node Affinities'},
    {id: 'nodeSelector', label: 'Node Selectors'},
    {id: 'tolerations', label: 'Tolerations'},
    {id: 'topologyKeys', label: 'Service Topology Keys', restrictTo: ['services']}
];

// Define resource types that can be searched
const RESOURCE_TYPES = [
    {id: 'pods', label: 'Pods'},
    {id: 'deployments', label: 'Deployments'},
    {id: 'daemonsets', label: 'DaemonSets'},
    {id: 'statefulsets', label: 'StatefulSets'},
    {id: 'jobs', label: 'Jobs'},
    {id: 'cronjobs', label: 'CronJobs'},
    {id: 'replicasets', label: 'ReplicaSets'},
    {id: 'services', label: 'Services'}
];

// Define a direct mapping from kind to resource type ID to ensure accurate matching
// This is a critical mapping that needs to exactly match the resourceType names used in the ClusterExplorer sidebar
const KIND_TO_RESOURCE_TYPE = {
    'deployment': 'deployments',
    'statefulset': 'statefulsets',
    'daemonset': 'daemonsets',
    'pod': 'pods',
    'replicaset': 'replicasets',
    'job': 'jobs',
    'cronjob': 'cronjobs',
    'service': 'services',
    'persistentvolume': 'persistentvolumes',
    'persistentvolumeclaim': 'persistentvolumeclaims',
    'configmap': 'configmaps',
    'secret': 'secrets',
    'ingress': 'ingresses',
    'namespace': 'namespaces',
    'node': 'nodes'
};

const ResourceSearch = ({onResultClick}) => {
    // Get state from context instead of using local state
    const {
        searchMode, setSearchMode,
        selectedComponents, setSelectedComponents,
        selectedResourceTypes, setSelectedResourceTypes,
        searchResults, setSearchResults,
        error, setError,
        expandedResults, setExpandedResults,
        resourceDetails, setResourceDetails,
        reportData, setReportData
    } = useSearchContext();

    // Local-only states that don't need to persist
    const [isSearching, setIsSearching] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState({});
    const [activeFilters, setActiveFilters] = useState({
        requiredPodAntiAffinity: false,
        requiredPodAffinity: false,
        requiredNodeAffinity: false,
        doNotScheduleTopology: false
    });

    // Initialize component state based on context
    useEffect(() => {
        // If we already have search results, we've returned to this component
        // Reset loading states
        if (searchResults) {
            setIsSearching(false);
        }

        if (reportData) {
            setIsGeneratingReport(false);
        }
    }, [searchResults, reportData]);

    // Toggle selection of a component
    const toggleComponent = (componentId) => {
        // Check if this component has restrictions
        const component = YAML_COMPONENTS.find(c => c.id === componentId);

        if (component && component.restrictTo) {
            // Check if at least one of the required resource types is selected
            const hasRequiredResourceType = component.restrictTo.some(rt =>
                selectedResourceTypes.includes(rt)
            );

            if (!hasRequiredResourceType) {
                // Show an error message
                if (componentId === 'topologyKeys') {
                    setError('Service Topology Keys can only be selected when Services are selected');
                } else {
                    setError(`${component.label} can only be selected with ${component.restrictTo.join(' or ')}`);
                }
                setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
                return;
            }
        }

        // Toggle the component
        setSelectedComponents(prev =>
            prev.includes(componentId)
                ? prev.filter(id => id !== componentId)
                : [...prev, componentId]
        );

        // Clear any errors when making a valid selection
        setError(null);
    };

    // Toggle selection of a resource type
    const toggleResourceType = (resourceTypeId) => {
        const isCurrentlySelected = selectedResourceTypes.includes(resourceTypeId);

        // If deselecting a resource type, check if any selected components depend on it
        if (isCurrentlySelected) {
            // Find components that would be invalidated by removing this resource type
            const affectedComponents = selectedComponents.filter(componentId => {
                const component = YAML_COMPONENTS.find(c => c.id === componentId);
                return component && component.restrictTo &&
                    component.restrictTo.includes(resourceTypeId) &&
                    // Only if this is the only selected resource type that satisfies the restriction
                    !component.restrictTo.some(rt =>
                        rt !== resourceTypeId && selectedResourceTypes.includes(rt)
                    );
            });

            // If there are affected components, deselect them
            if (affectedComponents.length > 0) {
                const componentLabels = affectedComponents.map(id => {
                    const component = YAML_COMPONENTS.find(c => c.id === id);
                    return component ? component.label : id;
                });

                // Remove the affected components
                setSelectedComponents(prev =>
                    prev.filter(id => !affectedComponents.includes(id))
                );

                // Show an informational message
                setError(`Deselected ${componentLabels.join(', ')} because they require ${resourceTypeId} to be selected.`);
                setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
            }
        }

        // Update selected resource types
        setSelectedResourceTypes(prev =>
            prev.includes(resourceTypeId)
                ? prev.filter(id => id !== resourceTypeId)
                : [...prev, resourceTypeId]
        );
    };

    // Toggle search mode between include/exclude
    const toggleSearchMode = () => {
        setSearchMode(prev => prev === 'include' ? 'exclude' : 'include');
    };

    // Filter options based on selected components
    const getAvailableFilters = () => {
        // Only show filters if we have search results
        if (!searchResults) return [];

        const filters = [];
        if (selectedComponents.includes('podAntiAffinity')) {
            filters.push({
                id: 'requiredPodAntiAffinity',
                label: 'Required Anti-Affinity',
                description: 'Show only resources with required pod anti-affinity rules'
            });
        }
        if (selectedComponents.includes('podAffinity')) {
            filters.push({
                id: 'requiredPodAffinity',
                label: 'Required Affinity',
                description: 'Show only resources with required pod affinity rules'
            });
        }
        if (selectedComponents.includes('nodeAffinity')) {
            filters.push({
                id: 'requiredNodeAffinity',
                label: 'Required Node Affinity',
                description: 'Show only resources with required node affinity rules'
            });
        }
        if (selectedComponents.includes('topologySpreadConstraints')) {
            filters.push({
                id: 'doNotScheduleTopology',
                label: 'DoNotSchedule Topology',
                description: 'Show only resources with DoNotSchedule topology spread constraints'
            });
        }
        return filters;
    };

    // Toggle filter state and trigger UI update
    const toggleFilter = (filterId) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterId]: !prev[filterId]
        }));
    };

    // Filter results based on active filters
    const filterResults = (results) => {
        if (!results || !results.matches) return results;

        const filteredMatches = results.matches.filter(result => {
            // If no filters are active, keep all results
            if (Object.values(activeFilters).every(v => !v)) {
                return true;
            }

            // Get the resource details
            const detailsKey = result.namespace 
                ? `${result.kind}-${result.namespace}-${result.name}`
                : `${result.kind}-${result.name}`;
            const details = resourceDetails[detailsKey];

            // If we don't have details, don't show the result
            if (!details) return false;

            // Helper to get affinity from either pod template or direct spec
            const getAffinity = () => {
                // Debug log the paths we're checking
                console.log('Checking affinity paths:', {
                    templatePath: details.spec?.template?.spec?.affinity,
                    directPath: details.spec?.affinity,
                    fullDetails: details
                });

                const affinity = details.spec?.template?.spec?.affinity || details.spec?.affinity;
                
                // Debug log the found affinity
                console.log('Found affinity:', affinity);
                
                return affinity;
            };

            // Check each active filter
            if (activeFilters.requiredPodAntiAffinity && result.components.includes('podAntiAffinity')) {
                const affinity = getAffinity();
                if (!affinity?.podAntiAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.length) {
                    return false;
                }
            }

            if (activeFilters.requiredPodAffinity && result.components.includes('podAffinity')) {
                const affinity = getAffinity();
                if (!affinity?.podAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.length) {
                    return false;
                }
            }

            if (activeFilters.requiredNodeAffinity && result.components.includes('nodeAffinity')) {
                const affinity = getAffinity();
                if (!affinity?.nodeAffinity?.requiredDuringSchedulingIgnoredDuringExecution?.nodeSelectorTerms?.length) {
                    return false;
                }
            }

            if (activeFilters.doNotScheduleTopology && result.components.includes('topologySpreadConstraints')) {
                const constraints = details.spec?.template?.spec?.topologySpreadConstraints || 
                                  details.spec?.topologySpreadConstraints;
                if (!constraints?.some(c => c.whenUnsatisfiable === 'DoNotSchedule')) {
                    return false;
                }
            }

            return true;
        });

        return {
            ...results,
            matches: filteredMatches,
            matchCount: filteredMatches.length
        };
    };

    // Perform the search
    const performSearch = async () => {
        if (selectedComponents.length === 0 || selectedResourceTypes.length === 0) {
            setError("Please select at least one component and one resource type to search");
            return;
        }

        setIsSearching(true);
        setError(null);
        setSearchResults(null);
        setExpandedResults({});
        setResourceDetails({});

        try {
            const response = await fetch('http://localhost:8000/resources/search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    components: selectedComponents,
                    resource_types: selectedResourceTypes,
                    mode: searchMode
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to search resources');
            }

            const results = await response.json();
            setSearchResults(results);

            // Fetch details for all results immediately
            const detailsPromises = results.matches.map(async result => {
                const kind = result.kind?.toLowerCase() || '';
                let resourceType = KIND_TO_RESOURCE_TYPE[kind] || 
                                 KIND_TO_RESOURCE_TYPE[kind + 's'] || 
                                 kind + 's';

                try {
                    const response = await fetch(`http://localhost:8000/resources/${resourceType}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch details for ${result.kind}`);
                    }

                    const resources = await response.json();
                    const matchingResource = resources.find(r => 
                        r.metadata.name === result.name && 
                        (!result.namespace || r.metadata.namespace === result.namespace)
                    );

                    if (matchingResource) {
                        // Use consistent key format: kind-name or kind-namespace-name
                        const detailsKey = result.namespace 
                            ? `${result.kind}-${result.namespace}-${result.name}`
                            : `${result.kind}-${result.name}`;

                        return { detailsKey, details: matchingResource };
                    }
                } catch (err) {
                    console.error('Error fetching resource details:', err);
                }
                return null;
            });

            // Wait for all details to be fetched
            const detailsResults = await Promise.all(detailsPromises);

            // Build the details object
            const newDetails = {};
            detailsResults.forEach(result => {
                if (result) {
                    newDetails[result.detailsKey] = result.details;
                }
            });

            // Debug log to check what details we have
            console.log('Fetched resource details:', newDetails);

            setResourceDetails(newDetails);
        } catch (err) {
            console.error('Search error:', err);
            setError(`Search failed: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Generate a comprehensive report of all components across all resource types
    const generateReport = async () => {
        setIsGeneratingReport(true);
        setError(null);
        setReportData(null);

        try {
            // Call the backend API endpoint to generate the report
            const response = await fetch('http://localhost:8000/resources/report', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    components: YAML_COMPONENTS.map(c => c.id),
                    resource_types: RESOURCE_TYPES.map(r => r.id)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate report');
            }

            const result = await response.json();

            // Convert the result to YAML format
            const yamlReport = formatReportAsYaml(result);
            setReportData(yamlReport);
        } catch (err) {
            setError(`Report generation failed: ${err.message}`);
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // Format the report data as YAML
    const formatReportAsYaml = (data) => {
        let yaml = "# Resource Components Report\n";
        yaml += "# Generated on: " + new Date().toISOString() + "\n";
        yaml += "# This report shows how many resources of each type contain each Kubernetes component\n\n";

        // Calculate totals across all resource types
        const totals = {};
        let grandTotalResources = 0;
        let hasServices = false;
        let servicesTotal = 0;

        YAML_COMPONENTS.forEach(component => {
            totals[component.id] = 0;
        });

        // First pass: calculate totals and identify if we have services
        Object.entries(data).forEach(([resourceType, components]) => {
            // Track if we have services
            if (resourceType === 'services') {
                hasServices = true;
                servicesTotal = components.total_resources || 0;
            }

            // Skip resource types with no results or no total resources
            if (components.total_resources === 0 ||
                Object.entries(components).every(([key, val]) => key === 'total_resources' || val === 0)) {
                return;
            }

            grandTotalResources += components.total_resources || 0;

            // Add to totals
            Object.entries(components).forEach(([componentId, count]) => {
                if (componentId !== 'total_resources') {
                    if (totals[componentId] !== undefined) {
                        totals[componentId] += count;
                    } else {
                        totals[componentId] = count;
                    }
                }
            });
        });

        // Add summary section first
        yaml += "summary:\n";
        yaml += `  total_resources_analyzed: ${grandTotalResources}\n`;
        Object.entries(totals).forEach(([componentId, count]) => {
            if (count > 0) {
                const componentInfo = YAML_COMPONENTS.find(c => c.id === componentId);
                const label = componentInfo ? componentInfo.label : componentId;
                const percentage = grandTotalResources > 0 ? ((count / grandTotalResources) * 100).toFixed(1) : 0;
                yaml += `  ${label}: ${count} (${percentage}%)\n`;
            }
        });
        yaml += "\n";

        // Second pass: generate resource type sections
        Object.entries(data).forEach(([resourceType, components]) => {
            const totalResources = components.total_resources || 0;

            // Skip empty resource types (but never skip services)
            if (totalResources === 0 ||
                (resourceType !== 'services' &&
                    Object.entries(components).every(([key, val]) => key === 'total_resources' || val === 0))) {
                return;
            }

            yaml += resourceType + ":\n";
            yaml += `  total_resources: ${totalResources}\n`;

            // Find the display name for each component
            Object.entries(components).forEach(([componentId, count]) => {
                if ((count > 0 || (resourceType === 'services' && componentId === 'topologyKeys')) && componentId !== 'total_resources') {
                    const componentInfo = YAML_COMPONENTS.find(c => c.id === componentId);
                    const label = componentInfo ? componentInfo.label : componentId;
                    const percentage = totalResources > 0 ? ((count / totalResources) * 100).toFixed(1) : 0;
                    yaml += `  ${label}: ${count} (${percentage}%)\n`;
                }
            });

            yaml += "\n";
        });

        // If we have services but they weren't included because they had no matching components,
        // add them explicitly with 0 count for topologyKeys
        if (hasServices && !yaml.includes('services:\n')) {
            yaml += "services:\n";
            yaml += `  total_resources: ${servicesTotal}\n`;

            // Add topologyKeys with 0 count
            const topologyKeysInfo = YAML_COMPONENTS.find(c => c.id === 'topologyKeys');
            const label = topologyKeysInfo ? topologyKeysInfo.label : 'Service Topology Keys';
            yaml += `  ${label}: 0 (0.0%)\n\n`;
        }

        return yaml;
    };

    // Toggle the expanded state of a result row
    const toggleResultExpanded = async (index, result) => {
        // Toggle the expanded state
        const newExpandedState = !expandedResults[index];
        
        setExpandedResults(prev => ({
            ...prev,
            [index]: newExpandedState
        }));

        // If this is a group header (ends with '-group'), don't do anything else
        if (index.endsWith('-group')) {
            return;
        }

        // No need to fetch details since we already have them from the initial search
        setLoadingDetails(prev => ({
            ...prev,
            [index]: false
        }));
    };

    // Handle the legacy result click for compatibility
    // Handle the result click for navigation to resource details
    const handleResultClick = (result) => {
        if (onResultClick) {
            // Get the lowercase kind
            const kind = result.kind.toLowerCase();

            // Use a more reliable mapping system
            let resourceType;

            // First look in direct mapping
            if (KIND_TO_RESOURCE_TYPE[kind]) {
                resourceType = KIND_TO_RESOURCE_TYPE[kind];
            }
            // Then check if the plural form exists in the mapping
            else if (KIND_TO_RESOURCE_TYPE[kind + 's']) {
                resourceType = KIND_TO_RESOURCE_TYPE[kind + 's'];
            }
            // Then search in our resource types list
            else {
                const matchedResourceType = RESOURCE_TYPES.find(type =>
                    type.label.toLowerCase() === kind ||
                    type.label.toLowerCase() === kind + 's'
                );

                if (matchedResourceType) {
                    resourceType = matchedResourceType.id;
                } else {
                    // Last resort fallback - make sure it's plural form for API endpoint
                    resourceType = kind.endsWith('s') ? kind : kind + 's';
                }
            }

            // Debug logging to help diagnose issues
            console.log(`Resource type mapping: ${result.kind} → ${resourceType}`);

            // Store the current search state so we can return to it
            // No need to do this since the context provider is now at the top level

            // Pass the resource information to the parent component
            onResultClick(resourceType, result.name, result.namespace);
        }
    };

    // Helper to render resource details
    const renderResourceDetails = (result, details, component) => {
        if (!details || !component) return null;

        // Helper to get affinity from either pod template or direct spec
        const getAffinity = () => {
            // Debug log the paths we're checking
            console.log('Checking affinity paths:', {
                templatePath: details.spec?.template?.spec?.affinity,
                directPath: details.spec?.affinity,
                fullDetails: details
            });

            const affinity = details.spec?.template?.spec?.affinity || details.spec?.affinity;
            
            // Debug log the found affinity
            console.log('Found affinity:', affinity);
            
            return affinity;
        };

        // Helper functions for extracting resource details
        const getContainerResources = () => {
            let containers = [];

            // For controllers (deployments, statefulsets, etc.), look in spec.template.spec.containers
            if (details.spec?.template?.spec?.containers) {
                containers = containers.concat(details.spec.template.spec.containers);
            }

            // For init containers in controllers
            if (details.spec?.template?.spec?.initContainers) {
                containers = containers.concat(details.spec.template.spec.initContainers);
            }

            // For pods, look directly in spec.containers
            if (details.spec?.containers) {
                containers = containers.concat(details.spec.containers);
            }

            // For init containers in pods
            if (details.spec?.initContainers) {
                containers = containers.concat(details.spec.initContainers);
            }

            return containers.filter(container => container.resources?.requests);
        };

        // Helper to extract liveness probes
        const getLivenessProbes = () => {
            let containers = [];

            // For controllers (deployments, statefulsets, etc.), look in spec.template.spec.containers
            if (details.spec?.template?.spec?.containers) {
                containers = containers.concat(details.spec.template.spec.containers);
            }

            // For init containers in controllers
            if (details.spec?.template?.spec?.initContainers) {
                containers = containers.concat(details.spec.template.spec.initContainers);
            }

            // For pods, look directly in spec.containers
            if (details.spec?.containers) {
                containers = containers.concat(details.spec.containers);
            }

            // For init containers in pods
            if (details.spec?.initContainers) {
                containers = containers.concat(details.spec.initContainers);
            }

            return containers.filter(container => container.livenessProbe);
        };

        // Helper to extract readiness probes
        const getReadinessProbes = () => {
            let containers = [];

            // For controllers (deployments, statefulsets, etc.), look in spec.template.spec.containers
            if (details.spec?.template?.spec?.containers) {
                containers = containers.concat(details.spec.template.spec.containers);
            }

            // For init containers in controllers
            if (details.spec?.template?.spec?.initContainers) {
                containers = containers.concat(details.spec.template.spec.initContainers);
            }

            // For pods, look directly in spec.containers
            if (details.spec?.containers) {
                containers = containers.concat(details.spec.containers);
            }

            // For init containers in pods
            if (details.spec?.initContainers) {
                containers = containers.concat(details.spec.initContainers);
            }

            return containers.filter(container => container.readinessProbe);
        };

        // Helper to extract startup probes
        const getStartupProbes = () => {
            let containers = [];

            // For controllers (deployments, statefulsets, etc.), look in spec.template.spec.containers
            if (details.spec?.template?.spec?.containers) {
                containers = containers.concat(details.spec.template.spec.containers);
            }

            // For init containers in controllers
            if (details.spec?.template?.spec?.initContainers) {
                containers = containers.concat(details.spec.template.spec.initContainers);
            }

            // For pods, look directly in spec.containers
            if (details.spec?.containers) {
                containers = containers.concat(details.spec.containers);
            }

            // For init containers in pods
            if (details.spec?.initContainers) {
                containers = containers.concat(details.spec.initContainers);
            }

            return containers.filter(container => container.startupProbe);
        };

        // Helper to extract node selectors
        const getNodeSelector = () => {
            // For controllers
            if (details.spec?.template?.spec?.nodeSelector) {
                return details.spec.template.spec.nodeSelector;
            }

            // For pods
            if (details.spec?.nodeSelector) {
                return details.spec.nodeSelector;
            }

            return null;
        };

        // Helper to extract tolerations
        const getTolerations = () => {
            // For controllers
            if (details.spec?.template?.spec?.tolerations) {
                return details.spec.template.spec.tolerations;
            }

            // For pods
            if (details.spec?.tolerations) {
                return details.spec.tolerations;
            }

            return null;
        };

        // Helper to extract topology spread constraints
        const getTopologySpreadConstraints = () => {
            // For controllers
            if (details.spec?.template?.spec?.topologySpreadConstraints) {
                return details.spec.template.spec.topologySpreadConstraints;
            }

            // For pods
            if (details.spec?.topologySpreadConstraints) {
                return details.spec.topologySpreadConstraints;
            }

            return null;
        };

        // Helper to extract topology keys for services
        const getTopologyKeys = () => {
            if (result.kind !== 'Service' || !details.spec) {
                return null;
            }

            // First check for topologyKeys array (Kubernetes >= 1.17)
            if (details.spec.topologyKeys && details.spec.topologyKeys.length > 0) {
                return {
                    topologyKeys: details.spec.topologyKeys
                };
            }

            // Also check for topology-aware routing via externalTrafficPolicy
            if (details.spec.externalTrafficPolicy === 'Local') {
                return {
                    externalTrafficPolicy: 'Local'
                };
            }

            // Check for internalTrafficPolicy (newer versions of Kubernetes)
            if (details.spec.internalTrafficPolicy === 'Local') {
                return {
                    internalTrafficPolicy: 'Local'
                };
            }

            return null;
        };

        // Determine if we're in exclude mode to show correct messages
        const isExcludeMode = searchMode === 'exclude';

        switch (component) {
            case 'resources.requests':
                const containers = getContainerResources();
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No resource requests are defined</div>
                        ) : (
                            containers.length > 0 ? (
                                containers.map((container, idx) => (
                                    <div key={idx} className="mb-2 text-sm">
                                        <div className="font-medium">Container: {container.name}</div>
                                        <div className="ml-2 mt-1">
                                            <div className="text-xs font-medium">Requests:</div>
                                            <div className="ml-2 grid grid-cols-2 gap-1">
                                                {Object.entries(container.resources.requests).map(([key, value]) => (
                                                    <div key={key} className="text-xs">
                                                        <span className="font-mono">{key}:</span> {value}
                                                    </div>
                                                ))}
                                            </div>

                                            {container.resources.limits && (
                                                <>
                                                    <div className="text-xs font-medium mt-2">Limits:</div>
                                                    <div className="ml-2 grid grid-cols-2 gap-1">
                                                        {Object.entries(container.resources.limits).map(([key, value]) => (
                                                            <div key={key} className="text-xs">
                                                                <span className="font-mono">{key}:</span> {value}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {/* Check for memory imbalance */}
                                            {container.resources.requests?.memory && (
                                                !container.resources.limits?.memory ||
                                                container.resources.requests.memory !== container.resources.limits.memory
                                            ) && (
                                                <div className="mt-2 flex items-center text-amber-600 text-xs">
                                                    <AlertTriangle className="w-3 h-3 mr-1"/>
                                                    <span>
                                                        {!container.resources.limits?.memory
                                                            ? "Memory limit not set"
                                                            : "Memory request != limit"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-gray-600">Resource requests found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            case 'topologyKeys':
                const topologyKeys = getTopologyKeys();
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No topology keys are defined</div>
                        ) : (
                            topologyKeys ? (
                                <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                    <pre>{JSON.stringify(topologyKeys, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600">
                                    Service appears to have topology awareness but details are unavailable
                                </div>
                            )
                        )}
                    </div>
                );

            case 'podAffinity':
            case 'podAntiAffinity':
            case 'nodeAffinity':
                const affinity = getAffinity();
                const affinityType = {
                    'podAffinity': affinity?.podAffinity,
                    'podAntiAffinity': affinity?.podAntiAffinity,
                    'nodeAffinity': affinity?.nodeAffinity
                }[component];

                // Add detailed debug logging
                console.log('Rendering affinity details:', {
                    component,
                    hasAffinity: !!affinity,
                    affinityType: !!affinityType,
                    fullAffinityDetails: affinity,
                    specificAffinityDetails: affinityType,
                    resourceKind: result.kind,
                    resourceName: result.name
                });

                // Special handling for node affinity to show both required and preferred
                if (component === 'nodeAffinity' && affinityType) {
                    return (
                        <div className="mt-2">
                            {isExcludeMode ? (
                                <div className="text-xs text-gray-600">No node affinity is defined</div>
                            ) : (
                                <div>
                                    {/* Required Node Affinity */}
                                    {affinityType.requiredDuringSchedulingIgnoredDuringExecution && (
                                        <div className="mb-3">
                                            <div className="text-xs font-medium mb-1">Required Node Affinity:</div>
                                            <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                                <pre>{JSON.stringify(affinityType.requiredDuringSchedulingIgnoredDuringExecution, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Preferred Node Affinity */}
                                    {affinityType.preferredDuringSchedulingIgnoredDuringExecution?.length > 0 && (
                                        <div>
                                            <div className="text-xs font-medium mb-1">Preferred Node Affinity:</div>
                                            <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                                <pre>{JSON.stringify(affinityType.preferredDuringSchedulingIgnoredDuringExecution, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* If neither exists but affinityType is present */}
                                    {!affinityType.requiredDuringSchedulingIgnoredDuringExecution && 
                                     (!affinityType.preferredDuringSchedulingIgnoredDuringExecution?.length) && (
                                        <div className="text-xs text-gray-600">
                                            Node affinity is defined but has no rules
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }

                // Regular rendering for other affinity types
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No {component} is defined</div>
                        ) : (
                            affinityType ? (
                                <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                    <pre>{JSON.stringify(affinityType, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600">Affinity found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            case 'nodeSelector':
                const nodeSelector = getNodeSelector();
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No node selector is defined</div>
                        ) : (
                            nodeSelector ? (
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    {Object.entries(nodeSelector).map(([key, value]) => (
                                        <div key={key}>
                                            <span className="font-mono">{key}:</span> {value}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600">Node selector found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            case 'tolerations':
                const tolerations = getTolerations();
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No tolerations are defined</div>
                        ) : (
                            tolerations ? (
                                <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                    <pre>{JSON.stringify(tolerations, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600">Tolerations found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            case 'topologySpreadConstraints':
                const constraints = getTopologySpreadConstraints();
                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No topology spread constraints are defined</div>
                        ) : (
                            constraints ? (
                                <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                    <pre>{JSON.stringify(constraints, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600">Topology spread constraints found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            case 'livenessProbe':
            case 'readinessProbe':
            case 'startupProbe':
                const probeGetters = {
                    'livenessProbe': getLivenessProbes,
                    'readinessProbe': getReadinessProbes,
                    'startupProbe': getStartupProbes
                };
                const probes = probeGetters[component]();
                const probeType = component.replace('Probe', '');

                return (
                    <div className="mt-2">
                        {isExcludeMode ? (
                            <div className="text-xs text-gray-600">No {probeType} probe is defined</div>
                        ) : (
                            probes.length > 0 ? (
                                probes.map((container, idx) => (
                                    <div key={idx} className="mb-2 text-sm">
                                        <div className="font-medium">Container: {container.name}</div>
                                        <div className="ml-2 mt-1">
                                            <div className="text-xs bg-white p-2 rounded overflow-auto max-h-40 font-mono">
                                                <pre>{JSON.stringify(container[component], null, 2)}</pre>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-gray-600">{probeType} probe found but details unavailable</div>
                            )
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-xs text-gray-600 mt-1">
                        {isExcludeMode
                            ? `This resource does not have this component`
                            : `This component was found in the resource`}
                    </div>
                );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <style>{tooltipStyles}</style>
            <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Resource Search</h3>
                <p className="text-sm text-gray-500">
                    Search for resources that include or exclude specific Kubernetes components.
                    <span className="flex items-center mt-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3 mr-1 inline"/>
                        Resources with memory request/limit imbalance will be flagged with warnings.
                    </span>
                </p>
            </div>

            <div className="p-4">
                {/* Regular Search Interface */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Resource Types Selection */}
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Resource Types</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-md">
                            {RESOURCE_TYPES.map(resourceType => (
                                <div
                                    key={resourceType.id}
                                    className="flex items-center space-x-2 hover:bg-gray-100 p-1 rounded cursor-pointer"
                                    onClick={() => toggleResourceType(resourceType.id)}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        selectedResourceTypes.includes(resourceType.id)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-300'
                                    }`}>
                                        {selectedResourceTypes.includes(resourceType.id) && (
                                            <Check className="w-3 h-3 text-white"/>
                                        )}
                                    </div>
                                    <span className="text-sm">{resourceType.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Search Mode Toggle */}
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Search Mode</h4>
                        <div className="bg-gray-50 p-2 rounded-md h-40 flex flex-col items-center justify-center">
                            <div className="flex flex-col items-center space-y-4">
                                <button
                                    onClick={toggleSearchMode}
                                    className={`px-4 py-2 w-32 text-sm rounded-md ${
                                        searchMode === 'include'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Have
                                </button>
                                <button
                                    onClick={toggleSearchMode}
                                    className={`px-4 py-2 w-32 text-sm rounded-md ${
                                        searchMode === 'exclude'
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Do not have
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center">
                                {searchMode === 'include'
                                    ? 'Find resources that contain the selected components'
                                    : 'Find resources that do not contain the selected components'}
                            </p>
                        </div>
                    </div>

                    {/* Components Selection */}
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Components</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-md">
                            {YAML_COMPONENTS.map(component => (
                                <div
                                    key={component.id}
                                    className="flex items-center space-x-2 hover:bg-gray-100 p-1 rounded cursor-pointer"
                                    onClick={() => toggleComponent(component.id)}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        selectedComponents.includes(component.id)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-300'
                                    }`}>
                                        {selectedComponents.includes(component.id) && (
                                            <Check className="w-3 h-3 text-white"/>
                                        )}
                                    </div>
                                    <span className="text-sm">{component.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <div className="mt-4">
                    <button
                        onClick={performSearch}
                        disabled={isSearching || isGeneratingReport}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {isSearching ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2"/>
                                Search
                            </>
                        )}
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Results and Filters */}
                {searchResults && (
                    <>
                        {/* Filters Section - Only show after search */}
                        {getAvailableFilters().length > 0 && (
                            <div className="mt-4 border-t pt-4">
                                <h4 className="text-sm font-semibold mb-2">Additional Filters</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {getAvailableFilters().map(filter => (
                                        <div
                                            key={filter.id}
                                            className="flex items-start space-x-2 bg-gray-50 p-2 rounded cursor-pointer"
                                            onClick={() => toggleFilter(filter.id)}
                                        >
                                            <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${
                                                activeFilters[filter.id]
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-gray-300'
                                            }`}>
                                                {activeFilters[filter.id] && (
                                                    <Check className="w-3 h-3 text-white"/>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium">{filter.label}</span>
                                                <p className="text-xs text-gray-500">{filter.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Results Display */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">
                                    Search Results
                                </h3>
                                <span className="text-sm text-gray-500">
                                    Found {filterResults(searchResults).matchCount} matches in {searchResults.totalResources} resources
                                </span>
                            </div>

                            <div className="space-y-4">
                                {selectedComponents.map(componentId => {
                                    const componentInfo = YAML_COMPONENTS.find(c => c.id === componentId);
                                    const componentResults = filterResults(searchResults).matches.filter(result => 
                                        result.components.includes(componentId)
                                    );

                                    if (componentResults.length === 0) return null;

                                    const groupIndex = `${componentId}-group`;
                                    
                                    return (
                                        <div key={componentId} className="bg-white rounded-md shadow-sm border overflow-hidden">
                                            {/* Component Group Header */}
                                            <button
                                                onClick={() => toggleResultExpanded(groupIndex)}
                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none bg-gray-50"
                                            >
                                                <div className="flex items-center">
                                                    <span className="font-medium">{componentInfo?.label || componentId}</span>
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">
                                                        {componentResults.length} {componentResults.length === 1 ? 'match' : 'matches'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    {expandedResults[groupIndex] ? (
                                                        <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Component Group Results */}
                                            {expandedResults[groupIndex] && (
                                                <div className="border-t">
                                                    {componentResults.map((result, index) => {
                                                        const resultIndex = `${componentId}-${index}`;
                                                        // Use consistent key format: kind-name or kind-namespace-name
                                                        const detailsKey = result.namespace 
                                                            ? `${result.kind}-${result.namespace}-${result.name}`
                                                            : `${result.kind}-${result.name}`;

                                                        // Debug log when trying to access details
                                                        const details = resourceDetails[detailsKey];
                                                        console.log('Accessing details for:', {
                                                            detailsKey,
                                                            hasDetails: !!details,
                                                            result
                                                        });

                                                        return (
                                                            <div key={resultIndex} className="border-b last:border-b-0">
                                                                <button
                                                                    onClick={() => toggleResultExpanded(resultIndex, result)}
                                                                    className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                                                >
                                                                    <div className="flex items-center">
                                                                        <span className="font-medium">{result.name}</span>
                                                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                                            {result.kind}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center">
                                                                        <span className="text-xs text-gray-500 mr-2">
                                                                            {result.namespace}
                                                                        </span>
                                                                        {expandedResults[resultIndex] ? (
                                                                            <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                                        )}
                                                                    </div>
                                                                </button>

                                                                {/* Resource Details */}
                                                                {expandedResults[resultIndex] && (
                                                                    <div className="border-t bg-white p-3">
                                                                        {loadingDetails[resultIndex] ? (
                                                                            <div className="flex justify-center py-4">
                                                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500"/>
                                                                            </div>
                                                                        ) : details ? (
                                                                            <div className="text-sm">
                                                                                {/* Basic metadata */}
                                                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                                                    <div>
                                                                                        <h4 className="font-medium mb-2">Resource Info</h4>
                                                                                        <div className="bg-gray-50 p-2 rounded">
                                                                                            <div className="grid grid-cols-2 gap-x-2 text-xs">
                                                                                                <div className="font-medium text-gray-600">Name:</div>
                                                                                                <div>{details.metadata?.name}</div>
                                                                                                {details.metadata?.namespace && (
                                                                                                    <>
                                                                                                        <div className="font-medium text-gray-600">Namespace:</div>
                                                                                                        <div>{details.metadata.namespace}</div>
                                                                                                    </>
                                                                                                )}
                                                                                                <div className="font-medium text-gray-600">Kind:</div>
                                                                                                <div>{result.kind}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Component Details */}
                                                                                <div className="bg-gray-50 p-3 rounded-md">
                                                                                    <h5 className="text-sm font-medium text-gray-700 mb-2">{componentInfo?.label}</h5>
                                                                                    {renderResourceDetails(result, details, componentId)}
                                                                                </div>

                                                                                {/* View full details button */}
                                                                                <div className="mt-4 flex justify-end">
                                                                                    <button
                                                                                        onClick={() => handleResultClick(result)}
                                                                                        className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm flex items-center"
                                                                                    >
                                                                                        <ExternalLink className="w-3 h-3 mr-1"/>
                                                                                        View Full Details
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-sm text-gray-500">
                                                                                No additional details available
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResourceSearch;