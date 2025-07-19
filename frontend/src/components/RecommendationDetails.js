import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, Cpu, MemoryStick } from 'lucide-react';
import YamlViewer from './YamlViewer';

const ResourceTable = ({ resources, title }) => {
  if (!resources) return null;

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(resources).map(([key, value]) => (
            <tr key={key} className="border-t">
              <td className="py-2 px-3 font-medium text-gray-600">{key}</td>
              <td className="py-2 px-3">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ContainerRecommendation = ({ container }) => {
  return (
    <div className="bg-white rounded-lg border mb-4 last:mb-0">
      <div className="p-4 border-b bg-gray-50">
        <h4 className="font-medium">{container.containerName}</h4>
      </div>
      <div className="p-4">
        <ResourceTable resources={container.requests} title="Requests" />
        <ResourceTable resources={container.limits} title="Limits" />
      </div>
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
              <td className="py-2 px-3 break-all">{key}</td>
              <td className="py-2 px-3 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RecommendationDetails = ({ items = [] }) => {
  const [expandedRecs, setExpandedRecs] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(rec => rec.metadata.namespace))].sort();

  // Filter and paginate recommendations
  const filteredRecs = useMemo(() => {
    return items.filter(rec => {
      const matchNamespace = !filters.namespace || rec.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        rec.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered recommendations
  const paginatedRecs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecs, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecs.length / itemsPerPage);

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

  const toggleRec = (recIndex) => {
    setExpandedRecs(prev => ({
      ...prev,
      [recIndex]: !prev[recIndex]
    }));
  };

  const getActiveTab = (recIndex) => {
    return activeTab[recIndex] || 'details';
  };

  const tabs = [
    { id: 'yaml', label: 'YAML' },
    { id: 'details', label: 'Details' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No recommendations available
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
        Showing {paginatedRecs.length} of {filteredRecs.length} recommendations
      </div>

      {/* Recommendations List */}
      {paginatedRecs.map((rec, recIndex) => (
        <div key={rec.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleRec(recIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{rec.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {rec.metadata.namespace} • Kind: {rec.spec.targetRef.kind}
                  </p>
                  <div className="mt-2 space-y-1">
                    {rec.spec.recommendation.map((container, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{container.containerName}:</span>
                        <span className="text-gray-600 ml-2 flex items-center gap-2">
                          <span className="flex items-center">
                            <Cpu className="w-4 h-4 mr-1" />
                            {container.requests?.cpu || 'N/A'} / {container.limits?.cpu || 'N/A'}
                          </span>
                          {' • '}
                          <span className="flex items-center">
                            <MemoryStick className="w-4 h-4 mr-1" />
                            {container.requests?.memory || 'N/A'} / {container.limits?.memory || 'N/A'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {expandedRecs[recIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedRecs[recIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [recIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(recIndex) === tab.id
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
                {getActiveTab(recIndex) === 'yaml' && (
                  <YamlViewer data={rec} />
                )}
                {getActiveTab(recIndex) === 'details' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-lg">
                      <h3 className="text-lg font-medium mb-4">Target Reference</h3>
                      <table className="w-full text-left">
                        <tbody>
                          <tr className="border-t">
                            <td className="py-2 px-3 font-medium">Kind</td>
                            <td className="py-2 px-3">{rec.spec.targetRef.kind}</td>
                          </tr>
                          <tr className="border-t">
                            <td className="py-2 px-3 font-medium">Name</td>
                            <td className="py-2 px-3">{rec.spec.targetRef.name}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Container Recommendations</h3>
                      {rec.spec.recommendation.map((container, index) => (
                        <ContainerRecommendation key={index} container={container} />
                      ))}
                    </div>
                  </div>
                )}

                {getActiveTab(recIndex) === 'annotations' && (
                  <MetadataTable
                    metadata={rec.metadata.annotations}
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

export default RecommendationDetails;