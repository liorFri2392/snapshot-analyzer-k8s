import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const StorageClassDetails = ({ items = [] }) => {
  const [expandedClasses, setExpandedClasses] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filter and paginate storage classes
  const filteredClasses = useMemo(() => {
    return items.filter(storageClass =>
      !filters.search ||
      storageClass.metadata.name.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [items, filters]);

  // Paginate filtered classes
  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClasses, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);

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

  const toggleClass = (classIndex) => {
    setExpandedClasses(prev => ({
      ...prev,
      [classIndex]: !prev[classIndex]
    }));
  };

  const getActiveTab = (classIndex) => {
    return activeTab[classIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'parameters', label: 'Parameters' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No storage classes available
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
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => handleFilterChange(e.target.value)}
        />
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedClasses.length} of {filteredClasses.length} storage classes
      </div>

      {/* Storage Class List */}
      {paginatedClasses.map((storageClass, classIndex) => (
        <div key={storageClass.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleClass(classIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{storageClass.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Provisioner: {storageClass.provisioner}
                  </p>
                </div>
                <StorageClassStatus storageClass={storageClass} />
              </div>
            </div>
            {expandedClasses[classIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedClasses[classIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [classIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(classIndex) === tab.id
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
                {getActiveTab(classIndex) === 'details' && (
                  <StorageClassDetailsView storageClass={storageClass} />
                )}
                {getActiveTab(classIndex) === 'parameters' && (
                  <StorageClassParameters parameters={storageClass.parameters} />
                )}
                {getActiveTab(classIndex) === 'annotations' && (
                  <MetadataTable
                    metadata={storageClass.metadata.annotations}
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

const StorageClassStatus = ({ storageClass }) => {
  const getStatusColor = () => {
    if (storageClass.allowVolumeExpansion) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="flex items-center space-x-2">
      {storageClass.allowVolumeExpansion ? (
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          Volume Expansion Enabled
        </span>
      ) : (
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          Volume Expansion Disabled
        </span>
      )}
    </div>
  );
};

const StorageClassDetailsView = ({ storageClass }) => {
  const details = [
    { label: 'Name', value: storageClass.metadata.name },
    { label: 'UID', value: storageClass.metadata.uid },
    { label: 'Creation Timestamp', value: storageClass.metadata.creationTimestamp },
    { label: 'Provisioner', value: storageClass.provisioner },
    { label: 'Reclaim Policy', value: storageClass.reclaimPolicy },
    { label: 'Volume Binding Mode', value: storageClass.volumeBindingMode },
    {
      label: 'Allow Volume Expansion',
      value: storageClass.allowVolumeExpansion ? 'Yes' : 'No'
    }
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

const StorageClassParameters = ({ parameters }) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No parameters found
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
          {Object.entries(parameters).map(([key, value]) => (
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

export default StorageClassDetails;