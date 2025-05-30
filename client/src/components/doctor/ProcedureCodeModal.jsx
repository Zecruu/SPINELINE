import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

const ProcedureCodeModal = ({
  isOpen,
  onClose,
  availableCodes,
  selectedCodes,
  onApply
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedCodes, setTempSelectedCodes] = useState([]);
  const [sortBy, setSortBy] = useState('code'); // 'code' or 'description'

  // Initialize temp selected codes when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedCodes([...selectedCodes]);
      setSearchTerm('');
    }
  }, [isOpen, selectedCodes]);

  // Filter and sort codes
  const filteredCodes = availableCodes
    .filter(code =>
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.category && code.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'code') {
        return a.code.localeCompare(b.code);
      } else {
        return a.description.localeCompare(b.description);
      }
    });

  // Check if code is selected
  const isCodeSelected = (code) => {
    return tempSelectedCodes.find(selected => selected.code === code.code);
  };

  // Add code to selection
  const addCode = (code) => {
    if (isCodeSelected(code)) return;

    const newCode = {
      code: code.code,
      description: code.description,
      units: 1,
      notes: '',
      unitRate: code.unitRate || 0,
      duration: code.duration || 15,
      isPackage: code.isPackage || false,
      category: code.category || 'General'
    };

    setTempSelectedCodes(prev => [...prev, newCode]);
  };

  // Remove code from selection
  const removeCode = (codeToRemove) => {
    setTempSelectedCodes(prev =>
      prev.filter(code => code.code !== codeToRemove)
    );
  };

  // Update code units
  const updateCodeUnits = (codeToUpdate, units) => {
    setTempSelectedCodes(prev =>
      prev.map(code =>
        code.code === codeToUpdate
          ? { ...code, units: Math.max(1, Math.min(10, units)) }
          : code
      )
    );
  };

  // Update code notes
  const updateCodeNotes = (codeToUpdate, notes) => {
    setTempSelectedCodes(prev =>
      prev.map(code =>
        code.code === codeToUpdate
          ? { ...code, notes }
          : code
      )
    );
  };

  // Handle apply
  const handleApply = () => {
    onApply(tempSelectedCodes);
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    setTempSelectedCodes([...selectedCodes]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-xl font-semibold text-white">Select Procedure Codes</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Available Codes */}
          <div className="w-1/2 border-r border-gray-600 flex flex-col">
            <div className="p-4 border-b border-gray-600">
              <h3 className="text-lg font-medium text-white mb-4">Find Procedure Codes</h3>

              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by code, description, or category..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Sort Options */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">Sort by:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSortBy('code')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      sortBy === 'code'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setSortBy('description')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      sortBy === 'description'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Description
                  </button>
                </div>
              </div>
            </div>

            {/* Available Codes List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredCodes.map((code) => {
                  const isSelected = isCodeSelected(code);
                  return (
                    <button
                      key={code.code}
                      onClick={() => addCode(code)}
                      disabled={isSelected}
                      className={`w-full p-3 text-left rounded border transition-colors ${
                        isSelected
                          ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-blue-400 font-medium">({code.code})</span>
                            {isSelected && (
                              <CheckCircleIcon className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                          <div className="text-white text-sm mb-1">{code.description}</div>
                          <div className="flex items-center space-x-2 text-xs">
                            {code.category && (
                              <span className="bg-gray-800 px-2 py-1 rounded text-gray-300">
                                {code.category}
                              </span>
                            )}
                            <span className="text-gray-400">${code.unitRate || 0}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">{code.duration || 15} min</span>
                          </div>
                        </div>
                        {!isSelected && (
                          <PlusIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* No results */}
              {filteredCodes.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  {searchTerm ? `No codes found matching "${searchTerm}"` : 'No procedure codes available'}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Selected Codes */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-600">
              <h3 className="text-lg font-medium text-white">
                Selected Codes ({tempSelectedCodes.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tempSelectedCodes.length > 0 ? (
                <div className="space-y-4">
                  {tempSelectedCodes.map((code) => (
                    <div key={code.code} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-blue-400 font-medium">({code.code})</span>
                            <span className="text-white font-medium">{code.description}</span>
                          </div>
                          <div className="text-gray-400 text-sm">
                            {code.category} • {code.duration || 15} min
                          </div>
                        </div>
                        <button
                          onClick={() => removeCode(code.code)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remove code"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Units */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Units</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={code.units}
                            onChange={(e) => updateCodeUnits(code.code, parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Total */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Total</label>
                          <div className="px-3 py-2 bg-gray-600 text-white rounded border border-gray-500">
                            ${((code.unitRate || 0) * code.units).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mt-3">
                        <label className="block text-xs text-gray-400 mb-1">Notes (Optional)</label>
                        <input
                          type="text"
                          value={code.notes}
                          onChange={(e) => updateCodeNotes(code.code, e.target.value)}
                          placeholder="Additional notes..."
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No procedure codes selected. Choose codes from the left panel.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-600 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {tempSelectedCodes.length} code(s) selected
            {tempSelectedCodes.length > 0 && (
              <span className="ml-4">
                Total: ${tempSelectedCodes.reduce((sum, code) => sum + (code.unitRate * code.units), 0).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Apply Codes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcedureCodeModal;
