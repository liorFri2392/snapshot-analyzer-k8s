// const ClaimReferenceDetails = ({ claimRef }) => {
//   if (!claimRef) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-center text-gray-500">
//         No claim reference found
//       </div>
//     );
//   }
//
//   const details = [
//     { label: 'Kind', value: claimRef.kind },
//     { label: 'Name', value: claimRef.name },
//     { label: 'Namespace', value: claimRef.namespace },
//     { label: 'UID', value: claimRef.uid },
//     { label: 'API Version', value: claimRef.apiVersion },
//     { label: 'Resource Version', value: claimRef.resourceVersion }
//   ];
//
//   return (
//     <div className="bg-white rounded-lg">
//       <table className="w-full text-left">
//         <thead className="bg-gray-50">
//           <tr>
//             <th className="py-2 px-3 font-medium">Field</th>
//             <th className="py-2 px-3 font-medium">Value</th>
//           </tr>
//         </thead>
//         <tbody>
//           {details.map(({ label, value }) => (
//             value !== undefined && (
//               <tr key={label} className="border-t">
//                 <td className="py-2 px-3 font-medium">{label}</td>
//                 <td className="py-2 px-3 break-all">{value}</td>
//               </tr>
//             )
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// const MetadataTable = ({ metadata, title }) => {
//   const entries = Object.entries(metadata || {}).sort((a, b) => a[0].localeCompare(b[0]));
//
//   if (entries.length === 0) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
//         No {title.toLowerCase()} found
//       </div>
//     );
//   }
//
//   return (
//     <div className="bg-white rounded-lg">
//       <table className="w-full text-left">
//         <thead className="bg-gray-50">
//           <tr>
//             <th className="py-2 px-3 font-medium">Key</th>
//             <th className="py-2 px-3 font-medium">Value</th>
//           </tr>
//         </thead>
//         <tbody>
//           {entries.map(([key, value]) => (
//             <tr key={key} className="border-t">
//               <td className="py-2 px-3">{key}</td>
//               <td className="py-2 px-3 break-all">{value}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// const NodeAffinityDetails = ({ nodeAffinity }) => {
//   if (!nodeAffinity) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-center text-gray-500">
//         No node affinity rules defined
//       </div>
//     );
//   }
//
//   return (
//     <div className="space-y-6">
//       {nodeAffinity.required && (
//         <div className="bg-white rounded-lg">
//           <h3 className="text-lg font-medium p-4 border-b">Required Node Selector Terms</h3>
//           {nodeAffinity.required.nodeSelectorTerms.map((term, termIndex) => (
//             <div key={termIndex} className="p-4 border-b last:border-b-0">
//               <h4 className="font-medium mb-2">Term {termIndex + 1}</h4>
//               {term.matchExpressions && (
//                 <table className="w-full text-left">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="py-2 px-3 font-medium">Key</th>
//                       <th className="py-2 px-3 font-medium">Operator</th>
//                       <th className="py-2 px-3 font-medium">Values</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {term.matchExpressions.map((expr, exprIndex) => (
//                       <tr key={exprIndex} className="border-t">
//                         <td className="py-2 px-3">{expr.key}</td>
//                         <td className="py-2 px-3">{expr.operator}</td>
//                         <td className="py-2 px-3">{expr.values?.join(', ') || 'N/A'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

const PersistentVolumeStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status.phase) {
      case 'Bound':
        return 'text-green-600 bg-green-50';
      case 'Available':
        return 'text-yellow-600 bg-yellow-50';
      case 'Released':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
      {status.phase}
    </span>
  );
};

