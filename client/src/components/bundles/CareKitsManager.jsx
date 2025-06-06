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
  MagnifyingGlassIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const CareKitsManager = ({ onSelectKit, showApplyButton = false }) => {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTreatmentType, setSelectedTreatmentType] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);

  const categories = [
    'Initial Evaluation',
    'Follow-up Treatment',
    'Maintenance Care',
    'Acute Care Package',
    'Chronic Care Package',
    'Post-Surgical',
    'Sports Injury',
    'Wellness Package',
    'Custom',
    'Other'
  ];

  const treatmentTypes = [
    'Chiropractic',
    'Physical Therapy',
    'Massage Therapy',
    'Acupuncture',
    'Combined Therapy',
    'Evaluation Only',
    'Other'
  ];

  useEffect(() => {
    loadKits();
  }, [selectedCategory, selectedTreatmentType, showFavoritesOnly]);

  const loadKits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams();
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedTreatmentType !== 'all') {
        params.append('treatmentType', selectedTreatmentType);
      }
      if (showFavoritesOnly) {
        params.append('favorites', 'true');
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`/api/care-kits?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setKits(response.data.kits);
      }
    } catch (error) {
      console.error('Error loading Care Kits:', error);
      setError('Failed to load Care Kits');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadKits();
  };

  const toggleFavorite = async (kitId) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(
        `/api/care-kits/${kitId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setKits(prev =>
          prev.map(kit =>
            kit._id === kitId
              ? { ...kit, isFavorite: !kit.isFavorite }
              : kit
          )
        );
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const toggleVisibility = async (kitId, isHidden) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(
        `/api/care-kits/${kitId}/visibility`,
        { isHidden },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setKits(prev =>
          prev.map(kit =>
            kit._id === kitId
              ? { ...kit, isHidden }
              : kit
          )
        );
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      setError('Failed to update visibility');
    }
  };

  const cloneKit = async (kitId, newName) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/care-kits/${kitId}/clone`,
        { newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        loadKits();
      }
    } catch (error) {
      console.error('Error cloning kit:', error);
      setError('Failed to clone kit');
    }
  };

  const deleteKit = async (kitId) => {
    if (!window.confirm('Are you sure you want to delete this Care Kit?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.delete(`/api/care-kits/${kitId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setKits(prev => prev.filter(kit => kit._id !== kitId));
      }
    } catch (error) {
      console.error('Error deleting kit:', error);
      setError('Failed to delete kit');
    }
  };

  const applyKit = async (kit) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/care-kits/${kit._id}/apply`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && onSelectKit) {
        onSelectKit({
          services: response.data.services,
          totalAmount: response.data.totalAmount,
          discountAmount: response.data.discountAmount,
          finalAmount: response.data.finalAmount
        });
      }
    } catch (error) {
      console.error('Error applying kit:', error);
      setError('Failed to apply kit');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
        <h2 className="text-xl font-semibold text-white">Care Kits</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create Kit</span>
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
              placeholder="Search kits or CPT codes..."
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

        <select
          value={selectedTreatmentType}
          onChange={(e) => setSelectedTreatmentType(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Treatment Types</option>
          {treatmentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
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

      {/* Kits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kits.map((kit) => (
          <div
            key={kit._id}
            className={`bg-gray-800 rounded-lg p-4 border ${
              kit.isHidden ? 'border-gray-600 opacity-60' : 'border-gray-700'
            } hover:border-gray-600 transition-colors`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-white truncate">
                  {kit.displayName}
                </h3>
                <p className="text-sm text-gray-400">{kit.category}</p>
                <p className="text-xs text-gray-500">
                  {kit.serviceCount} services • Used {kit.usageCount} times
                </p>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => toggleFavorite(kit._id)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  {kit.isFavorite ? (
                    <StarIconSolid className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => toggleVisibility(kit._id, !kit.isHidden)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  {kit.isHidden ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            {kit.description && (
              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                {kit.description}
              </p>
            )}

            {/* Services Preview */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {kit.services.slice(0, 3).map((service, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                  >
                    {service.code}
                  </span>
                ))}
                {kit.services.length > 3 && (
                  <span className="inline-block px-2 py-1 bg-gray-600 text-xs text-gray-400 rounded">
                    +{kit.services.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-4 p-2 bg-gray-700 rounded">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Total:</span>
                <span className="text-white font-medium">
                  {formatCurrency(kit.totalAmount)}
                </span>
              </div>
              {kit.discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Discount:</span>
                  <span className="text-green-400">
                    -{formatCurrency(kit.discountAmount)}
                  </span>
                </div>
              )}
              {kit.finalAmount !== kit.totalAmount && (
                <div className="flex items-center justify-between text-sm font-medium border-t border-gray-600 pt-1 mt-1">
                  <span className="text-gray-300">Final:</span>
                  <span className="text-green-400">
                    {formatCurrency(kit.finalAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {showApplyButton && (
                <button
                  onClick={() => applyKit(kit)}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  <CurrencyDollarIcon className="h-3 w-3" />
                  <span>Apply</span>
                </button>
              )}
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setEditingKit(kit)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const newName = prompt('Enter name for cloned kit:');
                    if (newName) cloneKit(kit._id, newName);
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  title="Clone"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteKit(kit._id)}
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

      {kits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No Care Kits found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Create your first kit
          </button>
        </div>
      )}
    </div>
  );
};

export default CareKitsManager;
