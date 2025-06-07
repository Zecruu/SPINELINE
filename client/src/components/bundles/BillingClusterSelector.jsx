import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlusIcon, ChevronDownIcon, StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const BillingClusterSelector = ({ onSelectCodes, buttonText = "Insert Billing Cluster", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const dropdownRef = useRef(null);

  const categories = [
    'Neck',
    'Back', 
    'Wellness',
    'Spine',
    'Extremity',
    'Modality',
    'Evaluation',
    'Custom'
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
      const response = await axios.get('/api/billing-clusters/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setFavorites(response.data.favorites || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadClusters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await axios.get(`/api/billing-clusters?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClusters(response.data.clusters || []);
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCluster = async (cluster) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/billing-clusters/${cluster._id}/apply`,
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
          <h4 className="font-medium text-white">{cluster.displayName || cluster.name}</h4>
        </div>
        <p className="text-sm text-gray-400">{cluster.tags?.join(', ') || 'No tags'}</p>
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
        {cluster.codes.length} codes
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
        <div className="absolute top-full left-0 mt-1 w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-600">
            <h3 className="text-lg font-medium text-white mb-3">Select Billing Cluster</h3>
            
            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clusters..."
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none mb-3"
            />
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">Loading clusters...</div>
            ) : (
              <>
                {/* Favorites */}
                {favorites.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                      <h4 className="text-sm font-medium text-gray-300">Favorites</h4>
                    </div>
                    {favorites.map(cluster => (
                      <ClusterItem key={cluster._id} cluster={cluster} isFavorite={true} />
                    ))}
                  </div>
                )}

                {/* All Clusters */}
                {clusters.length > 0 ? (
                  <div>
                    {favorites.length > 0 && (
                      <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                        <h4 className="text-sm font-medium text-gray-300">All Clusters</h4>
                      </div>
                    )}
                    {clusters.map(cluster => (
                      <ClusterItem key={cluster._id} cluster={cluster} />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-400">
                    {searchTerm ? `No clusters found matching "${searchTerm}"` : 'No billing clusters available'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingClusterSelector;
