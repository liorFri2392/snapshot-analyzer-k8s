import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const NetworkPolicyDetails = ({ items = [] }) => {
  const [expandedPolicies, setExpandedPolicies] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces
  const namespaces = [...new Set(items.map(policy => policy.metadata.namespace))].sort();

  // Filter and paginate Network Policies
  const filteredPolicies = useMemo(() => {
    return items.filter(policy => {
      const matchNamespace = !filters.namespace || policy.metadata.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        policy.metadata.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered policies
  const paginatedPolicies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPolicies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPolicies, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);

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

  const togglePolicy = (policyIndex) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [policyIndex]: !prev[policyIndex]
    }));
  };

  const getActiveTab = (policyIndex) => {
    return activeTab[policyIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'spec', label: 'Spec' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No network policies available
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
        Showing {paginatedPolicies.length} of {filteredPolicies.length} network policies
      </div>

      {/* Network Policy List */}
      {paginatedPolicies.map((policy, policyIndex) => (
        <div key={policy.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => togglePolicy(policyIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{policy.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    Namespace: {policy.metadata.namespace}
                  </p>
                </div>
                <NetworkPolicyStatus policy={policy} />
              </div>
            </div>
            {expandedPolicies[policyIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedPolicies[policyIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [policyIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(policyIndex) === tab.id
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
                {getActiveTab(policyIndex) === 'details' && (
                  <NetworkPolicyMetadataDetails metadata={policy.metadata} />
                )}
                {getActiveTab(policyIndex) === 'spec' && (
                  <NetworkPolicySpecDetails spec={policy.spec} />
                )}
                {getActiveTab(policyIndex) === 'labels' && (
                  <MetadataTable metadata={policy.metadata.labels} title="Labels" />
                )}
                {getActiveTab(policyIndex) === 'annotations' && (
                  <MetadataTable metadata={policy.metadata.annotations} title="Annotations" />
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

const NetworkPolicyStatus = ({ policy }) => {
  const policyTypes = policy.spec?.policyTypes || [];
  const ingressRules = policy.spec?.ingress || [];
  const egressRules = policy.spec?.egress || [];

  const getStatusColor = () => {
    if (policyTypes.length > 0) {
      return 'text-green-600 bg-green-50';
    }
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {policyTypes.join(', ') || 'No Policy Types'}
      </span>
      <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm font-medium">
        {ingressRules.length} Ingress, {egressRules.length} Egress
      </span>
    </div>
  );
};

const NetworkPolicyMetadataDetails = ({ metadata }) => {
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

const NetworkPolicySpecDetails = ({ spec }) => {
  const renderSelector = (selector, title) => {
    if (!selector) return null;

    return (
      <div className="bg-white rounded-lg mb-4">
        <h3 className="text-lg font-medium p-4 border-b">{title}</h3>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-3 font-medium">Key</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(selector.matchLabels || {}).map(([key, value]) => (
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

  return (
    <div className="space-y-6">
      {/* Policy Types */}
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Policy Types</h3>
        <div className="p-4">
          {spec.policyTypes?.map(type => (
            <div key={type} className="mb-1">{type}</div>
          ))}
        </div>
      </div>

      {/* Pod Selector */}
      {renderSelector(spec.podSelector, 'Pod Selector')}

      {/* Ingress Rules */}
      {spec.ingress && spec.ingress.length > 0 && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Ingress Rules</h3>
          {spec.ingress.map((rule, ruleIndex) => (
            <div key={ruleIndex} className="p-4 border-b last:border-b-0">
              {/* Ports */}
              {rule.ports && (
                <div className="mb-2">
                  <span className="font-medium">Ports:</span>
                  {rule.ports.map((port, portIndex) => (
                    <div key={portIndex} className="ml-4">
                      {port.port} ({port.protocol})
                    </div>
                  ))}
                </div>
              )}

              {/* From Selectors */}
              {rule.from && rule.from.map((source, sourceIndex) => (
                <div key={sourceIndex} className="mt-2">
                  {source.podSelector && (
                    <div>
                      <span className="font-medium">Pod Selector:</span>
                      {Object.entries(source.podSelector.matchLabels || {}).map(([key, value]) => (
                        <div key={key} className="ml-4">{key}: {value}</div>
                      ))}
                    </div>
                  )}
                  {source.namespaceSelector && (
                    <div>
                      <span className="font-medium">Namespace Selector:</span>
                      {Object.entries(source.namespaceSelector.matchLabels || {}).map(([key, value]) => (
                        <div key={key} className="ml-4">{key}: {value}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Egress Rules */}
      {spec.egress && spec.egress.length > 0 && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Egress Rules</h3>
          {spec.egress.map((rule, ruleIndex) => (
            <div key={ruleIndex} className="p-4 border-b last:border-b-0">
              {/* Ports */}
              {rule.ports && (
                <div className="mb-2">
                  <span className="font-medium">Ports:</span>
                  {rule.ports.map((port, portIndex) => (
                    <div key={portIndex} className="ml-4">
                      {port.port} ({port.protocol})
                    </div>
                  ))}
                </div>
              )}

              {/* To Selectors */}
              {rule.to && rule.to.map((destination, destIndex) => (
                <div key={destIndex} className="mt-2">
                  {destination.podSelector && (
                    <div>
                      <span className="font-medium">Pod Selector:</span>
                      {Object.entries(destination.podSelector.matchLabels || {}).map(([key, value]) => (
                        <div key={key} className="ml-4">{key}: {value}</div>
                      ))}
                    </div>
                  )}
                  {destination.namespaceSelector && (
                    <div>
                     <span className="font-medium">Namespace Selector:</span>
                      {Object.entries(destination.namespaceSelector.matchLabels || {}).map(([key, value]) => (
                        <div key={key} className="ml-4">{key}: {value}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
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

export default NetworkPolicyDetails;