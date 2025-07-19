import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const ClusterRoleBindingDetails = ({ items = [] }) => {
  const [expandedBindings, setExpandedBindings] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filter and paginate clusterrolebindings
  const filteredBindings = useMemo(() => {
    return items.filter(binding =>
      !filters.search ||
      binding.metadata.name.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [items, filters]);

  // Paginate filtered bindings
  const paginatedBindings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBindings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBindings, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBindings.length / itemsPerPage);

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

  const toggleBinding = (bindingIndex) => {
    setExpandedBindings(prev => ({
      ...prev,
      [bindingIndex]: !prev[bindingIndex]
    }));
  };

  const getActiveTab = (bindingIndex) => {
    return activeTab[bindingIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'roleref', label: 'Role Reference' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No ClusterRoleBinding details available
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
        Showing {paginatedBindings.length} of {filteredBindings.length} cluster role bindings
      </div>

      {/* ClusterRoleBinding List */}
      {paginatedBindings.map((binding, bindingIndex) => (
        <div key={binding.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleBinding(bindingIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div>
                <h3 className="text-lg font-medium">{binding.metadata.name}</h3>
                <p className="text-sm text-gray-500">
                  Cluster-wide Role Binding
                </p>
              </div>
            </div>
            {expandedBindings[bindingIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedBindings[bindingIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [bindingIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(bindingIndex) === tab.id
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
                {getActiveTab(bindingIndex) === 'details' && (
                  <MetadataDetails metadata={binding.metadata} />
                )}
                {getActiveTab(bindingIndex) === 'subjects' && (
                  <SubjectsList subjects={binding.subjects} />
                )}
                {getActiveTab(bindingIndex) === 'roleref' && (
                  <RoleRefDetails roleRef={binding.roleRef} />
                )}
                {getActiveTab(bindingIndex) === 'labels' && (
                  <MetadataTable metadata={binding.metadata.labels} title="Labels" />
                )}
                {getActiveTab(bindingIndex) === 'annotations' && (
                  <MetadataTable metadata={binding.metadata.annotations} title="Annotations" />
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

const SubjectsList = ({ subjects = [] }) => {
  if (!subjects?.length) {
    return (
      <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
        No subjects found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg">
      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 font-medium">Kind</th>
            <th className="py-2 px-3 font-medium">Name</th>
            <th className="py-2 px-3 font-medium">API Group</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject, index) => (
            <tr key={index} className="border-t">
              <td className="py-2 px-3">{subject.kind}</td>
              <td className="py-2 px-3">{subject.name}</td>
              <td className="py-2 px-3">{subject.apiGroup || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RoleRefDetails = ({ roleRef }) => {
  const details = [
    { label: 'API Group', value: roleRef.apiGroup },
    { label: 'Kind', value: roleRef.kind },
    { label: 'Name', value: roleRef.name }
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

export default ClusterRoleBindingDetails;