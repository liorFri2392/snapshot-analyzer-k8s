import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import YamlViewer from './YamlViewer';

const DeploymentStatus = ({ status }) => {
  const getStatusColor = (available, progressing) => {
    if (available?.status === 'True') return 'text-green-600 bg-green-50';
    if (progressing?.status === 'True') return 'text-blue-600 bg-blue-50';
    if (available?.status === 'False') return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getStatusText = (available, progressing) => {
    if (available?.status === 'True') return 'Available';
    if (available?.status === 'False') return 'Not Available';
    if (progressing?.status === 'True') return 'Progressing';
    return 'Unknown';
  };

  const availableCondition = status.conditions?.find(c => c.type === 'Available');
  const progressingCondition = status.conditions?.find(c => c.type === 'Progressing');
  const statusColor = getStatusColor(availableCondition, progressingCondition);
  const statusText = getStatusText(availableCondition, progressingCondition);

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${statusColor}`}>
        {statusText}
      </span>
      <span className="text-sm text-gray-500">
        {status.replicas} / {status.readyReplicas || 0} ready
      </span>
    </div>
  );
};

const DeploymentDetails = ({ items = [] }) => {
  const [expandedDeployments, setExpandedDeployments] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
    status: '',
    hasLabels: 'any'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const deploymentsPerPage = 100;

  // Extract unique namespaces and statuses
  const namespaces = [...new Set(items.map(deployment => deployment.metadata.namespace))].sort();

  // Filter and paginate deployments
// Filter and paginate deployments
const filteredDeployments = useMemo(() => {
  return items.filter(deployment => {
    const matchNamespace = !filters.namespace ||
      deployment.metadata.namespace === filters.namespace;
    
    const matchSearch = !filters.search ||
      deployment.metadata.name.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchLabels = filters.hasLabels === 'any' ||
      (filters.hasLabels === 'hasLabels' &&
        deployment.metadata.labels &&
        Object.keys(deployment.metadata.labels).length > 0) ||
      (filters.hasLabels === 'noLabels' &&
        (!deployment.metadata.labels ||
        Object.keys(deployment.metadata.labels).length === 0));
    
    // Updated status matching logic
    let matchStatus = true;
    if (filters.status) {
      if (filters.status === 'Available') {
        // Check for Available = True
        matchStatus = deployment.status.conditions?.some(c => 
          c.type === 'Available' && c.status === 'True');
      } else if (filters.status === 'Progressing') {
        // Check for Progressing = True
        matchStatus = deployment.status.conditions?.some(c => 
          c.type === 'Progressing' && c.status === 'True');
      } else if (filters.status === 'Not Available') {
        // Check for Available = False
        matchStatus = deployment.status.conditions?.some(c => 
          c.type === 'Available' && c.status === 'False');
      }
    }

    return matchNamespace && matchSearch && matchLabels && matchStatus;
  });
}, [items, filters]);

  // Paginate filtered deployments
  const paginatedDeployments = useMemo(() => {
    const startIndex = (currentPage - 1) * deploymentsPerPage;
    return filteredDeployments.slice(startIndex, startIndex + deploymentsPerPage);
  }, [filteredDeployments, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDeployments.length / deploymentsPerPage);

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

  const toggleDeployment = (deploymentIndex) => {
    setExpandedDeployments(prev => ({
      ...prev,
      [deploymentIndex]: !prev[deploymentIndex]
    }));
  };

  const getActiveTab = (deploymentIndex) => {
    return activeTab[deploymentIndex] || 'details';
  };

  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'details', label: 'Details' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'spec', label: 'Spec' },
    { id: 'containers', label: 'Containers' },
    { id: 'volumes', label: 'Volumes' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' },
    { id: 'topology', label: 'Topology' },
    { id: 'security', label: 'Security' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No deployment details available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full border rounded-md py-2 px-3"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Progressing">Progressing</option>
            <option value="Not Available">Not Available</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
          <select
            className="w-full border rounded-md py-2 px-3"
            value={filters.hasLabels}
            onChange={(e) => handleFilterChange('hasLabels', e.target.value)}
          >
            <option value="any">Any</option>
            <option value="hasLabels">Has Labels</option>
            <option value="noLabels">No Labels</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            className="w-full border rounded-md py-2 px-3"
            placeholder="Search deployments..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedDeployments.length} of {filteredDeployments.length} deployments
      </div>

      {/* Deployment List */}
      {paginatedDeployments.map((deployment, deploymentIndex) => (
        <div key={deployment.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleDeployment(deploymentIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{deployment.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {deployment.metadata.namespace}
                  </p>
                </div>
                <DeploymentStatus status={deployment.status} />
              </div>
            </div>
            {expandedDeployments[deploymentIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedDeployments[deploymentIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [deploymentIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(deploymentIndex) === tab.id
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
                {getActiveTab(deploymentIndex) === 'yaml' && (
                  <YamlViewer data={deployment} />
                )}
                {getActiveTab(deploymentIndex) === 'details' && (
                  <DeploymentStatusTable status={deployment.status} />
                )}

                {getActiveTab(deploymentIndex) === 'metadata' && (
                  <DeploymentMetadataTable metadata={deployment.metadata} />
                )}

                {getActiveTab(deploymentIndex) === 'spec' && (
                  <DeploymentSpecTable spec={deployment.spec} />
                )}

                {getActiveTab(deploymentIndex) === 'containers' && (
                  <>
                    {deployment.spec.template.spec.initContainers && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-4">Init Containers</h3>
                        <ContainersList
                          containers={deployment.spec.template.spec.initContainers}
                          type="Init Container"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Containers</h3>
                      <ContainersList
                        containers={deployment.spec.template.spec.containers}
                      />
                    </div>
                  </>
                )}

                {getActiveTab(deploymentIndex) === 'volumes' && (
                  <VolumesList volumes={deployment.spec.template.spec.volumes} />
                )}

                {getActiveTab(deploymentIndex) === 'conditions' && (
                  <DeploymentConditionsTable conditions={deployment.status.conditions} />
                )}

                {getActiveTab(deploymentIndex) === 'labels' && (
                  <MetadataTable metadata={deployment.metadata.labels} title="Labels" />
                )}

                {getActiveTab(deploymentIndex) === 'annotations' && (
                  <MetadataTable metadata={deployment.metadata.annotations} title="Annotations" />
                )}

                {getActiveTab(deploymentIndex) === 'topology' && (
                  <div className="space-y-6">
                    {deployment.spec.template.spec.topologySpreadConstraints && (
                      <div className="bg-white rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-4">Topology Spread Constraints</h3>
                        <div className="space-y-4">
                          {deployment.spec.template.spec.topologySpreadConstraints.map((constraint, idx) => (
                            <div key={idx} className="border rounded p-4">
                              <table className="w-full">
                                <tbody>
                                  <tr>
                                    <td className="py-1 pr-4 font-medium">Max Skew</td>
                                    <td>{constraint.maxSkew}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1 pr-4 font-medium">Topology Key</td>
                                    <td>{constraint.topologyKey}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1 pr-4 font-medium">When Unsatisfiable</td>
                                    <td>{constraint.whenUnsatisfiable}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1 pr-4 font-medium">Label Selector</td>
                                    <td>
                                      {constraint.labelSelector.matchLabels && (
                                        <div className="space-x-2">
                                          {Object.entries(constraint.labelSelector.matchLabels).map(([key, value]) => (
                                            <span key={key} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                                              {key}={value}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {deployment.spec.template.spec.affinity && (
                      <div className="bg-white rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-4">Affinity Rules</h3>
                        <pre className="bg-gray-50 p-4 rounded overflow-auto">
                          {JSON.stringify(deployment.spec.template.spec.affinity, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {getActiveTab(deploymentIndex) === 'security' && (
                  <div className="space-y-6">
                    {deployment.spec.template.spec.securityContext && (
                      <div className="bg-white rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-4">Pod Security Context</h3>
                        <table className="w-full">
                          <tbody>
                            {Object.entries(deployment.spec.template.spec.securityContext).map(([key, value]) => (
                              <tr key={key}>
                                <td className="py-1 pr-4 font-medium">{key}</td>
                                <td>{JSON.stringify(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {deployment.spec.template.spec.serviceAccountName && (
                      <div className="bg-white rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-4">Service Account</h3>
                        <table className="w-full">
                          <tbody>
                            <tr>
                              <td className="py-1 pr-4 font-medium">Name</td>
                              <td>{deployment.spec.template.spec.serviceAccountName}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-4 font-medium">Automount Service Account Token</td>
                              <td>{String(deployment.spec.template.spec.automountServiceAccountToken !== false)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
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
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded disabled:opacity-50"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const MetadataTable = ({ metadata }) => {
  const metadataEntries = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
    { label: 'UID', value: metadata.uid },
    { label: 'Resource Version', value: metadata.resourceVersion },
    { label: 'Generation', value: metadata.generation },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Property</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {metadataEntries.map(({ label, value }) => (
              <tr key={label} className="border-t">
                <td className="py-2 px-3 font-medium">{label}</td>
                <td className="py-2 px-3 break-all">{value || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



// Basic detail components for Deployment metadata and spec
const DeploymentMetadataTable = ({ metadata }) => {
  const metadataEntries = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
    { label: 'UID', value: metadata.uid },
    { label: 'Resource Version', value: metadata.resourceVersion },
    { label: 'Generation', value: metadata.generation },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Property</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {metadataEntries.map(({ label, value }) => (
              <tr key={label} className="border-t">
                <td className="py-2 px-3 font-medium">{label}</td>
                <td className="py-2 px-3 break-all">{value || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeploymentSpecTable = ({ spec }) => {
  const specDetails = [
    { label: 'Replicas', value: spec.replicas },
    { label: 'Revision History Limit', value: spec.revisionHistoryLimit },
    { label: 'Progress Deadline Seconds', value: spec.progressDeadlineSeconds },
    {
      label: 'Strategy Type',
      value: `${spec.strategy.type} (maxSurge: ${spec.strategy.rollingUpdate?.maxSurge}, maxUnavailable: ${spec.strategy.rollingUpdate?.maxUnavailable})`
    }
  ];

  const selector = spec.selector?.matchLabels || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Basic Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            {specDetails.map(({ label, value }) => (
              <tr key={label} className="border-t">
                <td className="py-2 px-3 font-medium">{label}</td>
                <td className="py-2 px-3 break-all">{value || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Selector</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Key</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(selector).map(([key, value]) => (
              <tr key={key} className="border-t">
                <td className="py-2 px-3">{key}</td>
                <td className="py-2 px-3 break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeploymentConditionsTable = ({ conditions = [] }) => {
  if (!conditions.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No conditions found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Last Update</th>
              <th className="py-2 px-3 font-medium">Last Transition</th>
              <th className="py-2 px-3 font-medium">Reason</th>
              <th className="py-2 px-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {conditions.map((condition, index) => (
              <tr key={index} className="border-t">
                <td className="py-2 px-3">{condition.type}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium
                    ${condition.status === 'True' 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-red-600 bg-red-50'}`}>
                    {condition.status}
                  </span>
                </td>
                <td className="py-2 px-3">{condition.lastUpdateTime}</td>
                <td className="py-2 px-3">{condition.lastTransitionTime}</td>
                <td className="py-2 px-3">{condition.reason}</td>
                <td className="py-2 px-3">{condition.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeploymentStatusTable = ({ status }) => {
  const statusDetails = [
    { label: 'Observed Generation', value: status.observedGeneration },
    { label: 'Total Replicas', value: status.replicas },
    { label: 'Updated Replicas', value: status.updatedReplicas },
    { label: 'Ready Replicas', value: status.readyReplicas },
    { label: 'Available Replicas', value: status.availableReplicas },
    { label: 'Unavailable Replicas', value: status.unavailableReplicas }
  ];

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Metric</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {statusDetails.map(({ label, value }) => (
            <tr key={label} className="border-t">
              <td className="py-2 px-3 font-medium">{label}</td>
              <td className="py-2 px-3">{value ?? 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProbeDetails = ({ probe, type }) => {
  if (!probe) return null;

  return (
    <div className="bg-gray-50 p-3 rounded">
      <h5 className="font-medium mb-2">{type} Probe</h5>
      <table className="w-full text-sm">
        <tbody>
          {probe.httpGet && (
            <>
              <tr>
                <td className="py-1 pr-4 font-medium">HTTP Path</td>
                <td className="py-1">{probe.httpGet.path}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 font-medium">Port</td>
                <td className="py-1">{probe.httpGet.port}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 font-medium">Scheme</td>
                <td className="py-1">{probe.httpGet.scheme}</td>
              </tr>
            </>
          )}
          {probe.tcpSocket && (
            <tr>
              <td className="py-1 pr-4 font-medium">TCP Port</td>
              <td className="py-1">{probe.tcpSocket.port}</td>
            </tr>
          )}
          {probe.exec && (
            <tr>
              <td className="py-1 pr-4 font-medium">Command</td>
              <td className="py-1">{probe.exec.command.join(' ')}</td>
            </tr>
          )}
          <tr>
            <td className="py-1 pr-4 font-medium">Initial Delay</td>
            <td className="py-1">{probe.initialDelaySeconds}s</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-medium">Period</td>
            <td className="py-1">{probe.periodSeconds}s</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-medium">Timeout</td>
            <td className="py-1">{probe.timeoutSeconds}s</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-medium">Success Threshold</td>
            <td className="py-1">{probe.successThreshold}</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-medium">Failure Threshold</td>
            <td className="py-1">{probe.failureThreshold}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// const ContainersList = ({ containers, type = "Container" }) => {
//   if (!containers?.length) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
//         No {type.toLowerCase()}s found
//       </div>
//     );
//   }
//
//   return (
//     <div className="space-y-6">
//       {containers.map((container, index) => (
//         <div key={index} className="bg-white rounded-lg border">
//           <div className="p-4 border-b bg-gray-50">
//             <h3 className="text-lg font-medium">{container.name}</h3>
//           </div>
//
//           <div className="divide-y">
//             {/* Basic Info */}
//             <div className="p-4">
//               <h4 className="font-medium mb-2">Basic Information</h4>
//               <table className="w-full">
//                 <tbody>
//                   <tr>
//                     <td className="py-1 pr-4 font-medium">Image</td>
//                     <td className="py-1">{container.image}</td>
//                   </tr>
//                   <tr>
//                     <td className="py-1 pr-4 font-medium">Image Pull Policy</td>
//                     <td className="py-1">{container.imagePullPolicy}</td>
//                   </tr>
//                   {container.command && (
//                     <tr>
//                       <td className="py-1 pr-4 font-medium">Command</td>
//                       <td className="py-1 font-mono text-sm">
//                         {container.command.join(' ')}
//                       </td>
//                     </tr>
//                   )}
//                   {container.args && (
//                     <tr>
//                       <td className="py-1 pr-4 font-medium">Args</td>
//                       <td className="py-1 font-mono text-sm">
//                         {container.args.join(' ')}
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//
//             {/* Resources */}
//             {(container.resources?.requests || container.resources?.limits) && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Resources</h4>
//                 <div className="grid grid-cols-2 gap-4">
//                   {container.resources.requests && (
//                     <div>
//                       <h5 className="text-sm font-medium text-gray-500 mb-1">Requests</h5>
//                       <table className="w-full">
//                         <tbody>
//                           {Object.entries(container.resources.requests).map(([resource, value]) => (
//                             <tr key={resource}>
//                               <td className="py-1 pr-4 font-medium">{resource}</td>
//                               <td className="py-1">{value}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//
//                   {container.resources.limits && (
//                     <div>
//                       <h5 className="text-sm font-medium text-gray-500 mb-1">Limits</h5>
//                       <table className="w-full">
//                         <tbody>
//                           {Object.entries(container.resources.limits).map(([resource, value]) => (
//                             <tr key={resource}>
//                               <td className="py-1 pr-4 font-medium">{resource}</td>
//                               <td className="py-1">{value}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//
//             {/* Ports */}
//             {container.ports?.length > 0 && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Ports</h4>
//                 <table className="w-full">
//                   <thead>
//                     <tr className="text-left text-sm font-medium text-gray-500">
//                       <th className="pr-4">Name</th>
//                       <th className="pr-4">Container Port</th>
//                       <th className="pr-4">Protocol</th>
//                       <th>Host Port</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {container.ports.map((port, portIndex) => (
//                       <tr key={portIndex}>
//                         <td className="py-1 pr-4">{port.name || '-'}</td>
//                         <td className="py-1 pr-4">{port.containerPort}</td>
//                         <td className="py-1 pr-4">{port.protocol}</td>
//                         <td className="py-1">{port.hostPort || '-'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//
//             {/* Environment Variables */}
//             {container.env?.length > 0 && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Environment Variables</h4>
//                 <table className="w-full">
//                   <thead>
//                     <tr className="text-left text-sm font-medium text-gray-500">
//                       <th className="pr-4">Name</th>
//                       <th>Value/Source</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {container.env.map((env, envIndex) => (
//                       <tr key={envIndex}>
//                         <td className="py-1 pr-4 font-medium">{env.name}</td>
//                         <td className="py-1">
//                           {env.value && (
//                             <span className="break-all">{env.value}</span>
//                           )}
//                           {env.valueFrom && (
//                             <div className="text-sm text-gray-500">
//                               {Object.entries(env.valueFrom).map(([key, value]) => (
//                                 <div key={key}>
//                                   {key}: {JSON.stringify(value)}
//                                 </div>
//                               ))}
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//
//             {/* Volume Mounts */}
//             {container.volumeMounts?.length > 0 && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Volume Mounts</h4>
//                 <table className="w-full">
//                   <thead>
//                     <tr className="text-left text-sm font-medium text-gray-500">
//                       <th className="pr-4">Name</th>
//                       <th className="pr-4">Mount Path</th>
//                       <th className="pr-4">Read Only</th>
//                       <th>Sub Path</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {container.volumeMounts.map((mount, mountIndex) => (
//                       <tr key={mountIndex}>
//                         <td className="py-1 pr-4">{mount.name}</td>
//                         <td className="py-1 pr-4">{mount.mountPath}</td>
//                         <td className="py-1 pr-4">{mount.readOnly ? 'Yes' : 'No'}</td>
//                         <td className="py-1">{mount.subPath || '-'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//
//             {/* Probes */}
//             {(container.livenessProbe || container.readinessProbe || container.startupProbe) && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Probes</h4>
//                 <div className="space-y-4">
//                   {container.livenessProbe && (
//                     <ProbeDetails probe={container.livenessProbe} type="Liveness" />
//                   )}
//                   {container.readinessProbe && (
//                     <ProbeDetails probe={container.readinessProbe} type="Readiness" />
//                   )}
//                   {container.startupProbe && (
//                     <ProbeDetails probe={container.startupProbe} type="Startup" />
//                   )}
//                 </div>
//               </div>
//             )}
//
//             {/* Security Context */}
//             {container.securityContext && (
//               <div className="p-4">
//                 <h4 className="font-medium mb-2">Security Context</h4>
//                 <table className="w-full">
//                   <tbody>
//                     {Object.entries(container.securityContext).map(([key, value]) => (
//                       <tr key={key}>
//                         <td className="py-1 pr-4 font-medium">{key}</td>
//                         <td className="py-1">
//                           {typeof value === 'object'
//                             ? JSON.stringify(value)
//                             : String(value)}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

const VolumesList = ({ volumes }) => {
  if (!volumes?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No volumes found
      </div>
    );
  }

  const VolumeSourceDetails = ({ volume }) => {
    // Helper function to determine the volume type and its details
    const getVolumeTypeAndDetails = (volume) => {
      const types = [
        'configMap', 'secret', 'emptyDir', 'persistentVolumeClaim',
        'hostPath', 'projected', 'downwardAPI'
      ];

      const type = types.find(t => volume[t]);
      if (!type) return { type: 'unknown', details: {} };

      return { type, details: volume[type] };
    };

    const { type, details } = getVolumeTypeAndDetails(volume);

    const renderDetails = () => {
      switch (type) {
        case 'configMap':
          return (
            <>
              <tr>
                <td className="py-1 pr-4 font-medium">Config Map Name</td>
                <td className="py-1">{details.name}</td>
              </tr>
              {details.optional !== undefined && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Optional</td>
                  <td className="py-1">{details.optional.toString()}</td>
                </tr>
              )}
              {details.defaultMode && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Default Mode</td>
                  <td className="py-1">{details.defaultMode}</td>
                </tr>
              )}
              {details.items && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Items</td>
                  <td className="py-1">
                    <ul className="list-disc list-inside">
                      {details.items.map((item, idx) => (
                        <li key={idx}>
                          {item.key} → {item.path}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          );

        case 'secret':
          return (
            <>
              <tr>
                <td className="py-1 pr-4 font-medium">Secret Name</td>
                <td className="py-1">{details.secretName}</td>
              </tr>
              {details.optional !== undefined && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Optional</td>
                  <td className="py-1">{details.optional.toString()}</td>
                </tr>
              )}
              {details.defaultMode && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Default Mode</td>
                  <td className="py-1">{details.defaultMode}</td>
                </tr>
              )}
              {details.items && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Items</td>
                  <td className="py-1">
                    <ul className="list-disc list-inside">
                      {details.items.map((item, idx) => (
                        <li key={idx}>
                          {item.key} → {item.path}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          );

        case 'emptyDir':
          return (
            <>
              {details.medium && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Medium</td>
                  <td className="py-1">{details.medium}</td>
                </tr>
              )}
              {details.sizeLimit && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Size Limit</td>
                  <td className="py-1">{details.sizeLimit}</td>
                </tr>
              )}
            </>
          );

        case 'persistentVolumeClaim':
          return (
            <tr>
              <td className="py-1 pr-4 font-medium">Claim Name</td>
              <td className="py-1">{details.claimName}</td>
            </tr>
          );

        case 'hostPath':
          return (
            <>
              <tr>
                <td className="py-1 pr-4 font-medium">Path</td>
                <td className="py-1">{details.path}</td>
              </tr>
              {details.type && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Type</td>
                  <td className="py-1">{details.type}</td>
                </tr>
              )}
            </>
          );

        case 'projected':
          return (
            <>
              {details.defaultMode && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Default Mode</td>
                  <td className="py-1">{details.defaultMode}</td>
                </tr>
              )}
              {details.sources && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Sources</td>
                  <td className="py-1">
                    <div className="space-y-2">
                      {details.sources.map((source, idx) => (
                        <div key={idx} className="pl-4 border-l-2 border-gray-200">
                          {Object.entries(source).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium">{key}:</span>{' '}
                              {JSON.stringify(value, null, 2)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          );

        case 'downwardAPI':
          return (
            <>
              {details.defaultMode && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Default Mode</td>
                  <td className="py-1">{details.defaultMode}</td>
                </tr>
              )}
              {details.items && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Items</td>
                  <td className="py-1">
                    <ul className="list-disc list-inside">
                      {details.items.map((item, idx) => (
                        <li key={idx}>
                          {item.path}: {JSON.stringify(item.fieldRef || item.resourceFieldRef)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          );

        default:
          return (
            <tr>
              <td className="py-1 pr-4 font-medium">Details</td>
              <td className="py-1">
                <pre className="text-sm">{JSON.stringify(details, null, 2)}</pre>
              </td>
            </tr>
          );
      }
    };

    return (
      <div className="mt-2">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-1 pr-4 font-medium">Type</td>
              <td className="py-1">
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {type}
                </span>
              </td>
            </tr>
            {renderDetails()}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {volumes.map((volume, index) => (
        <div key={index} className="bg-white rounded-lg border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-medium">{volume.name}</h3>
          </div>
          <div className="p-4">
            <VolumeSourceDetails volume={volume} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ContainersList = ({ containers, type = "Container" }) => {
  if (!containers?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No {type.toLowerCase()}s found
      </div>
    );
  }

  const renderLifecycle = (lifecycle) => {
    if (!lifecycle) return null;

    return (
      <div className="p-4">
        <h4 className="font-medium mb-2">Lifecycle</h4>
        <div className="grid grid-cols-2 gap-4">
          {lifecycle.postStart && (
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Post Start</h5>
              <div className="bg-gray-50 p-2 rounded">
                {lifecycle.postStart.exec && (
                  <div>
                    <span className="font-medium">Command: </span>
                    {lifecycle.postStart.exec.command.join(' ')}
                  </div>
                )}
                {lifecycle.postStart.httpGet && (
                  <div>
                    <span className="font-medium">HTTP Get: </span>
                    {lifecycle.postStart.httpGet.scheme}://{lifecycle.postStart.httpGet.host || 'localhost'}:{lifecycle.postStart.httpGet.port}{lifecycle.postStart.httpGet.path}
                  </div>
                )}
              </div>
            </div>
          )}
          {lifecycle.preStop && (
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Pre Stop</h5>
              <div className="bg-gray-50 p-2 rounded">
                {lifecycle.preStop.exec && (
                  <div>
                    <span className="font-medium">Command: </span>
                    {lifecycle.preStop.exec.command.join(' ')}
                  </div>
                )}
                {lifecycle.preStop.httpGet && (
                  <div>
                    <span className="font-medium">HTTP Get: </span>
                    {lifecycle.preStop.httpGet.scheme}://{lifecycle.preStop.httpGet.host || 'localhost'}:{lifecycle.preStop.httpGet.port}{lifecycle.preStop.httpGet.path}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {containers.map((container, index) => (
        <div key={index} className="bg-white rounded-lg border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-medium">{container.name}</h3>
          </div>

          <div className="divide-y">
            {/* Basic Info */}
            <div className="p-4">
              <h4 className="font-medium mb-2">Basic Information</h4>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 font-medium">Image</td>
                    <td className="py-1">{container.image}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-medium">Image Pull Policy</td>
                    <td className="py-1">{container.imagePullPolicy}</td>
                  </tr>
                  {container.command && (
                    <tr>
                      <td className="py-1 pr-4 font-medium">Command</td>
                      <td className="py-1 font-mono text-sm">
                        {container.command.join(' ')}
                      </td>
                    </tr>
                  )}
                  {container.args && (
                    <tr>
                      <td className="py-1 pr-4 font-medium">Args</td>
                      <td className="py-1 font-mono text-sm">
                        {container.args.join(' ')}
                      </td>
                    </tr>
                  )}
                  {container.workingDir && (
                    <tr>
                      <td className="py-1 pr-4 font-medium">Working Directory</td>
                      <td className="py-1">{container.workingDir}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resources */}
            {(container.resources?.requests || container.resources?.limits) && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Resources</h4>
                <div className="grid grid-cols-2 gap-4">
                  {container.resources.requests && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Requests</h5>
                      <table className="w-full">
                        <tbody>
                          {Object.entries(container.resources.requests).map(([resource, value]) => (
                            <tr key={resource}>
                              <td className="py-1 pr-4 font-medium">{resource}</td>
                              <td className="py-1">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {container.resources.limits && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Limits</h5>
                      <table className="w-full">
                        <tbody>
                          {Object.entries(container.resources.limits).map(([resource, value]) => (
                            <tr key={resource}>
                              <td className="py-1 pr-4 font-medium">{resource}</td>
                              <td className="py-1">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ports */}
            {container.ports?.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Ports</h4>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pr-4">Name</th>
                      <th className="pr-4">Container Port</th>
                      <th className="pr-4">Protocol</th>
                      <th>Host Port</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.ports.map((port, portIndex) => (
                      <tr key={portIndex}>
                        <td className="py-1 pr-4">{port.name || '-'}</td>
                        <td className="py-1 pr-4">{port.containerPort}</td>
                        <td className="py-1 pr-4">{port.protocol}</td>
                        <td className="py-1">{port.hostPort || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Environment Variables */}
            {container.env?.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pr-4">Name</th>
                      <th>Value/Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.env.map((env, envIndex) => (
                      <tr key={envIndex}>
                        <td className="py-1 pr-4 font-medium">{env.name}</td>
                        <td className="py-1">
                          {env.value && (
                            <span className="break-all">{env.value}</span>
                          )}
                          {env.valueFrom && (
                            <div className="text-sm text-gray-500">
                              {Object.entries(env.valueFrom).map(([key, value]) => (
                                <div key={key} className="bg-gray-50 p-1 rounded mt-1">
                                  <span className="font-medium">{key}:</span>{' '}
                                  {JSON.stringify(value, null, 2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Environment From */}
            {container.envFrom?.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Environment From</h4>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pr-4">Type</th>
                      <th className="pr-4">Name</th>
                      <th>Optional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.envFrom.map((envFrom, index) => (
                      <tr key={index}>
                        <td className="py-1 pr-4">
                          {envFrom.configMapRef ? 'ConfigMap' : 'Secret'}
                        </td>
                        <td className="py-1 pr-4">
                          {envFrom.configMapRef?.name || envFrom.secretRef?.name}
                        </td>
                        <td className="py-1">
                          {(envFrom.configMapRef?.optional || envFrom.secretRef?.optional)?.toString() || 'false'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Volume Mounts */}
            {container.volumeMounts?.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Volume Mounts</h4>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-500">
                      <th className="pr-4">Name</th>
                      <th className="pr-4">Mount Path</th>
                      <th className="pr-4">Read Only</th>
                      <th>Sub Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.volumeMounts.map((mount, mountIndex) => (
                      <tr key={mountIndex}>
                        <td className="py-1 pr-4">{mount.name}</td>
                        <td className="py-1 pr-4">{mount.mountPath}</td>
                        <td className="py-1 pr-4">{mount.readOnly ? 'Yes' : 'No'}</td>
                        <td className="py-1">{mount.subPath || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Probes */}
            {(container.livenessProbe || container.readinessProbe || container.startupProbe) && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Probes</h4>
                <div className="space-y-4">
                  {container.livenessProbe && (
                    <ProbeDetails probe={container.livenessProbe} type="Liveness" />
                  )}
                  {container.readinessProbe && (
                    <ProbeDetails probe={container.readinessProbe} type="Readiness" />
                  )}
                  {container.startupProbe && (
                    <ProbeDetails probe={container.startupProbe} type="Startup" />
                  )}
                </div>
              </div>
            )}

            {/* Lifecycle */}
            {container.lifecycle && renderLifecycle(container.lifecycle)}

            {/* Security Context */}
            {container.securityContext && (
              <div className="p-4">
                <h4 className="font-medium mb-2">Security Context</h4>
                <table className="w-full">
                  <tbody>
                    {Object.entries(container.securityContext).map(([key, value]) => (
                      <tr key={key}>
                        <td className="py-1 pr-4 font-medium">{key}</td>
                        <td className="py-1">
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeploymentDetails;