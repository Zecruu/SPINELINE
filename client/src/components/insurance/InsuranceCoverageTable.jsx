import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const InsuranceCoverageTable = ({ 
  coveredCodes = [], 
  onCodesChange, 
  disabled = false 
}) => {
  const [codes, setCodes] = useState(coveredCodes);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync with parent component
  useEffect(() => {
    setCodes(coveredCodes);
  }, [coveredCodes]);

  // Fetch CPT codes from service codes API
  const searchCPTCodes = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/service-codes/search/${encodeURIComponent(term)}?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.serviceCodes || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching CPT codes:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearch) {
        searchCPTCodes(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showSearch]);

  const addNewCode = () => {
    const newCode = {
      cptCode: '',
      description: '',
      unitsAllowed: 1,
      unitRate: 0,
      copayPerUnit: 0,
      totalAllowed: 0,
      isActive: true,
      notes: ''
    };
    const updatedCodes = [...codes, newCode];
    setCodes(updatedCodes);
    onCodesChange?.(updatedCodes);
  };

  const removeCode = (index) => {
    const updatedCodes = codes.filter((_, i) => i !== index);
    setCodes(updatedCodes);
    onCodesChange?.(updatedCodes);
  };

  const updateCode = (index, field, value) => {
    const updatedCodes = [...codes];
    updatedCodes[index] = { ...updatedCodes[index], [field]: value };
    
    // Auto-calculate total allowed when units or rate changes
    if (field === 'unitsAllowed' || field === 'unitRate') {
      const units = field === 'unitsAllowed' ? value : updatedCodes[index].unitsAllowed;
      const rate = field === 'unitRate' ? value : updatedCodes[index].unitRate;
      updatedCodes[index].totalAllowed = units * rate;
    }
    
    setCodes(updatedCodes);
    onCodesChange?.(updatedCodes);
  };

  const selectCPTCode = (serviceCode, index) => {
    updateCode(index, 'cptCode', serviceCode.code);
    updateCode(index, 'description', serviceCode.description);
    updateCode(index, 'unitRate', serviceCode.unitRate || 0);
    setShowSearch(false);
    setSearchTerm('');
  };

  const isDuplicateCode = (cptCode, currentIndex) => {
    return codes.some((code, index) => 
      index !== currentIndex && 
      code.cptCode.toUpperCase() === cptCode.toUpperCase() && 
      code.cptCode.trim() !== ''
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h5 className="text-md font-medium text-white">Covered Codes</h5>
        <button
          type="button"
          onClick={addNewCode}
          disabled={disabled}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border border-gray-600 rounded-lg">
          No covered codes added yet. Click "Add Code" to specify coverage.
        </div>
      ) : (
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-700 px-4 py-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-300">
              <div className="col-span-2">CPT Code</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Units</div>
              <div className="col-span-2">Unit Rate</div>
              <div className="col-span-2">Total Allowed</div>
              <div className="col-span-1">Copay</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-600">
            {codes.map((code, index) => (
              <div key={index} className="bg-gray-800 px-4 py-3">
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* CPT Code */}
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      value={code.cptCode}
                      onChange={(e) => updateCode(index, 'cptCode', e.target.value.toUpperCase())}
                      onFocus={() => setShowSearch(true)}
                      disabled={disabled}
                      className={`w-full px-2 py-1 text-sm border rounded bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDuplicateCode(code.cptCode, index) 
                          ? 'border-red-500' 
                          : 'border-gray-600'
                      }`}
                      placeholder="CPT Code"
                    />
                    {isDuplicateCode(code.cptCode, index) && (
                      <p className="text-red-400 text-xs mt-1">Duplicate code</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={code.description}
                      onChange={(e) => updateCode(index, 'description', e.target.value)}
                      disabled={disabled}
                      className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Description"
                    />
                  </div>

                  {/* Units Allowed */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      value={code.unitsAllowed}
                      onChange={(e) => updateCode(index, 'unitsAllowed', parseInt(e.target.value) || 0)}
                      disabled={disabled}
                      className="w-full px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Unit Rate */}
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={code.unitRate}
                        onChange={(e) => updateCode(index, 'unitRate', parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="w-full pl-6 pr-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Total Allowed */}
                  <div className="col-span-2">
                    <div className="px-2 py-1 text-sm text-gray-300 bg-gray-600 rounded">
                      ${code.totalAllowed.toFixed(2)}
                    </div>
                  </div>

                  {/* Copay Per Unit */}
                  <div className="col-span-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={code.copayPerUnit}
                        onChange={(e) => updateCode(index, 'copayPerUnit', parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="w-full pl-6 pr-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeCode(index)}
                      disabled={disabled}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CPT Code Search Dropdown */}
      {showSearch && searchTerm && (
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-400">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="divide-y divide-gray-600">
                {searchResults.map((serviceCode) => (
                  <button
                    key={serviceCode._id}
                    type="button"
                    onClick={() => selectCPTCode(serviceCode, codes.length - 1)}
                    className="w-full text-left p-3 hover:bg-gray-600 focus:outline-none focus:bg-gray-600"
                  >
                    <div className="font-medium text-white">{serviceCode.code}</div>
                    <div className="text-sm text-gray-300">{serviceCode.description}</div>
                    <div className="text-xs text-gray-400">${serviceCode.unitRate}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-gray-400">No codes found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceCoverageTable;
