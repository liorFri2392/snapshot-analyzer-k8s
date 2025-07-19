import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const MetricsStatus = ({ timestamp, window }) => {
  const formattedTime = new Date(timestamp).toLocaleString();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm">
        Window: {window}
      </span>
      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-sm">
        Last Update: {formattedTime}
      </span>
    </div>
  );
};

const ContainerMetrics = ({ container }) => {
  const formatMetric = (value, type) => {
    if (type === 'cpu') {
      const cpuValue = parseFloat(value.replace('n', '')) / 1000000000;
      return `${cpuValue.toFixed(3)} cores`;
    }
    if (type === 'memory') {
      const memoryValue = parseInt(value.replace('Ki', ''));
      return `${(memoryValue / 1024).toFixed(2)} Mi`;
    }
    return value;
  };

  return (
    <div className="bg-white rounded-lg border mb-4 last:mb-0">
      <div className="p-4 border-b bg-gray-50">
        <h4 className="font-medium">{container.name}</h4>
      </div>
      <div className="p-4">
        <table className="w-full">
          <tbody>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">CPU</td>
              <td className="py-2 px-3">{formatMetric(container.usage.cpu, 'cpu')}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Memory</td>
              <td className="py-2 px-3">{formatMetric(container.usage.memory, 'memory')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PodMetricsDetails = ({ items = [] }) => {
  const [expandedPods, setExpandedPods] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(pod => pod.metadata.namespace))].sort();

  // Filter and paginate pods
  const filteredPods = useMemo(() => {
    return items.filter(pod => {
      const matchNamespace = !filters.namespace || pod.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        pod.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered pods
  const paginatedPods = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPods.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPods, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPods.length / itemsPerPage);

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

  const togglePod = (podIndex) => {
    setExpandedPods(prev => ({
      ...prev,
      [podIndex]: !prev[podIndex]
    }));
  };

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No pod metrics available
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
        Showing {paginatedPods.length} of {filteredPods.length} pods
      </div>

      {/* Pods List */}
      {paginatedPods.map((pod, podIndex) => (
        <div key={`${pod.metadata.namespace}-${pod.metadata.name}`} className="bg-white rounded-lg shadow">
          <button
            onClick={() => togglePod(podIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{pod.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {pod.metadata.namespace}
                  </p>
                </div>
                <MetricsStatus timestamp={pod.timestamp} window={pod.window} />
              </div>
            </div>
            {expandedPods[podIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedPods[podIndex] && (
            <div className="p-6 border-t border-gray-200">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Container Metrics</h3>
                  {pod.containers.map((container, index) => (
                    <ContainerMetrics key={index} container={container} />
                  ))}
                </div>
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

export default PodMetricsDetails;