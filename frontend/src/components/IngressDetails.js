import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const IngressDetails = ({ items = [] }) => {
  const [expandedIngresses, setExpandedIngresses] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(ingress => ingress.metadata.namespace))].sort();

  // Filter and paginate Ingresses
  const filteredIngresses = useMemo(() => {
    return items.filter(ingress => {
      const matchNamespace = !filters.namespace || ingress.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        ingress.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered ingresses
  const paginatedIngresses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredIngresses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredIngresses, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredIngresses.length / itemsPerPage);

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

  const toggleIngress = (ingressIndex) => {
    setExpandedIngresses(prev => ({
      ...prev,
      [ingressIndex]: !prev[ingressIndex]
    }));
  };

  const getActiveTab = (ingressIndex) => {
    return activeTab[ingressIndex] || 'details';
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
        No ingresses available
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
        Showing {paginatedIngresses.length} of {filteredIngresses.length} ingresses
      </div>

      {/* Ingress List */}
      {paginatedIngresses.map((ingress, ingressIndex) => (
        <div key={ingress.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleIngress(ingressIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{ingress.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {ingress.metadata.namespace}
                  </p>
                </div>
                <IngressStatus ingress={ingress} />
              </div>
            </div>
            {expandedIngresses[ingressIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedIngresses[ingressIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [ingressIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(ingressIndex) === tab.id
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
                {getActiveTab(ingressIndex) === 'details' && (
                  <IngressMetadataDetails metadata={ingress.metadata} />
                )}
                {getActiveTab(ingressIndex) === 'spec' && (
                  <IngressSpecDetails spec={ingress.spec} />
                )}
                {getActiveTab(ingressIndex) === 'status' && (
                  <IngressStatusDetails
                    status={ingress.status}
                    annotations={ingress.metadata.annotations}
                  />
                )}
                {getActiveTab(ingressIndex) === 'labels' && (
                  <MetadataTable metadata={ingress.metadata.labels} title="Labels" />
                )}
                {getActiveTab(ingressIndex) === 'annotations' && (
                  <MetadataTable metadata={ingress.metadata.annotations} title="Annotations" />
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

const IngressStatus = ({ ingress }) => {
  const ingressClass = ingress.metadata?.annotations?.['kubernetes.io/ingress.class'] || 'Unknown';
  const ip = ingress.status?.loadBalancer?.ingress?.[0]?.ip;

  const getStatusColor = () => {
    return ip
      ? 'text-green-600 bg-green-50'
      : 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {ingressClass}
      </span>
      {ip && (
        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm font-medium">
          {ip}
        </span>
      )}
    </div>
  );
};

const IngressMetadataDetails = ({ metadata }) => {
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
          {metadata.finalizers && (
            <tr className="border-t">
              <td className="py-2 px-3 font-medium">Finalizers</td>
              <td className="py-2 px-3">
                {metadata.finalizers.map(finalizer => (
                  <div key={finalizer}>{finalizer}</div>
                ))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const IngressSpecDetails = ({ spec }) => {
  return (
    <div className="space-y-6">
      {spec.defaultBackend && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Default Backend</h3>
          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="py-2 px-3 font-medium">Service Name</td>
                <td className="py-2 px-3">
                  {spec.defaultBackend.service?.name || 'N/A'}
                </td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-3 font-medium">Service Port</td>
                <td className="py-2 px-3">
                  {spec.defaultBackend.service?.port?.number || 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const IngressStatusDetails = ({ status, annotations }) => {
  // Parse backend health from annotations
  const parseBackendHealth = () => {
    try {
      const backendStr = annotations?.['ingress.kubernetes.io/backends'];
      return backendStr ? JSON.parse(backendStr) : {};
    } catch (error) {
      console.error('Error parsing backend health:', error);
      return {};
    }
  };

  const backendHealth = parseBackendHealth();
  const loadBalancerIP = status?.loadBalancer?.ingress?.[0]?.ip;

  return (
    <div className="space-y-6">
      {/* Load Balancer Details */}
      {loadBalancerIP && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Load Balancer</h3>
          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="py-2 px-3 font-medium">IP Address</td>
                <td className="py-2 px-3">{loadBalancerIP}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Backend Health */}
      {Object.keys(backendHealth).length > 0 && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Backend Health</h3>
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 font-medium">Backend</th>
                <th className="py-2 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(backendHealth).map(([backend, health]) => (
                <tr key={backend} className="border-t">
                  <td className="py-2 px-3">{backend}</td>
                  <td className="py-2 px-3">{health}</td>
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
}

export default IngressDetails;