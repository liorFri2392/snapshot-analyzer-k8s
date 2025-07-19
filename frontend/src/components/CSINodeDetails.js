import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const CSINodeDetails = ({ items = [] }) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filter and paginate CSI nodes
  const filteredNodes = useMemo(() => {
    return items.filter(node =>
      !filters.search ||
      node.metadata.name.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [items, filters]);

  // Paginate filtered nodes
  const paginatedNodes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNodes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNodes, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredNodes.length / itemsPerPage);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (value) => {
    setFilters(prev => ({
      ...prev,
      search: value
    }));
  };

  const toggleNode = (nodeIndex) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeIndex]: !prev[nodeIndex]
    }));
  };

  const getActiveTab = (nodeIndex) => {
    return activeTab[nodeIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'drivers', label: 'CSI Drivers' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No CSI nodes available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
        <input
          type="text"
          className="w-full border rounded-md py-2 px-3"
          placeholder="Search by node name..."
          value={filters.search}
          onChange={(e) => handleFilterChange(e.target.value)}
        />
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedNodes.length} of {filteredNodes.length} CSI nodes
      </div>

      {/* CSI Node List */}
      {paginatedNodes.map((node, nodeIndex) => (
        <div key={node.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleNode(nodeIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{node.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Drivers: {node.spec.drivers?.length || 0}
                  </p>
                </div>
                <CSINodeStatus node={node} />
              </div>
            </div>
            {expandedNodes[nodeIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
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
                {getActiveTab(nodeIndex) === 'details' && (
                  <CSINodeDetailsView node={node} />
                )}
                {getActiveTab(nodeIndex) === 'drivers' && (
                  <CSIDriversList drivers={node.spec.drivers} />
                )}
                {getActiveTab(nodeIndex) === 'annotations' && (
                  <MetadataTable
                    metadata={node.metadata.annotations}
                    title="Annotations"
                  />
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

const CSINodeStatus = ({ node }) => {
  const driversCount = node.spec.drivers?.length || 0;

  const getStatusColor = () => {
    if (driversCount > 2) {
      return 'text-green-600 bg-green-50';
    }
    if (driversCount > 0) {
      return 'text-yellow-600 bg-yellow-50';
    }
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {driversCount} CSI Driver{driversCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

const CSINodeDetailsView = ({ node }) => {
  const details = [
    { label: 'Name', value: node.metadata.name },
    { label: 'UID', value: node.metadata.uid },
    { label: 'Creation Timestamp', value: node.metadata.creationTimestamp },
    { label: 'Resource Version', value: node.metadata.resourceVersion }
  ];

  // Add owner reference if exists
  const ownerReferences = node.metadata.ownerReferences || [];
  const ownerRef = ownerReferences.length > 0 ? ownerReferences[0] : null;

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
          {ownerRef && (
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Owner Reference</td>
              <td className="py-2 px-3">
                {ownerRef.kind}: {ownerRef.name}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const CSIDriversList = ({ drivers = [] }) => {
  if (!drivers?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No CSI drivers found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver, index) => (
        <div key={index} className="bg-white rounded-lg border">
          <div className="p-4 border-b bg-gray-50">
            <h4 className="font-medium">{driver.name}</h4>
          </div>
          <div className="p-4">
            <table className="w-full text-left">
              <tbody>
                <tr>
                  <td className="py-2 font-medium">Node ID</td>
                  <td className="py-2 break-all">{driver.nodeID}</td>
                </tr>
                {driver.topologyKeys && (
                  <tr>
                    <td className="py-2 font-medium">Topology Keys</td>
                    <td className="py-2">
                      {driver.topologyKeys.map(key => (
                        <div key={key}>{key}</div>
                      ))}
                    </td>
                  </tr>
                )}
                {driver.allocatable && (
                  <tr>
                    <td className="py-2 font-medium">Allocatable</td>
                    <td className="py-2">
                      {Object.entries(driver.allocatable).map(([key, value]) => (
                        <div key={key}>{key}: {value}</div>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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

export default CSINodeDetails;