import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import YamlViewer from './YamlViewer';

const ReplicaSetStatus = ({ status }) => {
  const getStatusColor = () => {
    if (status.readyReplicas === status.replicas) {
      return 'text-green-600 bg-green-50';
    }
    if (status.readyReplicas > 0) {
      return 'text-yellow-600 bg-yellow-50';
    }
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {status.readyReplicas || 0} / {status.replicas} ready
      </span>
      {status.observedGeneration > 1 && (
        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm font-medium">
          Updating
        </span>
      )}
    </div>
  );
};

const ReplicaSetDetails = ({ items = [] }) => {
  const [expandedSets, setExpandedSets] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(set => set.metadata.namespace))].sort();

  // Filter and paginate replicasets
  const filteredSets = useMemo(() => {
    return items.filter(set => {
      const matchNamespace = !filters.namespace || set.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        set.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered sets
  const paginatedSets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSets, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSets.length / itemsPerPage);

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

  const toggleSet = (setIndex) => {
    setExpandedSets(prev => ({
      ...prev,
      [setIndex]: !prev[setIndex]
    }));
  };

  const getActiveTab = (setIndex) => {
    return activeTab[setIndex] || 'details';
  };

  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'details', label: 'Details' },
    { id: 'spec', label: 'Spec' },
    { id: 'status', label: 'Status' },
    { id: 'containers', label: 'Containers' },
    { id: 'volumes', label: 'Volumes' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' },
    { id: 'scheduling', label: 'Scheduling' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No replicaset details available
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
        Showing {paginatedSets.length} of {filteredSets.length} replicasets
      </div>

      {/* ReplicaSet List */}
      {paginatedSets.map((set, setIndex) => (
        <div key={set.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleSet(setIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{set.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {set.metadata.namespace}
                  </p>
                </div>
                <ReplicaSetStatus status={set.status} />
              </div>
            </div>
            {expandedSets[setIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedSets[setIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [setIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(setIndex) === tab.id
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
                {getActiveTab(setIndex) === 'yaml' && (
                  <YamlViewer data={set} />
                )}
                {getActiveTab(setIndex) === 'details' && (
                  <MetadataDetails metadata={set.metadata} />
                )}
                {getActiveTab(setIndex) === 'spec' && (
                  <SpecDetails spec={set.spec} />
                )}
                {getActiveTab(setIndex) === 'status' && (
                  <StatusDetails status={set.status} />
                )}
                {getActiveTab(setIndex) === 'containers' && (
                  <ContainersList
                    containers={set.spec.template.spec.containers}
                    initContainers={set.spec.template.spec.initContainers}
                  />
                )}
                {getActiveTab(setIndex) === 'volumes' && (
                  <VolumesList volumes={set.spec.template.spec.volumes} />
                )}
                {getActiveTab(setIndex) === 'labels' && (
                  <MetadataTable metadata={set.metadata.labels} title="Labels" />
                )}
                {getActiveTab(setIndex) === 'annotations' && (
                  <MetadataTable metadata={set.metadata.annotations} title="Annotations" />
                )}
                {getActiveTab(setIndex) === 'scheduling' && (
                  <SchedulingDetails spec={set.spec.template.spec} />
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
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Basic Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Replicas</td>
              <td className="py-2 px-3">{spec.replicas}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
  const details = [
    { label: 'Observed Generation', value: status.observedGeneration },
    { label: 'Replicas', value: status.replicas },
    { label: 'Fully Labeled Replicas', value: status.fullyLabeledReplicas },
    { label: 'Ready Replicas', value: status.readyReplicas },
    { label: 'Available Replicas', value: status.availableReplicas }
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

const ContainersList = ({ containers = [], initContainers = [] }) => {
  if (!containers?.length && !initContainers?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No containers found
      </div>
    );
  }

  const ContainerSection = ({ container, type = "Container" }) => (
    <div className="bg-white rounded-lg border mb-4 last:mb-0">
      <div className="p-4 border-b bg-gray-50">
        <h4 className="font-medium">{container.name}</h4>
        <p className="text-sm text-gray-500">{type}</p>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 font-medium">Image</td>
              <td className="py-2">{container.image}</td>
            </tr>
            {container.command && (
              <tr>
                <td className="py-2 font-medium">Command</td>
                <td className="py-2 font-mono text-sm">
                  {container.command.join(' ')}
                </td>
              </tr>
            )}
            {container.args && (
              <tr>
                <td className="py-2 font-medium">Args</td>
                <td className="py-2 font-mono text-sm">
                  {container.args.join(' ')}
                </td>
              </tr>
            )}
            {container.resources && (
              <tr>
                <td className="py-2 font-medium">Resources</td>
                <td className="py-2">
                  <div className="space-y-2">
                    {container.resources.requests && (
                      <div>
                        <span className="font-medium">Requests:</span>
                        <ul className="list-disc list-inside">
                          {Object.entries(container.resources.requests).map(([key, value]) => (
                            <li key={key}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {container.resources.limits && (
                      <div>
                        <span className="font-medium">Limits:</span>
                        <ul className="list-disc list-inside">
                          {Object.entries(container.resources.limits).map(([key, value]) => (
                            <li key={key}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {initContainers?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Init Containers</h3>
          {initContainers.map((container, index) => (
            <ContainerSection
              key={index}
              container={container}
              type="Init Container"
            />
          ))}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium mb-4">Containers</h3>
        {containers.map((container, index) => (
          <ContainerSection
            key={index}
            container={container}
          />
        ))}
      </div>
    </div>
  );
};

const VolumesList = ({ volumes = [] }) => {
  if (!volumes?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No volumes found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Volumes</h3>
        {volumes.map((volume, index) => (
          <div key={index} className="bg-white rounded-lg border mb-4">
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium">{volume.name}</h4>
            </div>
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  {Object.entries(volume).map(([key, value]) => (
                    key !== 'name' && (
                      <tr key={key}>
                        <td className="py-2 font-medium">{key}</td>
                        <td className="py-2">
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : value}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SchedulingDetails = ({ spec }) => {
  return (
    <div className="space-y-6">
      {spec.nodeSelector && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Node Selector</h3>
          <div className="p-4">
            <MetadataTable metadata={spec.nodeSelector} title="Node Selector" />
          </div>
        </div>
      )}

      {spec.tolerations && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Tolerations</h3>
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
              {spec.tolerations.map((toleration, index) => (
                <tr key={index} className="border-t">
                  <td className="py-2 px-3">{toleration.key || '*'}</td>
                  <td className="py-2 px-3">{toleration.operator || 'Equal'}</td>
                  <td className="py-2 px-3">{toleration.value || 'N/A'}</td>
                  <td className="py-2 px-3">{toleration.effect || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spec.affinity && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Affinity Rules</h3>
          <div className="p-4">
            <pre className="bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(spec.affinity, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplicaSetDetails;