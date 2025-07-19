import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const NamespaceDetails = ({ items = [] }) => {
  const [expandedNamespaces, setExpandedNamespaces] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    phase: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique phases
  const phases = [...new Set(items.map(ns => ns.status?.phase).filter(Boolean))].sort();

  // Filter and paginate namespaces
  const filteredNamespaces = useMemo(() => {
    return items.filter(namespace => {
      const matchSearch = !filters.search ||
        namespace.metadata.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchPhase = !filters.phase ||
        namespace.status?.phase === filters.phase;

      return matchSearch && matchPhase;
    });
  }, [items, filters]);

  // Paginate filtered namespaces
  const paginatedNamespaces = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNamespaces.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNamespaces, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredNamespaces.length / itemsPerPage);

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

  const toggleNamespace = (namespaceIndex) => {
    setExpandedNamespaces(prev => ({
      ...prev,
      [namespaceIndex]: !prev[namespaceIndex]
    }));
  };

  const getActiveTab = (namespaceIndex) => {
    return activeTab[namespaceIndex] || 'details';
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
        No namespace details available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4">
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
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedNamespaces.length} of {filteredNamespaces.length} namespaces
      </div>

      {/* Namespace List */}
      {paginatedNamespaces.map((namespace, namespaceIndex) => (
        <div key={namespace.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleNamespace(namespaceIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{namespace.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Status: {namespace.status?.phase || 'Unknown'}
                  </p>
                </div>
                <NamespaceStatus phase={namespace.status?.phase} />
              </div>
            </div>
            {expandedNamespaces[namespaceIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedNamespaces[namespaceIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [namespaceIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(namespaceIndex) === tab.id
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
                {getActiveTab(namespaceIndex) === 'details' && (
                  <MetadataDetails metadata={namespace.metadata} />
                )}
                {getActiveTab(namespaceIndex) === 'spec' && (
                  <SpecDetails spec={namespace.spec} />
                )}
                {getActiveTab(namespaceIndex) === 'status' && (
                  <StatusDetails status={namespace.status} />
                )}
                {getActiveTab(namespaceIndex) === 'labels' && (
                  <MetadataTable metadata={namespace.metadata.labels} title="Labels" />
                )}
                {getActiveTab(namespaceIndex) === 'annotations' && (
                  <MetadataTable metadata={namespace.metadata.annotations} title="Annotations" />
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

const NamespaceStatus = ({ phase }) => {
  const getStatusColor = () => {
    switch (phase) {
      case 'Active':
        return 'text-green-600 bg-green-50';
      case 'Terminating':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
      {phase || 'Unknown'}
    </span>
  );
};

const MetadataDetails = ({ metadata }) => {
  const details = [
    { label: 'Name', value: metadata.name },
    { label: 'UID', value: metadata.uid },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp },
    { label: 'Resource Version', value: metadata.resourceVersion }
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
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Field</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {spec.finalizers && (
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Finalizers</td>
              <td className="py-2 px-3">
                {spec.finalizers.join(', ')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Field</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="py-2 px-3 font-medium">Phase</td>
            <td className="py-2 px-3">{status.phase || 'N/A'}</td>
          </tr>
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

export default NamespaceDetails;