import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, X } from 'lucide-react';

const STORAGE_KEY = 'registeredClusters';

const saveToLocalStorage = (clusters) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clusters));
    console.log('Saved clusters to localStorage:', clusters);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('Loaded clusters from localStorage:', parsed);
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

const ClusterForm = ({
  cluster = { clusterId: '', alias: '', region: 'US', apiKey: '' },
  onSubmit,
  onCancel,
  isEdit = false
}) => {
  const [formData, setFormData] = useState(cluster);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.clusterId.trim()) newErrors.clusterId = 'Cluster ID is required';
    if (!formData.alias.trim()) newErrors.alias = 'Cluster Alias is required';
    if (!formData.region) newErrors.region = 'Region is required';
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {isEdit ? 'Edit Cluster' : 'Register New Cluster'}
            </h2>
            <p className="text-gray-500">
              {isEdit ? 'Modify cluster settings' : 'Add a new cluster for monitoring'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <>
          <div>
            <input
              type="text"
              placeholder="Cluster ID (required)"
              value={formData.clusterId}
              onChange={(e) => setFormData({ ...formData, clusterId: e.target.value })}
              disabled={isEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                ${errors.clusterId ? 'border-red-500' : ''} 
                ${isEdit ? 'bg-gray-100' : ''}`}
            />
            {errors.clusterId && (
              <p className="text-red-500 text-sm mt-1">{errors.clusterId}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Cluster Alias (required)"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                ${errors.alias ? 'border-red-500' : ''}`}
            />
            {errors.alias && (
              <p className="text-red-500 text-sm mt-1">{errors.alias}</p>
            )}
          </div>

          <div>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                ${errors.region ? 'border-red-500' : ''}`}
            >
              <option value="US">US Region</option>
              <option value="EU">EU Region</option>
            </select>
            {errors.region && (
              <p className="text-red-500 text-sm mt-1">{errors.region}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="CAST AI API Key (optional)"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                ${errors.apiKey ? 'border-red-500' : ''}`}
            />
            {errors.apiKey && (
              <p className="text-red-500 text-sm mt-1">{errors.apiKey}</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Register Cluster'}
          </button>
        </>
      </div>
    </div>
  );
};

const WelcomeScreen = ({ onClusterSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);
  const [clusters, setClusters] = useState(() => loadFromLocalStorage());

  useEffect(() => {
    saveToLocalStorage(clusters);
  }, [clusters]);

  const filteredClusters = clusters.filter(cluster =>
    cluster.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cluster.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCluster = (clusterData) => {
    const cluster = {
      ...clusterData,
      id: clusterData.clusterId,
      lastSync: new Date().toISOString(),
      dateAdded: new Date().toISOString()
    };

    if (clusters.some(c => c.id === cluster.id)) {
      alert('A cluster with this ID already exists');
      return;
    }

    setClusters(prevClusters => [...prevClusters, cluster]);
    setShowForm(false);
  };

  const handleEditCluster = (clusterData) => {
    setClusters(prevClusters =>
      prevClusters.map(cluster =>
        cluster.id === clusterData.clusterId
          ? {
              ...cluster,
              alias: clusterData.alias,
              region: clusterData.region,
              apiKey: clusterData.apiKey
            }
          : cluster
      )
    );
    setEditingCluster(null);
  };

  const handleRemoveCluster = (clusterId) => {
    if (window.confirm('Are you sure you want to remove this cluster?')) {
      setClusters(prevClusters =>
        prevClusters.filter(cluster => cluster.id !== clusterId)
      );
    }
  };

  const startEdit = (cluster) => {
    setEditingCluster({
      clusterId: cluster.id,
      alias: cluster.alias,
      region: cluster.region || 'US',
      apiKey: cluster.apiKey || ''
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cluster Explorer</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Cluster
        </button>
      </div>

      {showForm && (
        <ClusterForm
          onSubmit={handleAddCluster}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingCluster && (
        <ClusterForm
          cluster={editingCluster}
          onSubmit={handleEditCluster}
          onCancel={() => setEditingCluster(null)}
          isEdit
        />
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search clusters by alias or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredClusters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No clusters match your search' : 'No clusters registered yet'}
          </div>
        )}

        {filteredClusters.map((cluster) => (
          <div
            key={cluster.id}
            className="bg-white rounded-lg shadow-sm border p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 cursor-pointer" onClick={() => onClusterSelect(cluster.id)}>
                <h3 className="text-lg font-semibold">{cluster.alias}</h3>
                <p className="text-sm text-gray-500">ID: {cluster.id}</p>
                <p className="text-sm text-gray-500">
                  Added: {new Date(cluster.dateAdded).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Region: {cluster.region || 'US'}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(cluster);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md text-sm flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCluster(cluster.id);
                    }}
                    className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-md text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Last synced: {new Date(cluster.lastSync).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;