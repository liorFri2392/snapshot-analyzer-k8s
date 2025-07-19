import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const ServiceMetadataTable = ({ metadata }) => {
  const metadataEntries = [
    { label: 'Name', value: metadata.name },
    { label: 'Namespace', value: metadata.namespace },
    { label: 'UID', value: metadata.uid },
    { label: 'Resource Version', value: metadata.resourceVersion },
    { label: 'Creation Timestamp', value: metadata.creationTimestamp }
  ];

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
          {metadataEntries.map(({ label, value }) => (
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

const PortsTable = ({ ports }) => {
  if (!ports || ports.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500">
        No ports configured
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Protocol</th>
            <th className="py-2 px-3 font-medium">Port</th>
            <th className="py-2 px-3 font-medium">Target Port</th>
            <th className="py-2 px-3 font-medium">Node Port</th>
          </tr>
        </thead>
        <tbody>
          {ports.map((port, index) => (
            <tr key={index} className="border-t">
              <td className="py-2 px-3">{port.protocol}</td>
              <td className="py-2 px-3">{port.port}</td>
              <td className="py-2 px-3">{port.targetPort}</td>
              <td className="py-2 px-3">{port.nodePort || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SpecDetailsTable = ({ spec }) => {
  const specDetails = [
    { label: 'Type', value: spec.type },
    { label: 'Cluster IP', value: spec.clusterIP },
    { label: 'Session Affinity', value: spec.sessionAffinity },
    { label: 'IP Family Policy', value: spec.ipFamilyPolicy },
    { label: 'Internal Traffic Policy', value: spec.internalTrafficPolicy },
    { label: 'External Traffic Policy', value: spec.externalTrafficPolicy },
    { label: 'IP Families', value: spec.ipFamilies?.join(', ') },
    { label: 'Cluster IPs', value: spec.clusterIPs?.join(', ') }
  ];

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Property</th>
            <th className="py-2 px-3 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {specDetails.map(({ label, value }) => (
            value && (
              <tr key={label} className="border-t">
                <td className="py-2 px-3 font-medium">{label}</td>
                <td className="py-2 px-3 break-all">{value}</td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ServiceSelector = ({ selector }) => {
  if (!selector || Object.keys(selector).length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500">
        No selector configured
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
          {Object.entries(selector).map(([key, value]) => (
            <tr key={key} className="border-t">
              <td className="py-2 px-3">{key}</td>
              <td className="py-2 px-3">{value}</td>
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
      <div className="bg-white rounded-lg p-4 text-gray-500">
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

const ServiceDetails = ({ items = [] }) => {
  const [expandedServices, setExpandedServices] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const servicesPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(service => service.metadata.namespace))].sort();

  // Filter and paginate services
  const filteredServices = useMemo(() => {
    return items.filter(service => {
      const matchNamespace = !filters.namespace || service.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        service.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered services
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * servicesPerPage;
    return filteredServices.slice(startIndex, startIndex + servicesPerPage);
  }, [filteredServices, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredServices.length / servicesPerPage);

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

  const toggleService = (serviceIndex) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceIndex]: !prev[serviceIndex]
    }));
  };

  const getActiveTab = (serviceIndex) => {
    return activeTab[serviceIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'ports', label: 'Ports' },
    { id: 'spec', label: 'Spec' },
    { id: 'selector', label: 'Selector' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No service details available
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
            placeholder="Search by service name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedServices.length} of {filteredServices.length} services
      </div>

      {/* Service List */}
      {paginatedServices.map((service, serviceIndex) => (
        <div key={service.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleService(serviceIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <h3 className="text-lg font-medium">{service.metadata.name}</h3>
              <p className="text-sm text-gray-500">
                Namespace: {service.metadata.namespace} | Type: {service.spec.type}
              </p>
            </div>
            {expandedServices[serviceIndex] ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {expandedServices[serviceIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [serviceIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(serviceIndex) === tab.id
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
                {getActiveTab(serviceIndex) === 'details' && (
                  <ServiceMetadataTable metadata={service.metadata} />
                )}
                {getActiveTab(serviceIndex) === 'ports' && (
                  <PortsTable ports={service.spec.ports} />
                )}
                {getActiveTab(serviceIndex) === 'spec' && (
                  <SpecDetailsTable spec={service.spec} />
                )}
                {getActiveTab(serviceIndex) === 'selector' && (
                  <ServiceSelector selector={service.spec.selector} />
                )}
                {getActiveTab(serviceIndex) === 'labels' && (
                  <MetadataTable metadata={service.metadata.labels} title="Labels" />
                )}
                {getActiveTab(serviceIndex) === 'annotations' && (
                  <MetadataTable metadata={service.metadata.annotations} title="Annotations" />
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

export default ServiceDetails;