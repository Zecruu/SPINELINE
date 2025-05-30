import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const DiagnosticCodeSelectionModal = ({
  isOpen,
  onClose,
  onSelectCodes,
  selectedCodes = []
}) => {
  const [diagnosticCodes, setDiagnosticCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBodySystem, setSelectedBodySystem] = useState('All');
  const [showCommonOnly, setShowCommonOnly] = useState(true);
  const [selectedDiagnosticCodes, setSelectedDiagnosticCodes] = useState([]);
  const [error, setError] = useState('');

  // Categories for filtering
  const categories = [
    'All',
    'Musculoskeletal',
    'Nervous System',
    'Respiratory',
    'Cardiovascular',
    'Digestive',
    'Genitourinary',
    'Endocrine',
    'Mental Health',
    'Injury/Trauma',
    'Symptoms/Signs',
    'Other'
  ];

  // Body systems for filtering
  const bodySystems = [
    'All',
    'Spine',
    'Upper Extremity',
    'Lower Extremity',
    'Head/Neck',
    'Thorax',
    'Abdomen',
    'Pelvis',
    'Multiple Systems',
    'Other'
  ];

  // Fetch diagnostic codes
  const fetchDiagnosticCodes = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedBodySystem !== 'All') params.append('bodySystem', selectedBodySystem);
      if (showCommonOnly) params.append('commonlyUsed', 'true');
      params.append('limit', '100');

      const response = await fetch(`/api/diagnostic-codes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDiagnosticCodes(data.diagnosticCodes || []);
    } catch (error) {
      console.error('Error fetching diagnostic codes:', error);
      setError('Failed to load diagnostic codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load diagnostic codes when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      fetchDiagnosticCodes();
    }
  }, [isOpen, selectedCategory, selectedBodySystem, showCommonOnly]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDiagnosticCodes([]);
      setSearchTerm('');
      setSelectedCategory('All');
      setSelectedBodySystem('All');
      setShowCommonOnly(true);
    }
  }, [isOpen]);

  // Filter diagnostic codes based on search
  const filteredDiagnosticCodes = diagnosticCodes.filter(code => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      code.code.toLowerCase().includes(searchLower) ||
      code.description.toLowerCase().includes(searchLower)
    );
  });

  // Toggle diagnostic code selection
  const toggleDiagnosticCode = (diagnosticCode) => {
    setSelectedDiagnosticCodes(prev => {
      const isSelected = prev.find(dc => dc._id === diagnosticCode._id);
      if (isSelected) {
        return prev.filter(dc => dc._id !== diagnosticCode._id);
      } else {
        return [...prev, { ...diagnosticCode, isPrimary: prev.length === 0 }];
      }
    });
  };

  // Set primary diagnostic code
  const setPrimaryDiagnostic = (diagnosticCodeId) => {
    setSelectedDiagnosticCodes(prev =>
      prev.map(dc => ({
        ...dc,
        isPrimary: dc._id === diagnosticCodeId
      }))
    );
  };

  // Handle adding selected codes
  const handleAddCodes = () => {
    if (selectedDiagnosticCodes.length > 0) {
      // Ensure exactly one primary diagnosis
      const hasPrimary = selectedDiagnosticCodes.some(dc => dc.isPrimary);
      if (!hasPrimary && selectedDiagnosticCodes.length > 0) {
        selectedDiagnosticCodes[0].isPrimary = true;
      }

      onSelectCodes(selectedDiagnosticCodes);
      onClose();
    }
  };

  // Check if diagnostic code is already selected
  const isDiagnosticCodeSelected = (diagnosticCode) => {
    return selectedDiagnosticCodes.find(dc => dc._id === diagnosticCode._id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Select Diagnostic Codes (ICD-10)</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-700 bg-gray-750">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search codes or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Body System Filter */}
            <select
              value={selectedBodySystem}
              onChange={(e) => setSelectedBodySystem(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {bodySystems.map(system => (
                <option key={system} value={system}>{system}</option>
              ))}
            </select>

            {/* Common Only Toggle */}
            <label className="flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showCommonOnly}
                onChange={(e) => setShowCommonOnly(e.target.checked)}
                className="mr-2 rounded bg-gray-600 border-gray-500 text-blue-600 focus:ring-blue-500"
              />
              Common codes only
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Diagnostic Codes List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading diagnostic codes...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchDiagnosticCodes}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredDiagnosticCodes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {searchTerm || selectedCategory !== 'All' || selectedBodySystem !== 'All'
                    ? 'No diagnostic codes match your search criteria.'
                    : 'No diagnostic codes available.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredDiagnosticCodes.map((diagnosticCode) => {
                  const isSelected = isDiagnosticCodeSelected(diagnosticCode);
                  return (
                    <div
                      key={diagnosticCode._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => toggleDiagnosticCode(diagnosticCode)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-400'
                            }`}>
                              {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
                            </div>
                            <div className="font-mono text-blue-400 font-bold">
                              {diagnosticCode.code}
                            </div>
                            {diagnosticCode.commonlyUsed && (
                              <span className="bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded">
                                Common
                              </span>
                            )}
                          </div>
                          <div className="text-white font-medium mb-1">
                            {diagnosticCode.description}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>{diagnosticCode.category}</span>
                            <span>•</span>
                            <span>{diagnosticCode.bodySystem}</span>
                            {diagnosticCode.severity !== 'Unspecified' && (
                              <>
                                <span>•</span>
                                <span>{diagnosticCode.severity}</span>
                              </>
                            )}
                            {diagnosticCode.chronicity !== 'Unspecified' && (
                              <>
                                <span>•</span>
                                <span>{diagnosticCode.chronicity}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Codes Sidebar */}
          {selectedDiagnosticCodes.length > 0 && (
            <div className="w-80 border-l border-gray-700 p-6 bg-gray-750">
              <h3 className="text-lg font-medium text-white mb-4">
                Selected Codes ({selectedDiagnosticCodes.length})
              </h3>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {selectedDiagnosticCodes.map((diagnosticCode) => (
                  <div key={diagnosticCode._id} className="bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-blue-400 font-bold">{diagnosticCode.code}</div>
                        <div className="text-sm text-gray-300">{diagnosticCode.description}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDiagnosticCode(diagnosticCode);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center text-xs text-gray-300">
                        <input
                          type="radio"
                          name="primaryDiagnosis"
                          checked={diagnosticCode.isPrimary}
                          onChange={() => setPrimaryDiagnostic(diagnosticCode._id)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        Primary Diagnosis
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {selectedDiagnosticCodes.length > 0 && !selectedDiagnosticCodes.some(dc => dc.isPrimary) && (
                <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-2 mt-0.5" />
                    <div className="text-yellow-300 text-xs">
                      Please select one diagnosis as primary
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {filteredDiagnosticCodes.length} codes available
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCodes}
              disabled={selectedDiagnosticCodes.length === 0}
              className={`px-4 py-2 rounded transition-colors ${
                selectedDiagnosticCodes.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              Add {selectedDiagnosticCodes.length > 0 ? `${selectedDiagnosticCodes.length} ` : ''}Code{selectedDiagnosticCodes.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticCodeSelectionModal;
