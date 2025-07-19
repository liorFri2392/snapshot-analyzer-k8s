import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {ChevronRight, ChevronDown, ChevronLeft, Upload, RefreshCw, Loader2, LayoutGrid, Download, CheckCircle, Search} from 'lucide-react';
import NodeDetails from './NodeDetails';
import PodDetails from './PodDetails';
import ServiceDetails from "./ServiceDetails";
import DeploymentComponent from "./DeploymentComponent";
import DaemonSetComponent from "./DaemonSetComponent";
import StatefulSetDetails from "./StatefulSetComponent";
import ReplicaSetDetails from "./ReplicaSetDetails";
import JobDetails from "./JobDetails";
import PersistentVolumeDetails from "./PersistentVolumeDetails";
import PersistentVolumeClaimDetails from "./PersistentVolumeClaimDetails";
import StorageClassDetails from "./SorageClassDetails";
import CSINodeDetails from "./CSINodeDetails";
import PodDisruptionBudgetDetails from "./PodDisruptionBudgetDetails";
import HorizontalPodAutoscalerDetails from "./HorizontalPodAutoscalerDetails";
import IngressDetails from "./IngressDetails";
import NetworkPolicyDetails from "./NetworkPolicyDetails";
import RoleDetails from "./RoleDetails";
import RoleBindingDetails from "./RoleBindingDetails";
import ClusterRoleDetails from "./ClusterRoleDetails";
import ClusterRoleBindingDetails from "./ClusterRoleBindingDetails";
import NamespaceDetails from "./NamespaceDetails";
import EventDetails from "./EventDetails";
import RolloutDetails from "./RolloutDetails";
import RecommendationDetails from "./RecommendationDetails";
import WoopDetails from "./WoopDetails";
import PodMetricDetails from "./PodMetricDetails";
import WelcomeScreen from "./WelcomeScreen";
import InsightsView from "./InsightsView";
import ClusterReports from "./ClusterReports";
import {fetchProblematicNodes, fetchProblematicWorkloads} from '../services/castaiApiService';
import ProblematicNodesCard from './cards/ProblematicNodesCard';
import ProblematicWorkloadsCard from './cards/ProblematicWorkloadsCard';
import TimeSelectionDropdown from './TimeSelectionDropdown';
import EventsCard from './cards/EventsCard';
import ResourceSearch from './ResourceSearch';
import { SearchProvider } from '../context/SearchContext';
import BestPracticesCard from './cards/BestPracticesCard';
import BestPracticesDetailView from './cards/BestPracticesDetailView';
import GroupedResourceMenu from './GroupedResourceMenu';


