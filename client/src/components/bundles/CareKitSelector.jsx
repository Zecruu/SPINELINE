import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ChevronDownIcon,
  StarIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const CareKitSelector = ({ onSelectKit, buttonText = "Apply Care Kit", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [kits, setKits] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTreatmentType, setSelectedTreatmentType] = useState('all');
  const dropdownRef = useRef(null);

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
    if (isOpen) {
      loadFavorites();
      loadKits();
    }
  }, [isOpen, selectedCategory, selectedTreatmentType]);

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
      const response = await axios.get('/api/care-kits?favorites=true', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFavorites(response.data.kits);
      }
    } catch (error) {
      console.error('Error loading favorite kits:', error);
    }
  };

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
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`/api/care-kits?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Filter out favorites to avoid duplicates
        const nonFavorites = response.data.kits.filter(kit => !kit.isFavorite);
        setKits(nonFavorites);
      }
    } catch (error) {
      console.error('Error loading kits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadKits();
  };

  const selectKit = async (kit) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/api/care-kits/${kit._id}/apply`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSelectKit({
          services: response.data.services,
          totalAmount: response.data.totalAmount,
          discountAmount: response.data.discountAmount,
          finalAmount: response.data.finalAmount,
          kitName: kit.displayName
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error applying kit:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const KitItem = ({ kit, isFavorite = false }) => (
    <div
      onClick={() => selectKit(kit)}
      className="flex items-center justify-between p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          {isFavorite && <StarIconSolid className="h-4 w-4 text-yellow-400" />}
          <h4 className="font-medium text-white">{kit.displayName}</h4>
        </div>
        <p className="text-sm text-gray-400">{kit.category} • {kit.treatmentType}</p>
        
        {/* Services Preview */}
        <div className="flex flex-wrap gap-1 mt-1">
          {kit.services.slice(0, 3).map((service, index) => (
            <span
              key={index}
              className="inline-block px-1.5 py-0.5 bg-gray-700 text-xs text-gray-300 rounded"
            >
              {service.code}
            </span>
          ))}
          {kit.services.length > 3 && (
            <span className="inline-block px-1.5 py-0.5 bg-gray-600 text-xs text-gray-400 rounded">
              +{kit.services.length - 3}
            </span>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-sm font-medium text-green-400">
            {formatCurrency(kit.finalAmount)}
          </span>
          {kit.discountAmount > 0 && (
            <span className="text-xs text-gray-500 line-through">
              {formatCurrency(kit.totalAmount)}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 ml-2 text-right">
        <div>{kit.serviceCount} services</div>
        {kit.discountPercentage > 0 && (
          <div className="text-green-400">{kit.discountPercentage}% off</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`}
      >
        <CurrencyDollarIcon className="h-4 w-4" />
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
                  placeholder="Search kits or CPT codes..."
                  className="w-full pl-8 pr-16 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <button
                  onClick={handleSearch}
                  className="absolute right-1 top-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Search
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                <select
                  value={selectedTreatmentType}
                  onChange={(e) => setSelectedTreatmentType(e.target.value)}
                  className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Types</option>
                  {treatmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
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
                {favorites.map((kit) => (
                  <KitItem key={kit._id} kit={kit} isFavorite={true} />
                ))}
              </div>
            )}

            {/* All Kits Section */}
            {kits.length > 0 && (
              <div>
                {favorites.length > 0 && (
                  <div className="px-3 py-2 bg-gray-750 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400">All Care Kits</h3>
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  </div>
                ) : (
                  kits.map((kit) => (
                    <KitItem key={kit._id} kit={kit} />
                  ))
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && favorites.length === 0 && kits.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm">No Care Kits found</p>
                <p className="text-gray-500 text-xs mt-1">
                  {searchTerm ? 'Try a different search term' : 'Create kits in Settings'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-700 bg-gray-750">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to kit management - you can customize this
                window.location.href = '/settings?tab=care-kits';
              }}
              className="w-full px-3 py-2 text-sm text-green-400 hover:text-green-300 hover:bg-gray-700 rounded"
            >
              Manage Care Kits
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareKitSelector;
