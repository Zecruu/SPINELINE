import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const ClusterEditor = ({ cluster, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: cluster?.name || '',
    description: cluster?.description || '',
    tags: cluster?.tags || [],
    codes: cluster?.codes || []
  });
  const [availableCodes, setAvailableCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Available tags based on cluster type
  const availableTags = type === 'billingClusters' 
    ? ['Neck', 'Back', 'Wellness', 'Spine', 'Extremity', 'Modality', 'Evaluation', 'Custom']
    : ['Neck', 'Back', 'Wellness', 'Spine', 'Extremity', 'Acute', 'Chronic', 'Custom'];

  useEffect(() => {
    loadAvailableCodes();
  }, [type]);

  const loadAvailableCodes = async () => {
    try {
      setLoadingCodes(true);
      const token = localStorage.getItem('userToken');
      
      let endpoint;
      if (type === 'billingClusters') {
        endpoint = '/api/service-codes';
      } else {
        endpoint = '/api/diagnostic-codes';
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 200 }
      });

      if (response.data.success) {
        const codes = type === 'billingClusters' 
          ? response.data.serviceCodes || []
          : response.data.diagnosticCodes || [];
        setAvailableCodes(codes);
      }
    } catch (error) {
      console.error('Error loading available codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const searchCodes = async (term) => {
    if (!term.trim()) {
      loadAvailableCodes();
      return;
    }

    try {
      setLoadingCodes(true);
      const token = localStorage.getItem('userToken');
      
      let endpoint;
      if (type === 'billingClusters') {
        endpoint = `/api/service-codes/search/${encodeURIComponent(term)}`;
      } else {
        endpoint = `/api/diagnostic-codes/search/${encodeURIComponent(term)}`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const codes = type === 'billingClusters' 
          ? response.data.serviceCodes || []
          : response.data.diagnosticCodes || [];
        setAvailableCodes(codes);
      }
    } catch (error) {
      console.error('Error searching codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchCodes(term);
    }, 300);
  };

  const handleCodeSelect = (code) => {
    const codeKey = code._id || code.code;
    const newSelected = new Set(selectedCodes);
    
    if (newSelected.has(codeKey)) {
      newSelected.delete(codeKey);
    } else {
      newSelected.add(codeKey);
    }
    
    setSelectedCodes(newSelected);
  };

  const addSelectedCodes = () => {
    const codesToAdd = availableCodes.filter(code => 
      selectedCodes.has(code._id || code.code)
    );

    const newCodes = [...formData.codes];
    
    codesToAdd.forEach(code => {
      // Check if code already exists
      const exists = newCodes.some(existing => existing.code === code.code);
      if (!exists) {
        if (type === 'billingClusters') {
          newCodes.push({
            code: code.code,
            description: code.description,
            type: code.category === 'HCPCS' ? 'HCPCS' : 'CPT',
            unitRate: code.unitRate || 0,
            duration: code.duration || 15,
            isActive: true
          });
        } else {
          newCodes.push({
            code: code.code,
            description: code.description,
            category: code.category || 'Musculoskeletal',
            bodySystem: code.bodySystem || 'Spine',
            severity: code.severity || 'Unspecified',
            chronicity: code.chronicity || 'Unspecified',
            isActive: true
          });
        }
      }
    });

    setFormData(prev => ({ ...prev, codes: newCodes }));
    setSelectedCodes(new Set());
  };

  const removeCode = (index) => {
    const newCodes = formData.codes.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, codes: newCodes }));
  };

  const handleTagToggle = (tag) => {
    const newTags = formData.tags.includes(tag)
      ? formData.tags.filter(t => t !== tag)
      : [...formData.tags, tag];
    
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a cluster name');
      return;
    }

    if (formData.codes.length === 0) {
      alert('Please add at least one code to the cluster');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const baseEndpoint = type === 'billingClusters' ? '/api/billing-clusters' : '/api/diagnosis-clusters';

      let endpoint, method;
      if (cluster) {
        // Editing existing cluster
        endpoint = `${baseEndpoint}/${cluster._id}`;
        method = 'put';
      } else {
        // Creating new cluster
        endpoint = baseEndpoint;
        method = 'post';
      }

      await axios[method](endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSave();
    } catch (error) {
      console.error('Error saving cluster:', error);
      alert(error.response?.data?.message || 'Failed to save cluster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {cluster ? 'Edit' : 'Create'} {type === 'billingClusters' ? 'Billing' : 'Diagnosis'} Cluster
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Cluster Details */}
          <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <div className="space-y-4">
              {/* Cluster Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cluster Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Spinal Basic"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of this cluster"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.tags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Codes Preview */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Selected Codes ({formData.codes.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.codes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{code.code}</div>
                        <div className="text-xs text-gray-400 truncate">{code.description}</div>
                      </div>
                      <button
                        onClick={() => removeCode(index)}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Code Selection */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Search ${type === 'billingClusters' ? 'CPT/HCPCS' : 'ICD-10'} codes...`}
                />
              </div>
            </div>

            {/* Add Selected Button */}
            {selectedCodes.size > 0 && (
              <div className="mb-4">
                <button
                  onClick={addSelectedCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Selected ({selectedCodes.size})
                </button>
              </div>
            )}

            {/* Available Codes Table */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-700 border-b border-gray-600">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-medium text-gray-300">
                  <div className="col-span-1 flex items-center justify-center">Select</div>
                  <div className="col-span-2">Code</div>
                  <div className="col-span-7">Description</div>
                  {type === 'billingClusters' && <div className="col-span-2 text-right">Rate</div>}
                  {type === 'diagnosisClusters' && <div className="col-span-2">Category</div>}
                </div>
              </div>

              {/* Table Body */}
              <div className="max-h-96 overflow-y-auto">
                {loadingCodes ? (
                  <div className="p-8 text-center text-gray-400">Loading codes...</div>
                ) : availableCodes.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No codes found</div>
                ) : (
                  availableCodes.map((code) => {
                    const codeKey = code._id || code.code;
                    const isSelected = selectedCodes.has(codeKey);
                    const isAlreadyAdded = formData.codes.some(existing => existing.code === code.code);

                    return (
                      <div
                        key={codeKey}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                          isSelected ? 'bg-blue-900/20' : ''
                        } ${isAlreadyAdded ? 'opacity-50' : ''}`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyAdded}
                            onChange={() => handleCodeSelect(code)}
                            className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm font-mono text-white">{code.code}</span>
                        </div>
                        <div className="col-span-7">
                          <span className="text-sm text-gray-300">{code.description}</span>
                        </div>
                        {type === 'billingClusters' && (
                          <div className="col-span-2 text-right">
                            <span className="text-sm text-gray-400">${code.unitRate || 0}</span>
                          </div>
                        )}
                        {type === 'diagnosisClusters' && (
                          <div className="col-span-2">
                            <span className="text-sm text-gray-400">{code.category || 'General'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Cluster'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClusterEditor;