const ClusterExplorer = () => {
    const [expandedSections, setExpandedSections] = useState({});
    const [resources, setResources] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [resourceDetails, setResourceDetails] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [clusterDetails, setClusterDetails] = useState(null);
    const [fetchedSnapshotName, setFetchedSnapshotName] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [problematicNodes, setProblematicNodes] = useState(null);
    const [problematicNodesError, setProblematicNodesError] = useState(null);
    const [isLoadingProblematicNodes, setIsLoadingProblematicNodes] = useState(false);
    const [problematicWorkloads, setProblematicWorkloads] = useState(null);
    const [problematicWorkloadsError, setProblematicWorkloadsError] = useState(null);
    const [isLoadingWorkloads, setIsLoadingWorkloads] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [useLatestSnapshot, setUseLatestSnapshot] = useState(true);
    const [selectedDateTime, setSelectedDateTime] = useState(() => {
        // Initialize with current date/time in datetime-local format: "YYYY-MM-DDTHH:MM:SS"
        const now = new Date();
        const pad = (num) => String(num).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    });
    const [eventsData, setEventsData] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState(null);
    const [bestPracticesAnalysisResults, setBestPracticesAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showBestPracticesDetail, setShowBestPracticesDetail] = useState(false);

    const toggleUseLatestSnapshot = (e) => {
        const checked = e.target.checked;
        setUseLatestSnapshot(checked);
    };

    const handleDateTimeChange = (e) => {
        let newDateTime = e.target.value;
        // If the value doesn't include seconds (e.g. "YYYY-MM-DDTHH:MM"), append ":00"
        if (newDateTime.split(':').length < 3) {
            newDateTime += ":00";
        }
        setSelectedDateTime(newDateTime);
    };

    // Helper to format the selected datetime into separate date and time strings, for displaying in time selection button.
    const getFormattedDateTime = (dateTimeStr) => {
        const dateObj = new Date(dateTimeStr);
        const pad = (num) => String(num).padStart(2, '0');
        const day = pad(dateObj.getDate());
        const month = pad(dateObj.getMonth() + 1);
        const year = dateObj.getFullYear();
        const hours = pad(dateObj.getHours());
        const minutes = pad(dateObj.getMinutes());
        const seconds = pad(dateObj.getSeconds());
        return {date: `${day}/${month}/${year}`, time: `${hours}:${minutes}:${seconds}`};
    };

    const {date, time} = getFormattedDateTime(selectedDateTime);

    const fetchClusterData = async (clusterId) => {
        const clusterDetails = getClusterDetails(clusterId);
        console.log('ClusterDetails:', clusterDetails);
        if (!clusterDetails?.apiKey) {
            return;
        }

        // Fetch all data in parallel
        try {
            setIsLoadingProblematicNodes(true);
            setIsLoadingWorkloads(true);
            setEventsLoading(true);

            await Promise.all([
                fetchProblematicNodes(
                    clusterId,
                    clusterDetails.region || 'US',
                    clusterDetails.apiKey
                ).catch(err => {
                    console.error('Error fetching problematic nodes:', err);
                    setProblematicNodesError(err.message);
                    return null;
                }).then(response => {
                    setProblematicNodes(response);
                }),

                fetchProblematicWorkloads(
                    clusterId,
                    clusterDetails.region || 'US',
                    clusterDetails.apiKey
                ).catch(err => {
                    console.error('Error fetching problematic workloads:', err);
                    setProblematicWorkloadsError(err.message);
                    return null;
                }).then(response => {
                    setProblematicWorkloads(response);
                }),

                fetchEventsForOverview()
            ]);
        } catch (error) {
            console.error('Error fetching cluster data:', error);
        } finally {
            setIsLoadingProblematicNodes(false);
            setIsLoadingWorkloads(false);
            // eventsLoading is set to false in fetchEventsForOverview
        }
    };

    // Ensure fetchEventsForOverview is called after fetchSnapshot in handleClusterSelect
    const handleClusterSelect = async (clusterId) => {
        const details = getClusterDetails(clusterId);
        setSelectedCluster(clusterId);
        setClusterDetails(details);
        setResources(null);

        setEventsLoading(true);
        setIsLoading(true);

        try {
            setIsRefreshing(true);
            await fetchSnapshot(clusterId);
            await fetchClusterData(clusterId);
            await fetchEventsForOverview();
            setIsRefreshing(false);
        } catch (error) {
            setIsRefreshing(false)
            console.error('Error loading cluster data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false)
            setEventsLoading(false);
        }
    };

    const getClusterDetails = (clusterId) => {
        try {
            const clusters = JSON.parse(localStorage.getItem('registeredClusters') || '[]');
            return clusters.find(c => c.id === clusterId) || null;
        } catch (error) {
            console.error('Error loading cluster details:', error);
            return null;
        }
    };

    const resetStates = () => {
        // Reset cluster selection
        setSelectedCluster(null);
        setClusterDetails(null);
        setResources(null);

        // Reset resource viewing states
        setSelectedResource(null);
        setResourceDetails([]);
        setExpandedSections({});

        // Reset events data
        setEventsData([]);
        setEventsError(null);
        setEventsLoading(false);

        // Reset any error or loading states
        setError(null);
        setIsLoading(false);

        // Reset problematic data
        setProblematicNodes(null);
        setProblematicNodesError(null);
        setIsLoadingProblematicNodes(false);

        setProblematicWorkloads(null);
        setProblematicWorkloadsError(null);
        setIsLoadingWorkloads(false);
    };

    const fetchSnapshot = async (clusterId) => {
        setIsLoading(true);
        setError(null);

        try {
            const clusterDetails = getClusterDetails(clusterId);
            const payload = {
                cluster_id: clusterId,
                region: clusterDetails?.region || 'us',
                ...(!useLatestSnapshot && {
                    date: `${selectedDateTime}Z`
                })
            };

            const response = await fetch('http://localhost:8000/cluster/snapshot', {
                method: 'post',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.status === 'success' && result.data) {
                setResources(result.data);
                setFetchedSnapshotName(result.snapshotFilename)
            } else {
                throw new Error(result.message || 'Failed to load snapshot');
            }
        } catch (err) {
            setError(err.message);
            console.error('Error fetching snapshot:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshSnapshot = async () => {
        if (selectedCluster) {
            setIsRefreshing(true);
            try {
                await Promise.all([
                    await fetchSnapshot(selectedCluster),
                    await fetchClusterData(selectedCluster),
                    await fetchEventsForOverview(),
                    selectedResource ? fetchResourceDetails(selectedResource) : Promise.resolve()
                ]);
            } catch (error) {
                console.error('Error refreshing data:', error);
            } finally {
                setIsRefreshing(false);
            }
        }
    };

    const extractFilenameFromContentDisposition = (contentDisposition) => {
        if (contentDisposition && contentDisposition.indexOf('filename') > -1) {
            const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (filenameMatch && filenameMatch[1]) {
                return filenameMatch[1].replace(/['"]/g, '');
            }
        }
        return null;
    };

    const createAndTriggerDownloadLink = (url, filename) => {
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    };

    const downloadSnapshot = async () => {
        if (!selectedCluster) return;

        setIsDownloading(true);
        setError(null);

        try {
            const clusterInfo = getClusterDetails(selectedCluster);
            const region = clusterInfo?.region || 'US';
            let url = `http://localhost:8000/cluster/snapshot/raw?cluster_id=${selectedCluster}&region=${region}`;

            if (!useLatestSnapshot) {
                url += `&date=${encodeURIComponent(selectedDateTime)}Z`;
            }

            const response = await fetch(url, {method: 'GET'});

            if (!response.ok) {
                throw new Error(`Failed to download snapshot: ${response.statusText}`);
            }

            const data = await response.json();
            const snapshotBlob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const downloadUrl = URL.createObjectURL(snapshotBlob);

            const filename = extractFilenameFromContentDisposition(response.headers.get('Content-Disposition')) || 'download.json';

            createAndTriggerDownloadLink(downloadUrl, filename);

        } catch (err) {
            console.error('Error downloading snapshot:', err);
            setError(err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    // Create a dedicated function to fetch events:
    const fetchEventsForOverview = async () => {
        console.log("Starting fetchEventsForOverview...");

        setEventsLoading(true);
        setEventsError(null);

        try {
            console.log("Calling events endpoint...");
            const response = await fetch('http://localhost:8000/resources/events');
            console.log("Response status:", response.status);

            if (!response.ok) {
                throw new Error(`Failed to fetch events: ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log("Raw response length:", responseText.length);
            console.log("Raw response sample:", responseText.substring(0, 100));

            let eventsData;
            try {
                eventsData = JSON.parse(responseText);
                console.log("Parsed events data:", {
                    type: typeof eventsData,
                    isArray: Array.isArray(eventsData),
                    length: Array.isArray(eventsData) ? eventsData.length : 'not an array'
                });
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Failed to parse events data');
            }

            setEventsData(eventsData || []);
            return eventsData;
        } catch (err) {
            console.error('Complete error fetching events:', err);
            setEventsError(err.message);
            return [];
        } finally {
            setEventsLoading(false);
        }
    };

    // Function to run best practices analysis
    const runBestPracticesAnalysis = useCallback(async () => {
        // Don't run analysis if no resources loaded
        if (!resources || typeof resources !== 'object' || Object.keys(resources).length === 0) {
            console.log("No resource data available for analysis yet, deferring analysis");
            return;
        }
        
        setIsAnalyzing(true);
        try {
            // Fetch from the backend API
            const response = await fetch(`http://localhost:8000/reports/best-practices-analysis`);
            
            if (response.ok) {
                const data = await response.json();
                setBestPracticesAnalysisResults(data);
                console.log("Best practices analysis received from backend");
            } else {
                // If the API fails, log the error but don't use mock data
                console.error("Failed to fetch best practices analysis from backend");
            }
        } catch (error) {
            console.error("Error analyzing best practices:", error);
            // Don't fall back to mock data anymore
        } finally {
            setIsAnalyzing(false);
        }
    }, [resources]);
    
    // Run analysis when resource data changes, but only if resources is properly loaded
    useEffect(() => {
        if (resources && typeof resources === 'object' && Object.keys(resources).length > 0) {
            console.log("Resources loaded, running best practices analysis");
            runBestPracticesAnalysis();
        } else {
            // Clear the analysis results when resources are not available to prevent UI errors
            console.log("Resources not available, clearing best practices analysis results");
            setBestPracticesAnalysisResults(null);
        }
    }, [resources, runBestPracticesAnalysis]);

    const fetchResourceDetails = async (resourceType) => {
        if (resourceType === 'overview') {
            setSelectedResource(null);
            return;
        }
        
        // Special handling for best practices section
        if (resourceType === 'bestpractices') {
            setSelectedResource('bestpractices');
            // Run the analysis when the best practices page is loaded
            if (!bestPracticesAnalysisResults && !isAnalyzing) {
                runBestPracticesAnalysis();
            }
            return;
        }

        // Special handling for resource search component
        if (resourceType === 'resourcesearch') {
            setSelectedResource('resourcesearch');
            return;
        }

        // Special handling for insights component
        if (resourceType === 'insights') {
            setSelectedResource('insights');
            return;
        }

        // Special handling for cluster reports component
        if (resourceType === 'clusterreports') {
            setSelectedResource('clusterreports');
            return;
        }

        // Normalize resource type to ensure it matches what the backend expects
        const normalizedResourceType = resourceType.toLowerCase();

        // Validate if the resource type exists in our resources
        if (!resources || !(normalizedResourceType in resources)) {
            console.error(`Resource type not found: "${normalizedResourceType}"`);
            console.log("Available resource types:", Object.keys(resources || {}));
            setError(`Cannot view resource type "${normalizedResourceType}". This resource type may not be supported.`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[DEBUG] Fetching ${normalizedResourceType} details...`);

            const response = await fetch(`http://localhost:8000/resources/${normalizedResourceType}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch ${normalizedResourceType}: ${response.statusText}\n${errorText}`);
            }

            const details = await response.json();
            console.log(`[DEBUG] Received ${normalizedResourceType} details:`, {
                count: Array.isArray(details) ? details.length : 'not an array',
                sample: Array.isArray(details) && details.length > 0 ? details[0] : null
            });

            setResourceDetails(details);
            setSelectedResource(normalizedResourceType);

            // If we're fetching events, also update the eventsData
            if (normalizedResourceType === 'events' && Array.isArray(details)) {
                console.log('[DEBUG] Updating eventsData from fetchResourceDetails', {length: details.length});
                setEventsData(details);
            }
        } catch (error) {
            console.error(`[DEBUG] Error fetching ${normalizedResourceType}:`, error);
            setError(`Error fetching ${normalizedResourceType}: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to navigate to specific resource and optionally filter by name
    const handleResourceSelect = (resourceType, resourceName = null) => {
        // Normalize resourceType to lower case to match the API expectations
        const normalizedResourceType = resourceType.toLowerCase();
        
        console.log(`Navigating to resource: ${normalizedResourceType}${resourceName ? ` with name: ${resourceName}` : ''}`);
        
        // If resource name is provided, we'll need to apply a filter after loading the resource
        if (resourceName) {
            // We can expand with more resource types as needed
            if (normalizedResourceType === 'pods') {
                // Set a state to filter by pod name after fetching pods
                localStorage.setItem('filterPodName', resourceName);
            }
        }
        
        // Navigate to the resource
        fetchResourceDetails(normalizedResourceType);
    };

    // If no cluster is selected, show the welcome screen
    if (!selectedCluster && !resources) {
        return <WelcomeScreen onClusterSelect={handleClusterSelect}/>;
    }

    const DefaultResourceDetails = ({items}) => (
        <div className="border rounded-lg p-4 bg-white">
            <h3 className="text-lg font-medium mb-4 capitalize">{selectedResource}</h3>
            {items.map((item, index) => (
                <div key={index} className="border-b last:border-0 py-2">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        {item.namespace && (
                            <span className="text-gray-500">namespace: {item.namespace}</span>
                        )}
                    </div>
                    {item.labels && Object.keys(item.labels).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(item.labels).map(([key, value]) => (
                                <span key={key} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                    {key}: {value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const handleResourceSearchResult = (resourceType, name, namespace) => {
        // Make sure the resource type is lowercase to match our resources object
        const normalizedType = resourceType.toLowerCase();

        console.log(`Viewing resource: ${normalizedType} / ${name} in namespace ${namespace}`);
        console.log("Available resource types in current snapshot:", Object.keys(resources || {}).sort().join(", "));

        // Verify this is a valid resource type before fetching
        if (!resources) {
            setError("No resources available. Please reload the cluster snapshot.");
            return;
        }

        if (!(normalizedType in resources)) {
            console.error(`Resource type "${normalizedType}" not found in available resources!`);

            // Try some common transformations to find a match
            const singularForm = normalizedType.endsWith('s') ? normalizedType.slice(0, -1) : normalizedType;
            const pluralForm = normalizedType.endsWith('s') ? normalizedType : normalizedType + 's';

            // Check if singular or plural form exists in resources
            if (pluralForm in resources) {
                console.log(`Found plural form match: ${pluralForm}`);
                fetchResourceDetails(pluralForm);
                return;
            }

            // Try to find a close match to provide a more helpful error message
            const closeMatches = Object.keys(resources)
                .filter(type =>
                    type.includes(singularForm) ||
                    singularForm.includes(type.replace(/s$/, ''))
                )
                .join(', ');

            console.log(`Possible close matches: ${closeMatches || 'none found'}`);

            if (closeMatches) {
                setError(`Resource type "${normalizedType}" not found. Did you mean: ${closeMatches}?`);
            } else {
                setError(`Cannot view resource of type "${normalizedType}". This resource type is not available in the current snapshot.`);
            }
            return;
        }

        // Fetch the resource type's collection
        console.log(`Fetching details for resource type: ${normalizedType}`);
        fetchResourceDetails(normalizedType);
    };

    // Wrap the component with SearchProvider only once at the top level
    // This ensures the search context is preserved during navigation
    const renderResourceDetails = () => {
        if (!resourceDetails) return null;

        switch (selectedResource) {
            case 'clusterreports':
                return <ClusterReports clusterDetails={clusterDetails} />;
            case 'insights':
                return <InsightsView />;
            case 'resourcesearch':
                return <ResourceSearch />;
            case 'bestpractices':
                return (
                    <BestPracticesCard
                        analysisResults={bestPracticesAnalysisResults}
                        isAnalyzing={isAnalyzing}
                        onViewDetails={() => setShowBestPracticesDetail(true)}
                    />
                );
            case 'nodes':
                return <NodeDetails items={resourceDetails} />;
            case 'pods':
                return <PodDetails items={resourceDetails} />;
            case 'services':
                return <ServiceDetails items={resourceDetails} />;
            case 'deployments':
                return <DeploymentComponent items={resourceDetails} />;
            case 'daemonsets':
                return <DaemonSetComponent items={resourceDetails} />;
            case 'statefulsets':
                return <StatefulSetDetails items={resourceDetails} />;
            case 'replicasets':
                return <ReplicaSetDetails items={resourceDetails} />;
            case 'jobs':
                return <JobDetails items={resourceDetails} />;
            case 'persistentvolumes':
                return <PersistentVolumeDetails items={resourceDetails} />;
            case 'persistentvolumeclaims':
                return <PersistentVolumeClaimDetails items={resourceDetails} />;
            case 'storageclasses':
                return <StorageClassDetails items={resourceDetails} />;
            case 'csinodes':
                return <CSINodeDetails items={resourceDetails} />;
            case 'poddisruptionbudgets':
                return <PodDisruptionBudgetDetails items={resourceDetails} />;
            case 'horizontalpodautoscalers':
                return <HorizontalPodAutoscalerDetails items={resourceDetails} />;
            case 'ingresses':
                return <IngressDetails items={resourceDetails} />;
            case 'networkpolicies':
                return <NetworkPolicyDetails items={resourceDetails} />;
            case 'roles':
                return <RoleDetails items={resourceDetails} />;
            case 'rolebindings':
                return <RoleBindingDetails items={resourceDetails} />;
            case 'clusterroles':
                return <ClusterRoleDetails items={resourceDetails} />;
            case 'clusterrolebindings':
                return <ClusterRoleBindingDetails items={resourceDetails} />;
            case 'namespaces':
                return <NamespaceDetails items={resourceDetails} />;
            case 'events':
                return <EventDetails items={resourceDetails} />;
            case 'rollouts':
                return <RolloutDetails items={resourceDetails} />;
            case 'recommendations':
                return <RecommendationDetails items={resourceDetails} />;
            case 'woop':
                return <WoopDetails items={resourceDetails} />;
            case 'podmetrics':
                return <PodMetricDetails items={resourceDetails} />;
            default:
                return null;
        }
    };

    const ConfigMapDetails = ({items = []}) => {
        const [expandedConfigMaps, setExpandedConfigMaps] = useState({});
        const [filters, setFilters] = useState({
            namespace: '',
            search: ''
        });
        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 20;

        // Extract unique namespaces
        const namespaces = [...new Set(items.map(cm => cm.metadata.namespace))].sort();

        // Filter and paginate configmaps
        const filteredConfigMaps = useMemo(() => {
            return items.filter(cm => {
                const matchNamespace = !filters.namespace || cm.metadata.namespace === filters.namespace;
                const matchSearch = !filters.search || 
                    cm.metadata.name.toLowerCase().includes(filters.search.toLowerCase());
                return matchNamespace && matchSearch;
            });
        }, [items, filters]);

        // Paginate filtered configmaps
        const paginatedConfigMaps = useMemo(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            return filteredConfigMaps.slice(startIndex, startIndex + itemsPerPage);
        }, [filteredConfigMaps, currentPage]);

        // Pagination calculations
        const totalPages = Math.ceil(filteredConfigMaps.length / itemsPerPage);

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

        const toggleConfigMap = (configMapIndex) => {
            setExpandedConfigMaps(prev => ({
                ...prev,
                [configMapIndex]: !prev[configMapIndex]
            }));
        };

        // Helper function to display configmap data
        const renderConfigMapData = (data) => {
            if (!data) return null;
            
            return (
                <div className="p-4 bg-gray-50 rounded mt-2">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 px-3 font-semibold">Key</th>
                                <th className="py-2 px-3 font-semibold">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data).map(([key, value]) => (
                                <tr key={key} className="border-b">
                                    <td className="py-2 px-3 font-medium">{key}</td>
                                    <td className="py-2 px-3">
                                        {value.length > 100 ? (
                                            <div>
                                                <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-100 p-2 rounded">
                                                    {value.substring(0, 100)}...
                                                </pre>
                                                <button
                                                    onClick={() => alert(value)}
                                                    className="text-blue-500 text-sm mt-1"
                                                >
                                                    View Full Content
                                                </button>
                                            </div>
                                        ) : (
                                            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-100 p-2 rounded">
                                                {value}
                                            </pre>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        };

        if (!items?.length) {
            return (
                <div className="bg-white p-4 rounded-lg text-center text-gray-500">
                    No ConfigMaps available
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex gap-4">
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
                </div>

                <div className="text-sm text-gray-500 mb-2">
                    Showing {paginatedConfigMaps.length} of {filteredConfigMaps.length} ConfigMaps
                </div>

                {/* ConfigMap List */}
                {paginatedConfigMaps.map((configMap, index) => (
                    <div key={configMap.metadata.uid} className="bg-white rounded-lg shadow overflow-hidden">
                        <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleConfigMap(index)}
                        >
                            <div>
                                <h3 className="font-medium">{configMap.metadata.name}</h3>
                                <div className="text-sm text-gray-500">Namespace: {configMap.metadata.namespace}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {configMap.data && (
                                    <div className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {Object.keys(configMap.data).length} Items
                                    </div>
                                )}
                                <ChevronDown 
                                    className={`w-5 h-5 transform transition-transform ${expandedConfigMaps[index] ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </div>
                        
                        {expandedConfigMaps[index] && (
                            <div className="border-t p-4">
                                <h4 className="font-medium mb-2">Data</h4>
                                {configMap.data ? (
                                    renderConfigMapData(configMap.data)
                                ) : (
                                    <div className="text-gray-500 italic">No data available</div>
                                )}
                                <div className="mt-4 border-t pt-4">
                                    <h4 className="font-medium mb-2">Metadata</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-500">Created</div>
                                            <div>{configMap.metadata.creationTimestamp}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">UID</div>
                                            <div>{configMap.metadata.uid}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Labels */}
                                    {configMap.metadata.labels && Object.keys(configMap.metadata.labels).length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium mb-2">Labels</h5>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(configMap.metadata.labels).map(([key, value]) => (
                                                    <span key={key} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                        {key}: {value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Annotations */}
                                    {configMap.metadata.annotations && Object.keys(configMap.metadata.annotations).length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="text-sm font-medium mb-2">Annotations</h5>
                                            <div className="bg-gray-50 p-2 rounded text-sm">
                                                {Object.entries(configMap.metadata.annotations).map(([key, value]) => (
                                                    <div key={key} className="mb-1">
                                                        <span className="font-medium">{key}:</span> {value}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Show message if no ConfigMaps match the filters */}
                {filteredConfigMaps.length === 0 && (
                    <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                        No ConfigMaps match the selected filters
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredConfigMaps.length > 0 && (
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
                            <ChevronRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleLogoClick = () => {
        resetStates();
    };

    return (
        <SearchProvider>
            <div className="min-h-screen bg-gray-100">
                <div className="px-6 py-4 bg-white border-b">
                    <div className="flex items-center gap-8 max-w-7xl mx-auto">
                        <div 
                            className="cursor-pointer"
                            onClick={handleLogoClick}
                        >
                            <img
                                width="104"
                                height="41"
                                src="/images/cast-ai-logo-103x41-1.svg"
                                alt="Logo"
                                className="flex-shrink-0"
                            />
                        </div>

                        {clusterDetails && (
                            <div className="flex flex-col flex-grow">
                                <span className="font-medium">
                                    {clusterDetails.alias}
                                </span>
                                <span className="text-[0.75rem] text-gray-500">
                                    ID: {clusterDetails.id}
                                </span>
                                <span className="text-[0.75rem] text-gray-500">
                                    Snapshot: {fetchedSnapshotName}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-4 flex-shrink-0 ml-auto left">
                            <button
                                onClick={resetStates}
                                className="flex items-center px-4 py-2 bg-white text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2"/>
                                Back to Clusters
                            </button>
                            <button
                                onClick={refreshSnapshot}
                                disabled={isRefreshing}
                                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}/>
                                Refresh
                            </button>
                            <button
                                onClick={downloadSnapshot}
                                disabled={isDownloading}
                                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                            >
                                {isDownloading ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>
                                ) : (
                                    <Download className="w-4 h-4 mr-2"/>
                                )}
                                Download
                            </button>
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen((prev) => !prev);
                                    }}
                                    className="flex flex-col items-center justify-center w-24 h-10 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    {useLatestSnapshot ? (
                                        "Latest"
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs">{date}</span>
                                            <span className="text-xs">{time}</span>
                                        </div>
                                    )}
                                </button>
                                <TimeSelectionDropdown
                                    isOpen={isDropdownOpen}
                                    useLatestSnapshot={useLatestSnapshot}
                                    onToggleUseLatest={toggleUseLatestSnapshot}
                                    selectedDateTime={selectedDateTime}
                                    onDateTimeChange={handleDateTimeChange}
                                    onClose={() => setIsDropdownOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                        <div className="flex">
                            <div className="flex-1">
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex">
                    <div className="w-80 h-[calc(100vh-73px)] overflow-y-auto bg-gray-50 p-6">
                        <GroupedResourceMenu
                            resources={resources}
                            onResourceSelect={handleResourceSelect}
                            selectedResource={selectedResource}
                        />
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto h-[calc(100vh-73px)]">
                        {!selectedResource && (
                            <div className="space-y-6">
                                <EventsCard
                                    items={eventsData || []}
                                    isLoading={eventsLoading || isRefreshing}
                                    error={eventsError}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ProblematicNodesCard
                                        data={problematicNodes}
                                        isLoading={isLoadingProblematicNodes || isRefreshing}
                                        error={problematicNodesError}
                                    />
                                    <ProblematicWorkloadsCard
                                        data={problematicWorkloads}
                                        isLoading={isLoadingWorkloads || isRefreshing}
                                        error={problematicWorkloadsError}
                                    />
                                </div>
                            </div>
                        )}
                        {renderResourceDetails()}
                    </div>
                </div>

            {showBestPracticesDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
                    <BestPracticesDetailView 
                        analysisResults={bestPracticesAnalysisResults}
                        isLoading={isAnalyzing}
                        onReanalyze={runBestPracticesAnalysis}
                        onClose={() => setShowBestPracticesDetail(false)}
                        clusterName={clusterDetails?.alias}
                        clusterId={clusterDetails?.id}
                    />
                </div>
            )}
            </div>
        </SearchProvider>
    );
};

export default ClusterExplorer;