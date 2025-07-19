import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { NodeDetailsTable, NetworkDetailsTable, TaintsTable, CapacityTable, ConditionsTable, MetadataTable, ImagesTable, NodePodsTable } from './NodeDetailsTables';
import YamlViewer from './YamlViewer';

// Add new ProblemsTable component
const ProblemsTable = ({ node, problematicNodes }) => {
    const nodeProblems = problematicNodes?.nodes?.find(n => n.name === node.metadata.name);

    if (!problematicNodes) {
        return (
            <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
                No problems data available
            </div>
        );
    }

    if (!nodeProblems) {
        return (
            <div className="bg-white rounded-lg p-4 text-green-600 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>No problems detected for this node</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <div className="p-4 bg-red-50 border-b">
                <h3 className="text-lg font-medium text-red-700">Current Problems</h3>
            </div>
            <div className="p-4">
                <ul className="space-y-2">
                    {nodeProblems.problems.map((problem, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-2 text-red-600"
                        >
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{problem}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const NodeDetails = ({ items = [], handleResourceSelect }) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [nodePodCounts, setNodePodCounts] = useState({});

  // Function to format memory from bytes to GiBs
  const formatMemory = (memoryString) => {
    if (!memoryString) return 'N/A';
    
    console.log('Raw memory value:', memoryString);
    
    // Remove any whitespace and convert to lowercase for consistent handling
    const memory = memoryString.trim().toLowerCase();
    console.log('Trimmed memory value:', memory);
    
    // Extract the numeric value and unit using Kubernetes unit format
    const match = memory.match(/^(\d+)([kmg]i)?$/);
    console.log('Regex match:', match);
    
    if (!match) return memoryString; // Return original if format is unexpected
    
    const [, value, unit] = match;
    const numericValue = parseInt(value);
    console.log('Parsed numeric value:', numericValue);
    console.log('Unit:', unit);
    
    // Convert to GiB based on the unit
    let gibs;
    switch (unit) {
      case 'ki':
        gibs = numericValue / (1024 * 1024);
        break;
      case 'mi':
        gibs = numericValue / 1024;
        break;
      case 'gi':
        gibs = numericValue;
        break;
      default: // If no unit specified, assume bytes
        gibs = numericValue / (1024 * 1024 * 1024);
    }
    
    console.log('Final GiB value:', gibs);
    return `${gibs.toFixed(1)} GiB`;
  };

  useEffect(() => {
    // Listen for custom events to navigate to pod details
    const handleNavigateToPodDetails = (event) => {
      const { podName } = event.detail;
      if (podName && handleResourceSelect) {
        handleResourceSelect('pods', podName);
      }
    };

    window.addEventListener('navigateToPodDetails', handleNavigateToPodDetails);
    
    return () => {
      window.removeEventListener('navigateToPodDetails', handleNavigateToPodDetails);
    };
  }, []);

  // Fetch pod counts for all nodes
  useEffect(() => {
    const fetchNodePods = async () => {
      try {
        const response = await fetch('http://localhost:8000/reports/node-pods');
        if (!response.ok) {
          throw new Error(`Failed to fetch node pods: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Create a map of node names to pod counts
        const podCounts = {};
        Object.entries(data).forEach(([nodeName, pods]) => {
          podCounts[nodeName] = pods.length;
        });
        
        setNodePodCounts(podCounts);
      } catch (err) {
        console.error('Error fetching node pods:', err);
      }
    };

    fetchNodePods();
  }, []);

  const toggleNode = (nodeIndex) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeIndex]: !prev[nodeIndex]
    }));
  };

  const getActiveTab = (nodeIndex) => {
    return activeTab[nodeIndex] || 'details';
  };

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No node details available
      </div>
    );
  }

  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'details', label: 'Details' },
    { id: 'network', label: 'Network' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'pods', label: 'Pods' },
    { id: 'problems', label: 'Problems' },
    { id: 'taints', label: 'Taints' },
    { id: 'images', label: 'Images' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  return (
    <div className="space-y-4">
      {items.map((node, nodeIndex) => (
        <div key={nodeIndex} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleNode(nodeIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{node?.metadata?.name || 'Unnamed Node'}</h3>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {nodePodCounts[node?.metadata?.name] || 0} / {node?.status?.capacity?.['pods'] || '?'} pods
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  node?.metadata?.labels?.['provisioner.cast.ai/managed-by'] === 'cast.ai'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {node?.metadata?.labels?.['provisioner.cast.ai/managed-by'] === 'cast.ai' ? 'cast.ai' : '3rd party'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-gray-500">
                  {node?.status?.nodeInfo?.kubeletVersion || 'Version not available'}
                </p>
                <span className="text-sm text-gray-500">•</span>
                <p className="text-sm text-gray-500">
                  {node?.metadata?.labels?.['node.kubernetes.io/instance-type'] || 'Instance type not available'}
                  {node?.metadata?.labels?.['kubernetes.io/arch'] && ` (${node.metadata.labels['kubernetes.io/arch']})`}
                </p>
                <span className="text-sm text-gray-500">•</span>
                <p className="text-sm text-gray-500">
                  CPU: {node?.status?.capacity?.['cpu'] || 'N/A'} | Memory: {formatMemory(node?.status?.capacity?.['memory'])}
                </p>
              </div>
            </div>
            {expandedNodes[nodeIndex] ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {expandedNodes[nodeIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [nodeIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(nodeIndex) === tab.id
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
                {getActiveTab(nodeIndex) === 'yaml' && <YamlViewer data={node} />}
                {getActiveTab(nodeIndex) === 'details' && <NodeDetailsTable node={node} />}
                {getActiveTab(nodeIndex) === 'network' && <NetworkDetailsTable node={node} />}
                {getActiveTab(nodeIndex) === 'capacity' && <CapacityTable node={node} />}
                {getActiveTab(nodeIndex) === 'conditions' && <ConditionsTable node={node} />}
                {getActiveTab(nodeIndex) === 'pods' && <NodePodsTable node={node} />}
                {getActiveTab(nodeIndex) === 'taints' && <TaintsTable node={node} />}
                {getActiveTab(nodeIndex) === 'images' && <ImagesTable node={node} />}
                {getActiveTab(nodeIndex) === 'labels' && (
                  <MetadataTable metadata={node?.metadata?.labels} title="Labels" />
                )}
                {getActiveTab(nodeIndex) === 'annotations' && (
                  <MetadataTable metadata={node?.metadata?.annotations} title="Annotations" />
                )}
                {getActiveTab(nodeIndex) === 'problems' && <ProblemsTable node={node} />}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NodeDetails;