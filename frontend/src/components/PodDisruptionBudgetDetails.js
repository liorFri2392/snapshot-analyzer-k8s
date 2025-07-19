import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const PodDisruptionBudgetDetails = ({ items = [] }) => {
  const [expandedBudgets, setExpandedBudgets] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(pdb => pdb.metadata.namespace))].sort();

  // Filter and paginate PDBs
  const filteredBudgets = useMemo(() => {
    return items.filter(pdb => {
      const matchNamespace = !filters.namespace || pdb.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        pdb.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered budgets
  const paginatedBudgets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBudgets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBudgets, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);

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

  const toggleBudget = (budgetIndex) => {
    setExpandedBudgets(prev => ({
      ...prev,
      [budgetIndex]: !prev[budgetIndex]
    }));
  };

  const getActiveTab = (budgetIndex) => {
    return activeTab[budgetIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'spec', label: 'Spec' },
    { id: 'status', label: 'Status' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No pod disruption budgets available
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
        Showing {paginatedBudgets.length} of {filteredBudgets.length} pod disruption budgets
      </div>

      {/* PDB List */}
      {paginatedBudgets.map((pdb, budgetIndex) => (
        <div key={pdb.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleBudget(budgetIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{pdb.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {pdb.metadata.namespace}
                  </p>
                </div>
                <PDBStatus pdb={pdb} />
              </div>
            </div>
            {expandedBudgets[budgetIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedBudgets[budgetIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [budgetIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(budgetIndex) === tab.id
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
                {getActiveTab(budgetIndex) === 'details' && (
                  <PDBMetadataDetails metadata={pdb.metadata} />
                )}
                {getActiveTab(budgetIndex) === 'spec' && (
                  <PDBSpecDetails spec={pdb.spec} />
                )}
                {getActiveTab(budgetIndex) === 'status' && (
                  <PDBStatusDetails status={pdb.status} />
                )}
                {getActiveTab(budgetIndex) === 'labels' && (
                  <MetadataTable metadata={pdb.metadata.labels} title="Labels" />
                )}
                {getActiveTab(budgetIndex) === 'annotations' && (
                  <MetadataTable metadata={pdb.metadata.annotations} title="Annotations" />
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

const PDBStatus = ({ pdb }) => {
  const status = pdb.status || {};

  const getStatusColor = () => {
    const isHealthy =
      status.currentHealthy >= status.desiredHealthy &&
      status.disruptionsAllowed > 0;

    return isHealthy
      ? 'text-green-600 bg-green-50'
      : 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {status.currentHealthy || 0} / {status.desiredHealthy || 0} Healthy
      </span>
      {status.disruptionsAllowed > 0 && (
        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm font-medium">
          {status.disruptionsAllowed} Disruption{status.disruptionsAllowed !== 1 ? 's' : ''} Allowed
        </span>
      )}
    </div>
  );
};

const PDBMetadataDetails = ({ metadata }) => {
  const details = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
    { label: 'UID', value: metadata.uid },
    { label: 'Resource Version', value: metadata.resourceVersion },
    { label: 'Generation', value: metadata.generation },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp }
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

const PDBSpecDetails = ({ spec }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Budget Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Min Available</td>
              <td className="py-2 px-3">{spec.minAvailable || 'N/A'}</td>
            </tr>
            {spec.maxUnavailable && (
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Max Unavailable</td>
                <td className="py-2 px-3">{spec.maxUnavailable}</td>
              </tr>
            )}
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

const PDBStatusDetails = ({ status }) => {
  const details = [
    { label: 'Observed Generation', value: status.observedGeneration },
    { label: 'Current Healthy Pods', value: status.currentHealthy },
    { label: 'Desired Healthy Pods', value: status.desiredHealthy },
    { label: 'Expected Total Pods', value: status.expectedPods },
    { label: 'Disruptions Allowed', value: status.disruptionsAllowed }
  ];

  return (
    <div className="space-y-6">
      {/* Pod Health Status */}
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Pod Health</h3>
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

      {/* Conditions */}
      {status.conditions && status.conditions.length > 0 && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Conditions</h3>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Reason</th>
                <th className="py-2 px-3 font-medium">Last Transition</th>
              </tr>
            </thead>
            <tbody>
              {status.conditions.map((condition, index) => (
                <tr key={index} className="border-t">
                  <td className="py-2 px-3">{condition.type}</td>
                  <td className="py-2 px-3">{condition.status}</td>
<td className="py-2 px-3">{condition.reason}</td>
                  <td className="py-2 px-3">{condition.lastTransitionTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default PodDisruptionBudgetDetails;