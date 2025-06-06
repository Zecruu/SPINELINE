import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PlusIcon,
  StarIcon,
  EyeSlashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const DxClustersManager = ({ onSelectCluster, showApplyButton = false }) => {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);

  const categories = [
    'Spine Conditions',
    'Joint Disorders',
    'Muscle Injuries',
    'Neurological',
    'Pain Syndromes',
    'Post-Surgical',
    'Chronic Conditions',
    'Acute Injuries',
    'Custom',
    'Other'
  ];

  useEffect(() => {
    loadClusters();
  }, [selectedCategory, showFavoritesOnly]);

  const loadClusters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams();
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (showFavoritesOnly) {
        params.append('favorites', 'true');
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`/api/dx-clusters?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClusters(response.data.clusters);
      }
    } catch (error) {
      console.error('Error loading Dx Clusters:', error);
      setError('Failed to load Dx Clusters');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadClusters();
  };

  const toggleFavorite = async (clusterId) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(
        `/api/dx-clusters/${clusterId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setClusters(prev =>
          prev.map(cluster =>
            cluster._id === clusterId
              ? { ...cluster, isFavorite: !cluster.isFavorite }
              : cluster
          )
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const toggleVisibility = async (clusterId, isHidden) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(
        `/api/dx-clusters/${clusterId}/visibility`,
        { isHidden },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setClusters(prev =>
          prev.map(cluster =>
            cluster._id === clusterId
              ? { ...cluster, isHidden }
              : cluster
          )
        );
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      setError('Failed to update visibility');
    }
  };

  const cloneCluster = async (clusterId, newName) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/dx-clusters/${clusterId}/clone`,
        { newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        loadClusters();
      }
    } catch (error) {
      console.error('Error cloning cluster:', error);
      setError('Failed to clone cluster');
    }
  };

  const deleteCluster = async (clusterId) => {
    if (!window.confirm('Are you sure you want to delete this Dx Cluster?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.delete(`/api/dx-clusters/${clusterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClusters(prev => prev.filter(cluster => cluster._id !== clusterId));
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
      setError('Failed to delete cluster');
    }
  };

  const applyCluster = async (cluster) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/dx-clusters/${cluster._id}/apply`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && onSelectCluster) {
        onSelectCluster(response.data.codes);
      }
    } catch (error) {
      console.error('Error applying cluster:', error);
      setError('Failed to apply cluster');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Dx Clusters</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create Cluster</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search clusters or ICD-10 codes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1.5 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
            showFavoritesOnly
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <StarIcon className="h-4 w-4" />
          <span>Favorites</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster._id}
            className={`bg-gray-800 rounded-lg p-4 border ${
              cluster.isHidden ? 'border-gray-600 opacity-60' : 'border-gray-700'
            } hover:border-gray-600 transition-colors`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-white truncate">
                  {cluster.displayName}
                </h3>
                <p className="text-sm text-gray-400">{cluster.category}</p>
                <p className="text-xs text-gray-500">
                  {cluster.codeCount} codes • Used {cluster.usageCount} times
                </p>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => toggleFavorite(cluster._id)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  {cluster.isFavorite ? (
                    <StarIconSolid className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => toggleVisibility(cluster._id, !cluster.isHidden)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  {cluster.isHidden ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            {cluster.description && (
              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                {cluster.description}
              </p>
            )}

            {/* Codes Preview */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {cluster.codes.slice(0, 3).map((code, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                  >
                    {code.code}
                  </span>
                ))}
                {cluster.codes.length > 3 && (
                  <span className="inline-block px-2 py-1 bg-gray-600 text-xs text-gray-400 rounded">
                    +{cluster.codes.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {showApplyButton && (
                <button
                  onClick={() => applyCluster(cluster)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Apply
                </button>
              )}
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setEditingCluster(cluster)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const newName = prompt('Enter name for cloned cluster:');
                    if (newName) cloneCluster(cluster._id, newName);
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  title="Clone"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteCluster(cluster._id)}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clusters.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No Dx Clusters found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Create your first cluster
          </button>
        </div>
      )}
    </div>
  );
};

export default DxClustersManager;
