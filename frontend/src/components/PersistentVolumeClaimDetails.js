import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const PVCStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status.phase) {
      case 'Bound':
        return 'text-green-600 bg-green-50';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {status.phase}
      </span>
    </div>
  );
};

const PersistentVolumeClaimDetails = ({ items = [] }) => {
  const [expandedClaims, setExpandedClaims] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(pvc => pvc.metadata.namespace))].sort();

  // Filter and paginate PVCs
  const filteredClaims = useMemo(() => {
    return items.filter(pvc => {
      const matchNamespace = !filters.namespace || pvc.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        pvc.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered claims
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClaims.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClaims, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);

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

  const toggleClaim = (claimIndex) => {
    setExpandedClaims(prev => ({
      ...prev,
      [claimIndex]: !prev[claimIndex]
    }));
  };

  const getActiveTab = (claimIndex) => {
    return activeTab[claimIndex] || 'details';
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
        No persistent volume claims available
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
        Showing {paginatedClaims.length} of {filteredClaims.length} persistent volume claims
      </div>

      {/* PVC List */}
      {paginatedClaims.map((pvc, claimIndex) => (
        <div key={pvc.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleClaim(claimIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{pvc.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {pvc.metadata.namespace}
                  </p>
                </div>
                <PVCStatus status={pvc.status} />
              </div>
            </div>
            {expandedClaims[claimIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedClaims[claimIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [claimIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(claimIndex) === tab.id
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
                {getActiveTab(claimIndex) === 'details' && (
                  <PVCMetadataDetails metadata={pvc.metadata} />
                )}
                {getActiveTab(claimIndex) === 'spec' && (
                  <PVCSpecDetails spec={pvc.spec} />
                )}
                {getActiveTab(claimIndex) === 'status' && (
                  <PVCStatusDetails status={pvc.status} />
                )}
                {getActiveTab(claimIndex) === 'labels' && (
                  <MetadataTable metadata={pvc.metadata.labels} title="Labels" />
                )}
                {getActiveTab(claimIndex) === 'annotations' && (
                  <MetadataTable metadata={pvc.metadata.annotations} title="Annotations" />
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

const PVCMetadataDetails = ({ metadata }) => {
  const details = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
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

const PVCSpecDetails = ({ spec }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Volume Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Access Modes</td>
              <td className="py-2 px-3">{spec.accessModes?.join(', ') || 'N/A'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Storage Class</td>
              <td className="py-2 px-3">{spec.storageClassName || 'default'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Volume Mode</td>
              <td className="py-2 px-3">{spec.volumeMode || 'Filesystem'}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Requested Storage</td>
              <td className="py-2 px-3">
                {spec.resources?.requests?.storage || 'N/A'}
              </td>
            </tr>
            {spec.volumeName && (
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Volume Name</td>
                <td className="py-2 px-3">{spec.volumeName}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PVCStatusDetails = ({ status }) => {
  const details = [
    { label: 'Phase', value: status.phase },
    { label: 'Access Modes', value: status.accessModes?.join(', ') },
    { label: 'Capacity', value: status.capacity?.storage }
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

export default PersistentVolumeClaimDetails;