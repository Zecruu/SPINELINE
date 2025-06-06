import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ChevronDownIcon,
  StarIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const DxClusterSelector = ({ onSelectCodes, buttonText = "Insert Dx Cluster", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const dropdownRef = useRef(null);

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
    if (isOpen) {
      loadFavorites();
      loadClusters();
    }
  }, [isOpen, selectedCategory]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFavorites = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/dx-clusters?favorites=true', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFavorites(response.data.clusters);
      }
    } catch (error) {
      console.error('Error loading favorite clusters:', error);
    }
  };

  const loadClusters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams();
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`/api/dx-clusters?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Filter out favorites to avoid duplicates
        const nonFavorites = response.data.clusters.filter(cluster => !cluster.isFavorite);
        setClusters(nonFavorites);
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadClusters();
  };

  const selectCluster = async (cluster) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/dx-clusters/${cluster._id}/apply`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSelectCodes(response.data.codes);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error applying cluster:', error);
    }
  };

  const ClusterItem = ({ cluster, isFavorite = false }) => (
    <div
      onClick={() => selectCluster(cluster)}
      className="flex items-center justify-between p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          {isFavorite && <StarIconSolid className="h-4 w-4 text-yellow-400" />}
          <h4 className="font-medium text-white">{cluster.displayName}</h4>
        </div>
        <p className="text-sm text-gray-400">{cluster.category}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {cluster.codes.slice(0, 4).map((code, index) => (
            <span
              key={index}
              className="inline-block px-1.5 py-0.5 bg-gray-700 text-xs text-gray-300 rounded"
            >
              {code.code}
            </span>
          ))}
          {cluster.codes.length > 4 && (
            <span className="inline-block px-1.5 py-0.5 bg-gray-600 text-xs text-gray-400 rounded">
              +{cluster.codes.length - 4}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-500 ml-2">
        {cluster.codeCount} codes
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <PlusIcon className="h-4 w-4" />
        <span>{buttonText}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Search and Filter Header */}
          <div className="p-3 border-b border-gray-700">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search clusters or ICD-10 codes..."
                  className="w-full pl-8 pr-16 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <button
                  onClick={handleSearch}
                  className="absolute right-1 top-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-750 border-b border-gray-700">
                  <h3 className="text-sm font-medium text-yellow-400 flex items-center space-x-1">
                    <StarIconSolid className="h-4 w-4" />
                    <span>Favorites</span>
                  </h3>
                </div>
                {favorites.map((cluster) => (
                  <ClusterItem key={cluster._id} cluster={cluster} isFavorite={true} />
                ))}
              </div>
            )}

            {/* All Clusters Section */}
            {clusters.length > 0 && (
              <div>
                {favorites.length > 0 && (
                  <div className="px-3 py-2 bg-gray-750 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400">All Clusters</h3>
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  clusters.map((cluster) => (
                    <ClusterItem key={cluster._id} cluster={cluster} />
                  ))
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && favorites.length === 0 && clusters.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm">No Dx Clusters found</p>
                <p className="text-gray-500 text-xs mt-1">
                  {searchTerm ? 'Try a different search term' : 'Create clusters in Settings'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-700 bg-gray-750">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to cluster management - you can customize this
                window.location.href = '/settings?tab=dx-clusters';
              }}
              className="w-full px-3 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded"
            >
              Manage Dx Clusters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DxClusterSelector;
