import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, ExternalLink } from 'lucide-react';

export const NodeDetailsTable = ({ node }) => {
  const metadata = node?.metadata || {};
  const status = node?.status || {};
  const nodeInfo = status?.nodeInfo || {};

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Node Details</h4>
      <table className="w-full text-left border-collapse">
        <tbody>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Name</th>
            <td className="py-2 px-3">{metadata.name || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">UID</th>
            <td className="py-2 px-3">{metadata.uid || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Creation Timestamp</th>
            <td className="py-2 px-3">{metadata.creationTimestamp || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Kubelet Version</th>
            <td className="py-2 px-3">{nodeInfo.kubeletVersion || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Container Runtime</th>
            <td className="py-2 px-3">{nodeInfo.containerRuntimeVersion || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">OS</th>
            <td className="py-2 px-3">{nodeInfo.operatingSystem || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">OS Image</th>
            <td className="py-2 px-3">{nodeInfo.osImage || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Architecture</th>
            <td className="py-2 px-3">{nodeInfo.architecture || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Kernel Version</th>
            <td className="py-2 px-3">{nodeInfo.kernelVersion || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Machine ID</th>
            <td className="py-2 px-3">{nodeInfo.machineID || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">System UUID</th>
            <td className="py-2 px-3">{nodeInfo.systemUUID || 'N/A'}</td>
          </tr>
          <tr className="border-b">
            <th className="py-2 px-3 font-medium">Boot ID</th>
            <td className="py-2 px-3">{nodeInfo.bootID || 'N/A'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const NetworkDetailsTable = ({ node }) => {
  const spec = node?.spec || {};
  const status = node?.status || {};
  const addresses = status.addresses || [];

  return (
    <div className="bg-white p-4 rounded-lg space-y-4">
      <div>
        <h4 className="text-lg font-semibold mb-4">Network Configuration</h4>
        <table className="w-full text-left border-collapse">
          <tbody>
            <tr className="border-b">
              <th className="py-2 px-3 font-medium">Pod CIDR</th>
              <td className="py-2 px-3">{spec.podCIDR || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <th className="py-2 px-3 font-medium">Pod CIDRs</th>
              <td className="py-2 px-3">
                {spec.podCIDRs ? spec.podCIDRs.join(', ') : 'N/A'}
              </td>
            </tr>
            <tr className="border-b">
              <th className="py-2 px-3 font-medium">Provider ID</th>
              <td className="py-2 px-3">{spec.providerID || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-4">Node Addresses</h4>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {addresses.length > 0 ? (
              addresses.map((addr, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-3">{addr.type || 'N/A'}</td>
                  <td className="py-2 px-3">{addr.address || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="py-2 px-3 text-gray-500 text-center">
                  No addresses found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TaintsTable = ({ node }) => {
  const taints = node?.spec?.taints || [];

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Node Taints</h4>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-3 font-medium">Key</th>
            <th className="py-2 px-3 font-medium">Value</th>
            <th className="py-2 px-3 font-medium">Effect</th>
          </tr>
        </thead>
        <tbody>
          {taints.length > 0 ? (
            taints.map((taint, index) => (
              <tr key={index} className="border-b">
                <td className="py-2 px-3">{taint.key}</td>
                <td className="py-2 px-3">{taint.value}</td>
                <td className="py-2 px-3">{taint.effect}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="py-2 px-3 text-gray-500 text-center">
                No taints found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export const CapacityTable = ({ node }) => {
  const status = node?.status || {};
  const capacity = status.capacity || {};
  const allocatable = status.allocatable || {};

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Resources</h4>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-3 font-medium">Resource</th>
            <th className="py-2 px-3 font-medium">Capacity</th>
            <th className="py-2 px-3 font-medium">Allocatable</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys({ ...capacity, ...allocatable }).sort().map(resource => (
            <tr key={resource} className="border-b">
              <td className="py-2 px-3">{resource}</td>
              <td className="py-2 px-3">{capacity[resource] || 'N/A'}</td>
              <td className="py-2 px-3">{allocatable[resource] || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ConditionsTable = ({ node }) => {
  const conditions = node?.status?.conditions || [];

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Node Conditions</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Last Heartbeat</th>
              <th className="py-2 px-3 font-medium">Last Transition</th>
              <th className="py-2 px-3 font-medium">Reason</th>
              <th className="py-2 px-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {conditions.length > 0 ? (
              conditions.map((condition, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-3">{condition.type}</td>
                  <td className="py-2 px-3">{condition.status}</td>
                  <td className="py-2 px-3">{condition.lastHeartbeatTime}</td>
                  <td className="py-2 px-3">{condition.lastTransitionTime}</td>
                  <td className="py-2 px-3">{condition.reason}</td>
                  <td className="py-2 px-3">{condition.message}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-2 px-3 text-gray-500 text-center">
                  No conditions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const MetadataTable = ({ metadata, title }) => {
  const entries = Object.entries(metadata || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">{title}</h4>
      {entries.length > 0 ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 font-medium">Key</th>
              <th className="py-2 px-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b">
                <td className="py-2 px-3 break-words">{key}</td>
                <td className="py-2 px-3 break-words">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No {title.toLowerCase()} found</p>
      )}
    </div>
  );
};

export const ImagesTable = ({ node }) => {
  const images = node?.status?.images || [];

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Node Images</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 font-medium">Names</th>
              <th className="py-2 px-3 font-medium">Size (bytes)</th>
            </tr>
          </thead>
          <tbody>
            {images.length > 0 ? (
              images.map((image, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-3">
                    <ul className="list-disc list-inside">
                      {image.names.map((name, nameIndex) => (
                        <li key={nameIndex} className="truncate hover:text-clip hover:overflow-visible">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 px-3">{image.sizeBytes?.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="py-2 px-3 text-gray-500 text-center">
                  No images found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const NodePodsTable = ({ node }) => {
  const [pods, setPods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNodePods = async () => {
      if (!node?.metadata?.name) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the node pods report
        const response = await fetch('http://localhost:8000/reports/node-pods');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch node pods: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Get pods for this specific node
        const podsForNode = data[node.metadata.name] || [];
        setPods(podsForNode);
      } catch (err) {
        console.error('Error fetching node pods:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodePods();
  }, [node?.metadata?.name]);

  const getStatusColor = (phase) => {
    switch (phase?.toLowerCase()) {
      case 'running':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'succeeded':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (phase) => {
    switch (phase?.toLowerCase()) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const handlePodClick = (podName) => {
    // Navigate to pod details view
    // This would be implemented based on your app's routing mechanism
    // For now, we'll open a search for this pod in the resource search
    window.dispatchEvent(new CustomEvent('navigateToPodDetails', { 
      detail: { podName }
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading pods...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-red-500">
        <p>Error loading pods: {error}</p>
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg text-center text-gray-500">
        <p>No pods running on this node</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg">
      <h4 className="text-lg font-semibold mb-4">Pods ({pods.length})</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Namespace</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Containers</th>
              <th className="py-2 px-3 font-medium">Created</th>
              <th className="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => (
              <tr key={pod.metadata.uid} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handlePodClick(pod.metadata.name)}>
                <td className="py-2 px-3 font-medium">{pod.metadata.name}</td>
                <td className="py-2 px-3">{pod.metadata.namespace}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center">
                    <span className="mr-2">{getStatusIcon(pod.status.phase)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pod.status.phase)}`}>
                      {pod.status.phase}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3">{pod.spec.containers.length}</td>
                <td className="py-2 px-3">
                  {new Date(pod.metadata.creationTimestamp).toLocaleDateString()} 
                  {' '}
                  {new Date(pod.metadata.creationTimestamp).toLocaleTimeString()}
                </td>
                <td className="py-2 px-3">
                  <button 
                    className="text-blue-500 hover:text-blue-700 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePodClick(pod.metadata.name);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};