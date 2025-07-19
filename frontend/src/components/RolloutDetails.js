import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import YamlViewer from './YamlViewer';

const RolloutDetails = ({ items = [] }) => {
  const [expandedRollouts, setExpandedRollouts] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    phase: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces and phases
  const namespaces = [...new Set(items.map(rollout => rollout.metadata.namespace))].sort();
  const phases = [...new Set(items.map(rollout => rollout.status?.phase).filter(Boolean))].sort();

  // Filter and paginate rollouts
  const filteredRollouts = useMemo(() => {
    return items.filter(rollout => {
      const matchNamespace = !filters.namespace ||
        rollout.metadata.namespace === filters.namespace;
      const matchPhase = !filters.phase ||
        rollout.status?.phase === filters.phase;
      const matchSearch = !filters.search ||
        rollout.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchPhase && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered rollouts
  const paginatedRollouts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRollouts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRollouts, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRollouts.length / itemsPerPage);

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

  const toggleRollout = (rolloutIndex) => {
    setExpandedRollouts(prev => ({
      ...prev,
      [rolloutIndex]: !prev[rolloutIndex]
    }));
  };

  const getActiveTab = (rolloutIndex) => {
    return activeTab[rolloutIndex] || 'details';
  };

  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'details', label: 'Details' },
    { id: 'spec', label: 'Spec' },
    { id: 'status', label: 'Status' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No rollout details available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
          <select
            className="w-full border rounded-md py-2 px-3"
            value={filters.phase}
            onChange={(e) => handleFilterChange('phase', e.target.value)}
          >
            <option value="">All Phases</option>
            {phases.map(phase => (
              <option key={phase} value={phase}>{phase}</option>
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

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedRollouts.length} of {filteredRollouts.length} rollouts
      </div>

      {/* Rollout List */}
      {paginatedRollouts.map((rollout, rolloutIndex) => (
        <div key={rollout.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleRollout(rolloutIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{rollout.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {rollout.metadata.namespace}
                  </p>
                </div>
                <RolloutStatus status={rollout.status} />
              </div>
            </div>
            {expandedRollouts[rolloutIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedRollouts[rolloutIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [rolloutIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(rolloutIndex) === tab.id
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
                {getActiveTab(rolloutIndex) === 'yaml' && (
                  <YamlViewer data={rollout} />
                )}
                {getActiveTab(rolloutIndex) === 'details' && (
                  <MetadataDetails metadata={rollout.metadata} />
                )}
                {getActiveTab(rolloutIndex) === 'spec' && (
                  <SpecDetails spec={rollout.spec} />
                )}
                {getActiveTab(rolloutIndex) === 'status' && (
                  <StatusDetails status={rollout.status} />
                )}
                {getActiveTab(rolloutIndex) === 'conditions' && (
                  <ConditionsList conditions={rollout.status?.conditions} />
                )}
                {getActiveTab(rolloutIndex) === 'strategy' && (
                  <StrategyDetails strategy={rollout.spec?.strategy} />
                )}
                {getActiveTab(rolloutIndex) === 'labels' && (
                  <MetadataTable metadata={rollout.metadata.labels} title="Labels" />
                )}
                {getActiveTab(rolloutIndex) === 'annotations' && (
                  <MetadataTable metadata={rollout.metadata.annotations} title="Annotations" />
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

const RolloutStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status?.phase) {
      case 'Healthy':
        return 'text-green-600 bg-green-50';
      case 'Progressing':
        return 'text-blue-600 bg-blue-50';
      case 'Degraded':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {status?.phase || 'Unknown'}
      </span>
      {status?.replicas && (
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {status.readyReplicas || 0} / {status.replicas} ready
        </span>
      )}
    </div>
  );
};

const MetadataDetails = ({ metadata }) => {
  const details = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
    { label: 'UID', value: metadata.uid },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp },
    { label: 'Resource Version', value: metadata.resourceVersion },
    { label: 'Generation', value: metadata.generation }
  ];

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Field</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {details.map(({ label, value }) => (
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

const SpecDetails = ({ spec }) => {
  if (!spec) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No spec details available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Basic Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Replicas</td>
              <td className="py-2 px-3">{spec.replicas || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Revision History Limit</td>
              <td className="py-2 px-3">{spec.revisionHistoryLimit || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Progress Deadline Seconds</td>
              <td className="py-2 px-3">{spec.progressDeadlineSeconds || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {spec.workloadRef && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Workload Reference</h3>
          <table className="w-full text-left">
            <tbody>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Kind</td>
                <td className="py-2 px-3">{spec.workloadRef.kind}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">API Version</td>
                <td className="py-2 px-3">{spec.workloadRef.apiVersion}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Name</td>
                <td className="py-2 px-3">{spec.workloadRef.name}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {spec.selector && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Selector</h3>
          <div className="p-4">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 font-medium">Key</th>
                  <th className="py-2 px-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(spec.selector.matchLabels || {}).map(([key, value]) => (
                  <tr key={key} className="border-t">
                    <td className="py-2 px-3">{key}</td>
                    <td className="py-2 px-3">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusDetails = ({ status }) => {
  if (!status) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No status details available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Replica Metrics</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Total Replicas</td>
              <td className="py-2 px-3">{status.replicas || 0}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Updated Replicas</td>
              <td className="py-2 px-3">{status.updatedReplicas || 0}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Ready Replicas</td>
              <td className="py-2 px-3">{status.readyReplicas || 0}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Available Replicas</td>
              <td className="py-2 px-3">{status.availableReplicas || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Rollout Metadata</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Phase</td>
              <td className="py-2 px-3">{status.phase || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Current Pod Hash</td>
              <td className="py-2 px-3">{status.currentPodHash || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Stable ReplicaSet</td>
              <td className="py-2 px-3">{status.stableRS || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Observed Generation</td>
              <td className="py-2 px-3">{status.observedGeneration || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Current Step Index</td>
              <td className="py-2 px-3">{status.currentStepIndex || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConditionsList = ({ conditions = [] }) => {
  if (!conditions?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No conditions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={index} className="bg-white rounded-lg border">
          <div className="p-4 bg-gray-50 border-b">
            <h4 className="font-medium">{condition.type}</h4>
          </div>
          <table className="w-full text-left">
            <tbody>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Status</td>
                <td className="py-2 px-3">{condition.status}</td>
              </tr>
              {condition.reason && (
                <tr className="border-t">
                  <td className="py-2 px-3 font-medium">Reason</td>
                  <td className="py-2 px-3">{condition.reason}</td>
                </tr>
              )}
              {condition.message && (
                <tr className="border-t">
                  <td className="py-2 px-3 font-medium">Message</td>
                  <td className="py-2 px-3 break-words">{condition.message}</td>
                </tr>
              )}
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Last Update Time</td>
                <td className="py-2 px-3">
                  {condition.lastUpdateTime
                    ? new Date(condition.lastUpdateTime).toLocaleString()
                    : 'N/A'}
                </td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Last Transition Time</td>
                <td className="py-2 px-3">
                  {condition.lastTransitionTime
                    ? new Date(condition.lastTransitionTime).toLocaleString()
                    : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const StrategyDetails = ({ strategy }) => {
  if (!strategy) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No strategy details available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {strategy.canary && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Canary Strategy</h3>
          <table className="w-full text-left">
            <tbody>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Max Surge</td>
                <td className="py-2 px-3">{strategy.canary.maxSurge || 'N/A'}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Max Unavailable</td>
                <td className="py-2 px-3">{strategy.canary.maxUnavailable || 'N/A'}</td>
              </tr>
              {strategy.canary.steps && (
                <tr className="border-t">
                  <td className="py-2 px-3 font-medium">Steps</td>
                  <td className="py-2 px-3">
                    <div className="space-y-2">
                      {strategy.canary.steps.map((step, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded">
                          {Object.entries(step).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {strategy.blueGreen && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Blue-Green Strategy</h3>
          <pre className="p-4 bg-gray-50 rounded overflow-auto">
            {JSON.stringify(strategy.blueGreen, null, 2)}
          </pre>
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

export default RolloutDetails;