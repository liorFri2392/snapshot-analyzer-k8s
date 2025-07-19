import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Octagon, Cpu, Package, ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';

const InsightsView = ({ onResourceSelect }) => {
    const [deployments, setDeployments] = useState({
        admissionControllers: [],
        competition: [],
        castai: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [helmCharts, setHelmCharts] = useState({});
    
    // SE Report states
    const [seReportResults, setSEReportResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedResults, setExpandedResults] = useState({});
    const [resourceDetails, setResourceDetails] = useState({});
    const [loadingDetails, setLoadingDetails] = useState({});

    // Define default groups
    const defaultGroups = {
        competition: ['karpenter', 'scaleops'],
        admissionControllers: ['kyverno']
    };

    useEffect(() => {
        const fetchResources = async () => {
            try {
                // Fetch deployments
                const deploymentsResponse = await fetch('http://localhost:8000/resources/deployments');
                if (!deploymentsResponse.ok) {
                    throw new Error('Failed to fetch deployments');
                }
                const allDeployments = await deploymentsResponse.json();
                
                // Filter and categorize deployments
                const admissionControllers = allDeployments.filter(deployment => 
                    deployment.metadata.name.toLowerCase().includes('kyverno')
                );
                
                const competition = allDeployments.filter(deployment => 
                    deployment.metadata.name.toLowerCase().includes('karpenter') ||
                    deployment.metadata.name.toLowerCase().includes('scaleops')
                );

                const castai = allDeployments.filter(deployment => 
                    deployment.metadata.namespace === 'castai-agent'
                );
            
                setDeployments({
                    admissionControllers,
                    competition,
                    castai
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResources();
    }, []);

    // Fetch Helm charts
    useEffect(() => {
        const fetchHelmCharts = async () => {
            try {
                const response = await fetch('http://localhost:8000/helm-charts');
                if (!response.ok) {
                    throw new Error('Failed to fetch Helm charts');
                }
                const data = await response.json();
                setHelmCharts(data);
            } catch (err) {
                console.error('Error fetching Helm charts:', err);
            }
        };

        fetchHelmCharts();
    }, []);

    // Add this after the existing useEffect hooks
    useEffect(() => {
        performSEReport();
    }, []);

    const performSEReport = async () => {
        setIsSearching(true);
        setError(null);
        setSEReportResults(null);
        setExpandedResults({});
        setResourceDetails({});

        try {
            // Get all PDBs
            const pdbResponse = await fetch('http://localhost:8000/resources/poddisruptionbudgets');
            if (!pdbResponse.ok) {
                throw new Error('Failed to fetch PDBs');
            }
            const pdbs = await pdbResponse.json();

            // Filter PDBs with 0 disruptions allowed
            const pdbResults = pdbs.filter(pdb => {
                const maxUnavailable = pdb.spec?.maxUnavailable;
                const minAvailable = pdb.spec?.minAvailable;
                const currentHealthy = pdb.status?.currentHealthy || 0;
                
                if (maxUnavailable === '0' || maxUnavailable === 0) return true;
                if ((maxUnavailable === '1' || maxUnavailable === 1) && currentHealthy <= 1) return true;
                if (typeof maxUnavailable === 'string' && maxUnavailable.endsWith('%')) {
                    const percentage = parseInt(maxUnavailable);
                    const maxUnavailableCount = Math.ceil((percentage / 100) * currentHealthy);
                    if (maxUnavailableCount === 0 || maxUnavailableCount >= currentHealthy) return true;
                }
                if (minAvailable === '100%' || minAvailable === '100') return true;
                if (typeof minAvailable === 'string' && minAvailable.endsWith('%')) {
                    const percentage = parseInt(minAvailable);
                    const minAvailableCount = Math.ceil((percentage / 100) * currentHealthy);
                    if (minAvailableCount >= currentHealthy) return true;
                }
                if (minAvailable && !isNaN(minAvailable) && parseInt(minAvailable) >= currentHealthy) return true;
                return false;
            }).map(pdb => ({
                kind: 'PodDisruptionBudget',
                name: pdb.metadata.name,
                namespace: pdb.metadata.namespace,
                components: ['pdbIssues'],
                details: pdb,
                group: 'pdb'
            }));

            // Get all pods to detect LimitRanger
            const podsResponse = await fetch('http://localhost:8000/resources/pods');
            if (!podsResponse.ok) {
                throw new Error('Failed to fetch pods');
            }
            const pods = await podsResponse.json();

            // Filter for LimitRanger-annotated pods
            const limitRangerPods = pods.filter(pod =>
                pod.metadata?.annotations?.['kubernetes.io/limit-ranger']
            ).map(pod => ({
                kind: 'Pod',
                name: pod.metadata.name,
                namespace: pod.metadata.namespace,
                components: ['limitRanger'],
                details: pod,
                group: 'limitRanger'
            }));

            // Get all deployments, statefulsets, jobs, cronjobs, and daemonsets
            const [deploymentsResponse, statefulsetsResponse, jobsResponse, cronjobsResponse, daemonsetsResponse] = await Promise.all([
                fetch('http://localhost:8000/resources/deployments'),
                fetch('http://localhost:8000/resources/statefulsets'),
                fetch('http://localhost:8000/resources/jobs'),
                fetch('http://localhost:8000/resources/cronjobs'),
                fetch('http://localhost:8000/resources/daemonsets')
            ]);

            if (!deploymentsResponse.ok || !statefulsetsResponse.ok || !jobsResponse.ok || !cronjobsResponse.ok || !daemonsetsResponse.ok) {
                throw new Error('Failed to fetch workloads');
            }

            const deployments = await deploymentsResponse.json();
            const statefulsets = await statefulsetsResponse.json();
            const jobs = await jobsResponse.json();
            const cronjobs = await cronjobsResponse.json();
            const daemonsets = await daemonsetsResponse.json();

            // Filter workloads with required pod anti-affinity and high replicas
            const podAntiAffinityResults = [...deployments, ...statefulsets, ...jobs, ...cronjobs, ...daemonsets]
                .filter(workload => {
                    const podAntiAffinity = workload.spec?.template?.spec?.affinity?.podAntiAffinity;
                    if (!podAntiAffinity) return false;
                    const hasRequiredAntiAffinity = podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution?.length > 0;
                    if (!hasRequiredAntiAffinity) return false;
                    const replicas = workload.spec?.replicas || 1;
                    const hpaMaxReplicas = workload.spec?.horizontalPodAutoscaler?.maxReplicas || replicas;
                    return replicas > 3 || hpaMaxReplicas > 3;
                })
                .map(workload => ({
                    kind: workload.kind,
                    name: workload.metadata.name,
                    namespace: workload.metadata.namespace,
                    components: ['podAntiAffinityHighReplicas'],
                    details: workload,
                    group: 'podAntiAffinity'
                }));

            // Filter workloads with missing memory requests
            const missingMemoryResults = [...deployments, ...statefulsets, ...jobs, ...cronjobs, ...daemonsets]
                .filter(workload => {
                    const containers = [
                        ...(workload.spec?.template?.spec?.containers || []),
                        ...(workload.spec?.template?.spec?.initContainers || [])
                    ];
                    return containers.some(container => !container.resources?.requests?.memory);
                })
                .map(workload => ({
                    kind: workload.kind,
                    name: workload.metadata.name,
                    namespace: workload.metadata.namespace,
                    components: ['missingMemoryRequests'],
                    details: workload,
                    group: 'missingMemory'
                }));

            // Filter workloads with hostname topology spread and high replicas
            const hostnameTopologyResults = [...deployments, ...statefulsets, ...jobs, ...cronjobs, ...daemonsets]
                .filter(workload => {
                    const constraints = workload.spec?.template?.spec?.topologySpreadConstraints;
                    if (!constraints) return false;
                    const hasHostnameTopologyWithDoNotSchedule = constraints.some(constraint => 
                        constraint.topologyKey === 'kubernetes.io/hostname' &&
                        constraint.whenUnsatisfiable === 'DoNotSchedule'
                    );
                    if (!hasHostnameTopologyWithDoNotSchedule) return false;
                    const replicas = workload.spec?.replicas || 1;
                    const hpaMaxReplicas = workload.spec?.horizontalPodAutoscaler?.maxReplicas || replicas;
                    return replicas > 3 || hpaMaxReplicas > 3;
                })
                .map(workload => ({
                    kind: workload.kind,
                    name: workload.metadata.name,
                    namespace: workload.metadata.namespace,
                    components: ['hostnameTopologySpread'],
                    details: workload,
                    group: 'hostnameTopology'
                }));

            // Combine all results
            const allResults = [
                ...pdbResults,
                ...podAntiAffinityResults,
                ...hostnameTopologyResults,
                ...missingMemoryResults,
                ...limitRangerPods
            ];

            setSEReportResults({
                matches: allResults,
                matchCount: allResults.length,
                totalResources: pdbs.length + deployments.length + statefulsets.length + jobs.length + cronjobs.length + daemonsets.length
            });
        } catch (err) {
            setError(`Search failed: ${err.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Group competition deployments by their parent name
    const groupedCompetition = defaultGroups.competition.reduce((acc, groupName) => {
        acc[groupName] = {
            name: groupName,
            deployment: null,
            isRunning: false,
            hasWarning: false,
            warningMessage: ''
        };
        return acc;
    }, {});

    // Add found deployments to the groups
    deployments.competition.forEach(deployment => {
        const parentName = deployment.metadata.name.split('-')[0];
        if (groupedCompetition[parentName]) {
            groupedCompetition[parentName].deployment = deployment;
            const isRunning = deployment.status.availableReplicas === deployment.spec.replicas;
            groupedCompetition[parentName].isRunning = isRunning;

            // Check Karpenter's batch duration settings
            if (parentName === 'karpenter') {
                const containers = deployment.spec.template.spec.containers || [];
                
                console.log('Karpenter deployment found:', deployment.metadata.name);
                console.log('Containers:', containers);
                
                // Check all containers for the environment variables
                const hasIncorrectDurations = containers.some(container => {
                    if (!container.env) return false;
                    
                    const maxDuration = container.env.find(env => env.name === 'BATCH_MAX_DURATION')?.value;
                    const idleDuration = container.env.find(env => env.name === 'BATCH_IDLE_DURATION')?.value;

                    console.log('Container env check:', { 
                        containerName: container.name,
                        maxDuration, 
                        idleDuration 
                    });

                    return maxDuration !== '600s' || idleDuration !== '600s';
                });

                if (hasIncorrectDurations) {
                    console.log('Setting warning for Karpenter');
                    groupedCompetition[parentName].hasWarning = true;
                    groupedCompetition[parentName].warningMessage = (
                        <div className="space-y-1">
                            <div className="flex items-start">
                                <span className="text-yellow-500 mr-2">•</span>
                                <a 
                                    href="https://docs.cast.ai/docs/minimize-impact#use-karpenter-as-fallback-autoscaler" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Batch durations are not set to recommended value (600s)
                                </a>
                            </div>
                        </div>
                    );
                }
            }
        }
    });

    // Group admission controllers by their parent name
    const groupedAdmissionControllers = defaultGroups.admissionControllers.reduce((acc, groupName) => {
        acc[groupName] = {
            name: groupName,
            deployment: null,
            isRunning: false
        };
        return acc;
    }, {});

    // Add found deployments to the groups
    deployments.admissionControllers.forEach(deployment => {
        const parentName = deployment.metadata.name.split('-')[0];
        if (groupedAdmissionControllers[parentName]) {
            groupedAdmissionControllers[parentName].deployment = deployment;
            const isRunning = deployment.status.availableReplicas === deployment.spec.replicas;
            groupedAdmissionControllers[parentName].isRunning = isRunning;
        }
    });

    const handleGroupClick = (groupName) => {
        onResourceSelect('pods', groupName.toLowerCase());
    };

    // Function to get Helm chart info for a component
    const getHelmChartInfo = (componentName) => {
        // Use the original component name as the key
        console.log('Looking up helm chart info for:', {
            componentName,
            helmChartData: helmCharts[componentName]
        });
        
        // Directly access the array using componentName as key
        const chartArray = helmCharts[componentName];
        if (chartArray && chartArray.length > 0) {
            // Get the first item from the array
            const firstItem = chartArray[0];
            console.log('Found matching helm chart:', {
                imageVersion: firstItem.imageVersion,
                helmChartVersion: firstItem.helmChartVersion
            });
            return {
                imageVersion: firstItem.imageVersion,
                helmChartVersion: firstItem.helmChartVersion
            };
        }
        console.log('No matching helm chart found for:', componentName);
        return null;
    };

    const toggleResultExpanded = async (index, result) => {
        // Toggle the expanded state
        const newExpandedState = !expandedResults[index];

        setExpandedResults(prev => ({
            ...prev,
            [index]: newExpandedState
        }));

        // If this is a group header (ends with '-group'), don't try to fetch details
        if (index.endsWith('-group')) {
            return;
        }

        // If expanding and we don't have details yet, fetch them
        if (newExpandedState && !resourceDetails[index]) {
            try {
                // For SE blockers report results, we already have the details
                if (result.details) {
                    setResourceDetails(prev => ({
                        ...prev,
                        [index]: result.details
                    }));
                    return;
                }
            } catch (err) {
                console.error('Error fetching resource details:', err);
                setError(`Failed to load details: ${err.message}`);
            } finally {
                setLoadingDetails(prev => ({
                    ...prev,
                    [index]: false
                }));
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-red-700">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* SE Report Results */}
            {seReportResults && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                            <Search className="w-6 h-6 text-blue-500 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-800">SE Blockers Report</h2>
                        </div>
                        <div className="text-sm text-gray-500">
                            Found {seReportResults.matchCount} potential issues
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* PDB Group */}
                        {(() => {
                            const pdbResults = seReportResults.matches.filter(result => result.group === 'pdb');
                            if (pdbResults.length > 0) {
                                return (
                                    <div className="bg-white rounded-md shadow-sm border overflow-visible">
                                        <button
                                            onClick={() => toggleResultExpanded('pdb-group', { kind: 'PodDisruptionBudget' })}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium">Non-Disruptable Pods</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                    {pdbResults.length} PDBs
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                    {pdbResults.reduce((sum, pdb) => sum + (pdb.details?.status?.currentHealthy || 0), 0)}/{pdbResults.reduce((sum, pdb) => sum + (pdb.details?.status?.desiredHealthy || 0), 0)} Unmoveable
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                {expandedResults['pdb-group'] ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                )}
                                            </div>
                                        </button>

                                        {expandedResults['pdb-group'] && (
                                            <div className="border-t">
                                                <div className="space-y-2 p-4">
                                                    {pdbResults.map((pdb, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => toggleResultExpanded(`pdb-${index}`, pdb)}
                                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className="font-medium">{pdb.name}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{pdb.namespace}</span>
                                                                    <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                                        {pdb.details?.status?.currentHealthy || 0}/{pdb.details?.status?.desiredHealthy || 0} Unmoveable
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {expandedResults[`pdb-${index}`] ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {expandedResults[`pdb-${index}`] && (
                                                                <div className="border-t bg-white p-3">
                                                                    <div className="text-sm">
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Namespace:</span> {pdb.namespace}
                                                                        </div>
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Spec:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(pdb.details.spec, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">Status:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(pdb.details.status, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* LimitRanger Group */}
                        {(() => {
                            const limitRangerResults = seReportResults.matches.filter(result => result.group === 'limitRanger');
                            if (limitRangerResults.length > 0) {
                                return (
                                    <div className="bg-white rounded-md shadow-sm border overflow-visible">
                                        <button
                                            onClick={() => toggleResultExpanded('limitRanger-group', { kind: 'LimitRanger' })}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium">LimitRanger Annotated Pods</span>
                                                <span className="text-xs bg-red-100 px-2 py-0.5 rounded ml-2 text-red-800">
                                                    {limitRangerResults.length} Pods
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                {expandedResults['limitRanger-group'] ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                )}
                                            </div>
                                        </button>
                                        {expandedResults['limitRanger-group'] && (
                                            <div className="border-t">
                                                <div className="space-y-2 p-4">
                                                    {limitRangerResults.map((pod, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => toggleResultExpanded(`limitRanger-${index}`, pod)}
                                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className="font-medium">{pod.name}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{pod.namespace}</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {expandedResults[`limitRanger-${index}`] ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {expandedResults[`limitRanger-${index}`] && (
                                                                <div className="border-t bg-white p-3">
                                                                    <div className="text-sm">
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Annotations:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(pod.details.metadata.annotations, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">Spec:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(pod.details.spec, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}                        

                        {/* Pod Anti-Affinity Group */}
                        {(() => {
                            const podAntiAffinityResults = seReportResults.matches.filter(result => result.group === 'podAntiAffinity');
                            if (podAntiAffinityResults.length > 0) {
                                return (
                                    <div className="bg-white rounded-md shadow-sm border overflow-visible">
                                        <button
                                            onClick={() => toggleResultExpanded('podAntiAffinity-group', { kind: 'PodAntiAffinity' })}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium">High Replica Pod Anti-Affinities</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                    {podAntiAffinityResults.length} Workloads
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                    {podAntiAffinityResults.reduce((sum, workload) => {
                                                        const replicas = workload.details?.spec?.replicas || 1;
                                                        const hpaMaxReplicas = workload.details?.spec?.horizontalPodAutoscaler?.maxReplicas || replicas;
                                                        return sum + Math.max(replicas, hpaMaxReplicas);
                                                    }, 0)} Total Replicas
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                {expandedResults['podAntiAffinity-group'] ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                )}
                                            </div>
                                        </button>

                                        {expandedResults['podAntiAffinity-group'] && (
                                            <div className="border-t">
                                                <div className="space-y-2 p-4">
                                                    {podAntiAffinityResults.map((workload, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => toggleResultExpanded(`podAntiAffinity-${index}`, workload)}
                                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className="font-medium">{workload.name}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{workload.namespace}</span>
                                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                                        {workload.kind}
                                                                    </span>
                                                                    <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                                        {workload.details?.spec?.replicas || 1} Replicas
                                                                        {workload.details?.spec?.horizontalPodAutoscaler?.maxReplicas && 
                                                                            ` (HPA max: ${workload.details.spec.horizontalPodAutoscaler.maxReplicas})`
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {expandedResults[`podAntiAffinity-${index}`] ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {expandedResults[`podAntiAffinity-${index}`] && (
                                                                <div className="border-t bg-white p-3">
                                                                    <div className="text-sm">
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Pod Anti-Affinity:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(workload.details.spec.template.spec.affinity.podAntiAffinity, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">Status:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(workload.details.status, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Missing Memory Requests Group */}
                        {(() => {
                            const missingMemoryResults = seReportResults.matches.filter(result => result.group === 'missingMemory');
                            if (missingMemoryResults.length > 0) {
                                return (
                                    <div className="bg-white rounded-md shadow-sm border overflow-visible">
                                        <button
                                            onClick={() => toggleResultExpanded('missingMemory-group', { kind: 'MissingMemory' })}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium">Missing Memory Requests</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                    {missingMemoryResults.length} Workloads
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                    {missingMemoryResults.reduce((sum, workload) => {
                                                        const containers = [
                                                            ...(workload.details?.spec?.template?.spec?.containers || []),
                                                            ...(workload.details?.spec?.template?.spec?.initContainers || [])
                                                        ];
                                                        return sum + containers.filter(c => !c.resources?.requests?.memory).length;
                                                    }, 0)} Containers Missing Memory Requests
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                {expandedResults['missingMemory-group'] ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                )}
                                            </div>
                                        </button>

                                        {expandedResults['missingMemory-group'] && (
                                            <div className="border-t">
                                                <div className="space-y-2 p-4">
                                                    {missingMemoryResults.map((workload, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => toggleResultExpanded(`missingMemory-${index}`, workload)}
                                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className="font-medium">{workload.name}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{workload.namespace}</span>
                                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                                        {workload.kind}
                                                                    </span>
                                                                    <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                                        {(() => {
                                                                            const containers = [
                                                                                ...(workload.details?.spec?.template?.spec?.containers || []),
                                                                                ...(workload.details?.spec?.template?.spec?.initContainers || [])
                                                                            ];
                                                                            const missingCount = containers.filter(c => !c.resources?.requests?.memory).length;
                                                                            return `${missingCount}/${containers.length} Containers Missing Memory Requests`;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {expandedResults[`missingMemory-${index}`] ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {expandedResults[`missingMemory-${index}`] && (
                                                                <div className="border-t bg-white p-3">
                                                                    <div className="text-sm">
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Containers:</span>
                                                                            {[
                                                                                ...(workload.details.spec?.template?.spec?.containers || []),
                                                                                ...(workload.details.spec?.template?.spec?.initContainers || [])
                                                                            ].map((container, containerIndex) => (
                                                                                <div key={containerIndex} className={`mt-2 p-2 rounded ${container.resources?.requests?.memory ? 'bg-green-50' : 'bg-red-50'}`}>
                                                                                    <div className="flex items-center mb-1">
                                                                                        <span className="font-medium">{container.name}</span>
                                                                                        {container.resources?.requests?.memory ? (
                                                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded ml-2">
                                                                                                Has Memory Requests
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded ml-2">
                                                                                                Missing Memory Requests
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {container.resources && (
                                                                                        <>
                                                                                            {container.resources.requests && (
                                                                                                <div className="text-xs">
                                                                                                    <span className="font-medium">Requests:</span>
                                                                                                    <pre className="mt-1 bg-white p-1 rounded">
                                                                                                        {JSON.stringify(container.resources.requests, null, 2)}
                                                                                                    </pre>
                                                                                                </div>
                                                                                            )}
                                                                                            {container.resources.limits && (
                                                                                                <div className="text-xs mt-1">
                                                                                                    <span className="font-medium">Limits:</span>
                                                                                                    <pre className="mt-1 bg-white p-1 rounded">
                                                                                                        {JSON.stringify(container.resources.limits, null, 2)}
                                                                                                    </pre>
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Hostname Topology Spread Group */}
                        {(() => {
                            const hostnameTopologyResults = seReportResults.matches.filter(result => result.group === 'hostnameTopology');
                            if (hostnameTopologyResults.length > 0) {
                                return (
                                    <div className="bg-white rounded-md shadow-sm border overflow-visible">
                                        <button
                                            onClick={() => toggleResultExpanded('hostnameTopology-group', { kind: 'HostnameTopology' })}
                                            className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 focus:outline-none"
                                        >
                                            <div className="flex items-center">
                                                <span className="font-medium">Hostname Topology Spread with High Replicas</span>
                                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                    {hostnameTopologyResults.length} Workloads
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                    {hostnameTopologyResults.reduce((sum, workload) => {
                                                        const replicas = workload.details?.spec?.replicas || 1;
                                                        const hpaMaxReplicas = workload.details?.spec?.horizontalPodAutoscaler?.maxReplicas || replicas;
                                                        return sum + Math.max(replicas, hpaMaxReplicas);
                                                    }, 0)} Total Replicas
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                {expandedResults['hostnameTopology-group'] ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                )}
                                            </div>
                                        </button>

                                        {expandedResults['hostnameTopology-group'] && (
                                            <div className="border-t">
                                                <div className="space-y-2 p-4">
                                                    {hostnameTopologyResults.map((workload, index) => (
                                                        <div key={index} className="bg-gray-50 rounded-md overflow-hidden">
                                                            <button
                                                                onClick={() => toggleResultExpanded(`hostnameTopology-${index}`, workload)}
                                                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 focus:outline-none"
                                                            >
                                                                <div className="flex items-center">
                                                                    <span className="font-medium">{workload.name}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">{workload.namespace}</span>
                                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                                                        {workload.kind}
                                                                    </span>
                                                                    <span className="text-xs px-2 py-0.5 rounded ml-2 bg-red-100 text-red-800">
                                                                        {workload.details?.spec?.replicas || 1} Replicas
                                                                        {workload.details?.spec?.horizontalPodAutoscaler?.maxReplicas && 
                                                                            ` (HPA max: ${workload.details.spec.horizontalPodAutoscaler.maxReplicas})`
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    {expandedResults[`hostnameTopology-${index}`] ? (
                                                                        <ChevronDown className="w-4 h-4 text-gray-500"/>
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-gray-500"/>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {expandedResults[`hostnameTopology-${index}`] && (
                                                                <div className="border-t bg-white p-3">
                                                                    <div className="text-sm">
                                                                        <div className="mb-2">
                                                                            <span className="font-medium">Topology Spread Constraints:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(workload.details.spec.template.spec.topologySpreadConstraints, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">Status:</span>
                                                                            <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                                                                                {JSON.stringify(workload.details.status, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}

            {/* Original Insights Content */}
            <div className="grid grid-cols-2 gap-6">
                {/* Cast AI Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-6">
                        <Cpu className="w-6 h-6 text-blue-500 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-800">Cast AI</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {deployments.castai.map((deployment) => {
                            const isRunning = deployment.status.availableReplicas === deployment.spec.replicas;
                            const helmInfo = getHelmChartInfo(deployment.metadata.name);
                            console.log('Deployment:', {
                                name: deployment.metadata.name,
                                helmInfo
                            });
                            return (
                                <div 
                                    key={deployment.metadata.name} 
                                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleGroupClick(deployment.metadata.name)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium">{deployment.metadata.name.toLowerCase()}</h3>
                                            <div className="text-sm text-gray-500">
                                                {deployment.spec.template.spec.containers[0].image}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {deployment.status.availableReplicas || 0}/{deployment.spec.replicas} replicas
                                            </div>
                                            {helmInfo && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    <div className="font-medium">Remote versions:</div>
                                                    <ul className="list-disc list-inside">
                                                        <li>Image: {helmInfo.imageVersion}</li>
                                                        <li>Chart: {helmInfo.helmChartVersion}</li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center">
                                            {isRunning ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Competition Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center mb-6">
                            <Package className="w-6 h-6 text-gray-600 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-800">3rd Party</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {Object.values(groupedCompetition).map((group) => (
                                <div 
                                    key={group.name} 
                                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleGroupClick(group.name)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">{group.name.toLowerCase()}</h3>
                                                {group.hasWarning && (
                                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            {group.hasWarning && (
                                                <div className="text-sm text-yellow-700 mt-1">
                                                    {group.warningMessage}
                                                </div>
                                            )}
                                            <div className="text-sm text-gray-500">
                                                {group.deployment ? (
                                                    `${group.deployment.status.availableReplicas || 0}/${group.deployment.spec.replicas} replicas`
                                                ) : (
                                                    'Not found'
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {group.isRunning ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Admission Controllers Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center mb-6">
                            <Octagon className="w-6 h-6 text-red-500 mr-2" />
                            <h2 className="text-xl font-semibold text-gray-800">3rd Party Webhooks</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {Object.values(groupedAdmissionControllers).map((group) => (
                                <div 
                                    key={group.name} 
                                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleGroupClick(group.name)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium">{group.name.toLowerCase()}</h3>
                                            <div className="text-sm text-gray-500">
                                                {group.deployment ? (
                                                    `${group.deployment.status.availableReplicas || 0}/${group.deployment.spec.replicas} replicas`
                                                ) : (
                                                    'Not found'
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {group.isRunning ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightsView; 