const PersistentVolumeDetails = ({ items = [] }) => {
  const [expandedVolumes, setExpandedVolumes] = useState({});
  const [activeTab, setActiveTab] = useState({});
  const [filters, setFilters] = useState({
    namespace: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique namespaces from claimRefs
  const namespaces = [...new Set(
    items.map(pv => pv.spec.claimRef?.namespace).filter(Boolean)
  )].sort();

  // Filter and paginate persistent volumes
  const filteredVolumes = useMemo(() => {
    return items.filter(pv => {
      const matchNamespace = !filters.namespace || 
        pv.spec.claimRef?.namespace === filters.namespace;
      const matchSearch = !filters.search ||
        pv.metadata.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        pv.spec.claimRef?.name.toLowerCase().includes(filters.search.toLowerCase());

      return matchNamespace && matchSearch;
    });
  }, [items, filters]);

  // Paginate filtered volumes
  const paginatedVolumes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVolumes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVolumes, currentPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVolumes.length / itemsPerPage);

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

  const toggleVolume = (volumeIndex) => {
    setExpandedVolumes(prev => ({
      ...prev,
      [volumeIndex]: !prev[volumeIndex]
    }));
  };

  const getActiveTab = (volumeIndex) => {
    return activeTab[volumeIndex] || 'details';
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'spec', label: 'Spec' },
    { id: 'status', label: 'Status' },
    { id: 'claim', label: 'Claim Ref' },
    { id: 'labels', label: 'Labels' },
    { id: 'annotations', label: 'Annotations' },
    { id: 'affinity', label: 'Node Affinity' }
  ];

  if (!items?.length) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        No persistent volume details available
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
            placeholder="Search by name or claim..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedVolumes.length} of {filteredVolumes.length} persistent volumes
      </div>

      {/* Persistent Volume List */}
      {paginatedVolumes.map((pv, volumeIndex) => (
        <div key={pv.metadata.uid} className="bg-white rounded-lg shadow">
          <button
            onClick={() => toggleVolume(volumeIndex)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{pv.metadata.name}</h3>
                  <p className="text-sm text-gray-500">
                    {pv.spec.claimRef 
                      ? `Claimed by: ${pv.spec.claimRef.name} (${pv.spec.claimRef.namespace})`
                      : 'No claim'
                    }
                  </p>
                </div>
                <PersistentVolumeStatus status={pv.status} />
              </div>
            </div>
            {expandedVolumes[volumeIndex] ? (
              <ChevronDown className="w-5 h-5 ml-4" />
            ) : (
              <ChevronRight className="w-5 h-5 ml-4" />
            )}
          </button>

          {expandedVolumes[volumeIndex] && (
            <div>
              <div className="border-t border-gray-200">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(prev => ({ ...prev, [volumeIndex]: tab.id }))}
                      className={`
                        px-6 py-4 text-sm font-medium whitespace-nowrap
                        focus:outline-none
                        ${getActiveTab(volumeIndex) === tab.id
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
                {getActiveTab(volumeIndex) === 'details' && (
                  <MetadataDetails metadata={pv.metadata} />
                )}
                {getActiveTab(volumeIndex) === 'spec' && (
                  <SpecDetails spec={pv.spec} />
                )}
                {getActiveTab(volumeIndex) === 'status' && (
                  <StatusDetails status={pv.status} />
                )}
                {getActiveTab(volumeIndex) === 'claim' && (
                  <ClaimReferenceDetails claimRef={pv.spec.claimRef} />
                )}
                {getActiveTab(volumeIndex) === 'labels' && (
                  <MetadataTable metadata={pv.metadata.labels} title="Labels" />
                )}
                {getActiveTab(volumeIndex) === 'annotations' && (
                  <MetadataTable metadata={pv.metadata.annotations} title="Annotations" />
                )}
                {getActiveTab(volumeIndex) === 'affinity' && (
                  <NodeAffinityDetails nodeAffinity={pv.spec.nodeAffinity} />
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
            value !== undefined && (
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

// const MetadataTable = ({ metadata, title }) => {
//   const entries = Object.entries(metadata || {}).sort((a, b) => a[0].localeCompare(b[0]));
//
//   if (entries.length === 0) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-gray-500 text-center">
//         No {title.toLowerCase()} found
//       </div>
//     );
//   }
//
//   return (
//     <div className="bg-white rounded-lg">
//       <table className="w-full text-left">
//         <thead className="bg-gray-50">
//           <tr>
//             <th className="py-2 px-3 font-medium">Key</th>
//             <th className="py-2 px-3 font-medium">Value</th>
//           </tr>
//         </thead>
//         <tbody>
//           {entries.map(([key, value]) => (
//             <tr key={key} className="border-t">
//               <td className="py-2 px-3">{key}</td>
//               <td className="py-2 px-3 break-all">{value}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// const NodeAffinityDetails = ({ nodeAffinity }) => {
//   if (!nodeAffinity) {
//     return (
//       <div className="bg-white rounded-lg p-4 text-center text-gray-500">
//         No node affinity rules defined
//       </div>
//     );
//   }
//
//   return (
//     <div className="space-y-6">
//       {nodeAffinity.required && (
//         <div className="bg-white rounded-lg">
//           <h3 className="text-lg font-medium p-4 border-b">Required Node Selector Terms</h3>
//           {nodeAffinity.required.nodeSelectorTerms.map((term, termIndex) => (
//             <div key={termIndex} className="p-4 border-b last:border-b-0">
//               <h4 className="font-medium mb-2">Term {termIndex + 1}</h4>
//               {term.matchExpressions && (
//                 <table className="w-full text-left">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="py-2 px-3 font-medium">Key</th>
//                       <th className="py-2 px-3 font-medium">Operator</th>
//                       <th className="py-2 px-3 font-medium">Values</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {term.matchExpressions.map((expr, exprIndex) => (
//                       <tr key={exprIndex} className="border-t">
//                         <td className="py-2 px-3">{expr.key}</td>
//                         <td className="py-2 px-3">{expr.operator}</td>
//                         <td className="py-2 px-3">{expr.values?.join(', ') || 'N/A'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

const SpecDetails = ({ spec }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg">
        <h3 className="text-lg font-medium p-4 border-b">Volume Configuration</h3>
        <table className="w-full text-left">
          <tbody>
            <tr>
              <td className="py-2 px-3 font-medium">Capacity</td>
              <td className="py-2 px-3">{spec.capacity?.storage || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Access Modes</td>
              <td className="py-2 px-3">{spec.accessModes?.join(', ') || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Storage Class</td>
              <td className="py-2 px-3">{spec.storageClassName || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Volume Mode</td>
              <td className="py-2 px-3">{spec.volumeMode || 'N/A'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Reclaim Policy</td>
              <td className="py-2 px-3">{spec.persistentVolumeReclaimPolicy || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {spec.gcePersistentDisk && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">GCE Persistent Disk Details</h3>
          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="py-2 px-3 font-medium">Disk Name</td>
                <td className="py-2 px-3">{spec.gcePersistentDisk.pdName}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Filesystem Type</td>
                <td className="py-2 px-3">{spec.gcePersistentDisk.fsType}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatusDetails = ({ status }) => {
  const details = [
    { label: 'Phase', value: status.phase }
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

const ClaimReferenceDetails = ({ claimRef = {} }) => {
  // Use default empty object to prevent undefined errors
  if (!claimRef || Object.keys(claimRef).length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-center text-gray-500">
        No claim reference found
      </div>
    );
  }

  const details = [
    { label: 'Kind', value: claimRef.kind },
    { label: 'Name', value: claimRef.name },
    { label: 'Namespace', value: claimRef.namespace },
    { label: 'UID', value: claimRef.uid },
    { label: 'API Version', value: claimRef.apiVersion },
    { label: 'Resource Version', value: claimRef.resourceVersion }
  ].filter(detail => detail.value !== undefined);

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

const NodeAffinityDetails = ({ nodeAffinity }) => {
  if (!nodeAffinity) {
    return (
      <div className="bg-white rounded-lg p-4 text-center text-gray-500">
        No node affinity rules defined
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {nodeAffinity.required && (
        <div className="bg-white rounded-lg">
          <h3 className="text-lg font-medium p-4 border-b">Required Node Selector Terms</h3>
          {nodeAffinity.required.nodeSelectorTerms.map((term, termIndex) => (
            <div key={termIndex} className="p-4 border-b last:border-b-0">
              <h4 className="font-medium mb-2">Term {termIndex + 1}</h4>
              {term.matchExpressions && (
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 font-medium">Key</th>
                      <th className="py-2 px-3 font-medium">Operator</th>
                      <th className="py-2 px-3 font-medium">Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {term.matchExpressions.map((expr, exprIndex) => (
                      <tr key={exprIndex} className="border-t">
                        <td className="py-2 px-3">{expr.key}</td>
                        <td className="py-2 px-3">{expr.operator}</td>
                        <td className="py-2 px-3">{expr.values?.join(', ') || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersistentVolumeDetails;