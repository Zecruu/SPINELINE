import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  CheckIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const ServiceCodeSelectionModal = ({
  isOpen,
  onClose,
  onSelectCodes,
  selectedCodes = [],
  patient = null
}) => {
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedServiceCodes, setSelectedServiceCodes] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('codes'); // 'codes' or 'packages'

  // Categories for filtering
  const categories = [
    'All',
    'Chiropractic Manipulation',
    'Therapeutic Procedures',
    'Physical Medicine Modalities',
    'Office Visits',
    'Evaluation',
    'Manual Therapy',
    'Radiology',
    'Acupuncture',
    'Work Conditioning'
  ];

  // Fetch service codes
  const fetchServiceCodes = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/service-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setServiceCodes(data.serviceCodes || []);
    } catch (error) {
      console.error('Error fetching service codes:', error);
      setError('Failed to load service codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get patient's active packages
  const getPatientPackages = () => {
    if (!patient || !patient.packages) return [];

    return patient.packages.filter(pkg =>
      pkg.isActive && pkg.remainingVisits > 0
    ).map(pkg => ({
      ...pkg,
      isPackage: true,
      code: pkg.packageCode || 'PKG',
      description: pkg.packageName,
      unitRate: 0, // Packages don't have additional cost when used
      units: 1,
      packageDetails: {
        remainingVisits: pkg.remainingVisits,
        totalVisits: pkg.totalVisits,
        usedVisits: pkg.usedVisits,
        expirationDate: pkg.expirationDate
      }
    }));
  };

  // Load service codes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchServiceCodes();
      setSelectedServiceCodes([]);
      setSearchTerm('');
      setSelectedCategory('All');
      setActiveTab('codes');
    }
  }, [isOpen]);

  // Filter service codes based on search and category
  const filteredServiceCodes = serviceCodes.filter(code => {
    const matchesSearch = !searchTerm ||
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || code.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Toggle service code selection
  const toggleServiceCode = (serviceCode) => {
    setSelectedServiceCodes(prev => {
      const isSelected = prev.find(sc => sc._id === serviceCode._id);
      if (isSelected) {
        return prev.filter(sc => sc._id !== serviceCode._id);
      } else {
        return [...prev, { ...serviceCode, units: 1 }];
      }
    });
  };

  // Update units for selected service code
  const updateUnits = (serviceCodeId, units) => {
    setSelectedServiceCodes(prev =>
      prev.map(sc =>
        sc._id === serviceCodeId
          ? { ...sc, units: Math.max(1, parseInt(units) || 1) }
          : sc
      )
    );
  };

  // Handle adding selected codes
  const handleAddCodes = () => {
    if (selectedServiceCodes.length > 0) {
      onSelectCodes(selectedServiceCodes);
      onClose();
    }
  };

  // Check if service code is already selected
  const isServiceCodeSelected = (serviceCode) => {
    return selectedServiceCodes.find(sc => sc._id === serviceCode._id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Select Service Codes</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('codes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'codes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Service Codes
            </button>
            {patient && getPatientPackages().length > 0 && (
              <button
                onClick={() => setActiveTab('packages')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'packages'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Patient Packages ({getPatientPackages().length})
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Service Codes/Packages List */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'codes' ? (
              // Service Codes Tab
              loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading service codes...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={fetchServiceCodes}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredServiceCodes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    {searchTerm || selectedCategory !== 'All'
                      ? 'No service codes match your search criteria.'
                      : 'No service codes available.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredServiceCodes.map((serviceCode) => {
                  const isSelected = isServiceCodeSelected(serviceCode);
                  return (
                    <div
                      key={serviceCode._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => toggleServiceCode(serviceCode)}
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
                            <span className="font-medium text-blue-400 text-lg">
                              {serviceCode.code}
                            </span>
                            {serviceCode.isPackage && (
                              <div className="flex items-center space-x-1">
                                <CubeIcon className="h-4 w-4 text-purple-400" />
                                <span className="text-xs text-purple-400 font-medium">Package</span>
                              </div>
                            )}
                          </div>

                          <h3 className="text-white font-medium mb-1">
                            {serviceCode.description}
                          </h3>

                          <div className="text-sm text-gray-400 mb-2">
                            Category: {serviceCode.category} • Rate: ${serviceCode.unitRate.toFixed(2)}
                          </div>

                          {serviceCode.insuranceCoverage && serviceCode.insuranceCoverage.length > 0 && (
                            <div className="text-xs text-green-400">
                              <span className="font-medium">Coverage:</span> {serviceCode.insuranceCoverage.slice(0, 2).join(', ')}
                              {serviceCode.insuranceCoverage.length > 2 && ` +${serviceCode.insuranceCoverage.length - 2} more`}
                            </div>
                          )}

                          {serviceCode.isPackage && serviceCode.packageDetails?.includedCodes && (
                            <div className="text-xs text-gray-400 mt-1">
                              Package includes {serviceCode.packageDetails.includedCodes.length} codes, {serviceCode.packageDetails.totalSessions} sessions
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">
                            ${serviceCode.unitRate.toFixed(2)}
                          </div>
                          {serviceCode.isPackage && serviceCode.packageDetails?.totalSessions && (
                            <div className="text-xs text-gray-400">
                              {serviceCode.packageDetails.totalSessions} sessions
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )
            ) : (
              // Patient Packages Tab
              (() => {
                const patientPackages = getPatientPackages();
                return patientPackages.length === 0 ? (
                  <div className="text-center py-8">
                    <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No active packages available for this patient.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {patientPackages.map((pkg) => {
                      const isSelected = isServiceCodeSelected(pkg);
                      const daysUntilExpiry = pkg.expirationDate ?
                        Math.ceil((new Date(pkg.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <div
                          key={pkg._id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          }`}
                          onClick={() => toggleServiceCode(pkg)}
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
                                <span className="font-medium text-purple-400 text-lg">
                                  {pkg.code}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <CubeIcon className="h-4 w-4 text-purple-400" />
                                  <span className="text-xs text-purple-400 font-medium">Package</span>
                                </div>
                              </div>

                              <h3 className="text-white font-medium mb-2">
                                {pkg.description}
                              </h3>

                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-2">
                                <div>
                                  <span className="font-medium">Remaining:</span> {pkg.packageDetails.remainingVisits} visits
                                </div>
                                <div>
                                  <span className="font-medium">Used:</span> {pkg.packageDetails.usedVisits}/{pkg.packageDetails.totalVisits}
                                </div>
                                {daysUntilExpiry && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Expires:</span>
                                    <span className={daysUntilExpiry <= 7 ? 'text-orange-400 ml-1' : 'ml-1'}>
                                      {daysUntilExpiry > 0 ? `in ${daysUntilExpiry} days` : 'Expired'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="bg-gray-600 rounded-full h-2 mb-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{ width: `${(pkg.packageDetails.usedVisits / pkg.packageDetails.totalVisits) * 100}%` }}
                                ></div>
                              </div>

                              <div className="text-xs text-green-400">
                                ✓ No additional charge - using package visit
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-purple-400">
                                Package
                              </div>
                              <div className="text-xs text-gray-400">
                                No charge
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>

          {/* Selected Codes Sidebar */}
          {selectedServiceCodes.length > 0 && (
            <div className="w-80 border-l border-gray-700 p-6 bg-gray-750">
              <h3 className="text-lg font-medium text-white mb-4">
                Selected Codes ({selectedServiceCodes.length})
              </h3>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {selectedServiceCodes.map((serviceCode) => (
                  <div key={serviceCode._id} className="bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-blue-400">{serviceCode.code}</div>
                        <div className="text-sm text-gray-300">{serviceCode.description}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleServiceCode(serviceCode);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-400">Units:</label>
                      <input
                        type="number"
                        min="1"
                        value={serviceCode.units}
                        onChange={(e) => updateUnits(serviceCode._id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400">
                        = ${(serviceCode.unitRate * serviceCode.units).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4">
                <div className="text-sm text-gray-400 mb-2">
                  Total: ${selectedServiceCodes.reduce((sum, sc) => sum + (sc.unitRate * sc.units), 0).toFixed(2)}
                </div>
                <button
                  onClick={handleAddCodes}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add {selectedServiceCodes.length} Code{selectedServiceCodes.length !== 1 ? 's' : ''}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {filteredServiceCodes.length} service code{filteredServiceCodes.length !== 1 ? 's' : ''} available
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
              disabled={selectedServiceCodes.length === 0}
              className={`px-4 py-2 rounded transition-colors ${
                selectedServiceCodes.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              Add {selectedServiceCodes.length > 0 ? `${selectedServiceCodes.length} ` : ''}Code{selectedServiceCodes.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCodeSelectionModal;
