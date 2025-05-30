import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  CheckIcon,
  CubeIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CarePackageAssignmentModal = ({
  isOpen,
  onClose,
  onAssignPackage,
  patient
}) => {
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    validityDays: 90,
    notes: ''
  });
  const [error, setError] = useState('');

  // Fetch available care packages
  const fetchAvailablePackages = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/service-codes?isPackage=true&isActive=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAvailablePackages(data.serviceCodes || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setError('Failed to load available packages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load packages when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailablePackages();
      setSelectedPackage(null);
      setAssignmentData({
        startDate: new Date().toISOString().split('T')[0],
        validityDays: 90,
        notes: ''
      });
    }
  }, [isOpen]);

  // Filter packages based on search
  const filteredPackages = availablePackages.filter(pkg => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pkg.code.toLowerCase().includes(searchLower) ||
      pkg.description.toLowerCase().includes(searchLower)
    );
  });

  // Calculate expiration date
  const calculateExpirationDate = () => {
    const startDate = new Date(assignmentData.startDate);
    const expirationDate = new Date(startDate);
    expirationDate.setDate(startDate.getDate() + parseInt(assignmentData.validityDays));
    return expirationDate.toLocaleDateString();
  };

  // Handle package assignment
  const handleAssignPackage = () => {
    if (!selectedPackage) {
      setError('Please select a package to assign');
      return;
    }

    const packageAssignment = {
      packageId: selectedPackage._id,
      packageName: selectedPackage.description,
      packageCode: selectedPackage.code,
      totalVisits: selectedPackage.packageDetails?.totalSessions || 1,
      usedVisits: 0,
      remainingVisits: selectedPackage.packageDetails?.totalSessions || 1,
      packageCost: selectedPackage.unitRate,
      startDate: new Date(assignmentData.startDate),
      expirationDate: new Date(new Date(assignmentData.startDate).getTime() + (parseInt(assignmentData.validityDays) * 24 * 60 * 60 * 1000)),
      isActive: true,
      notes: assignmentData.notes,
      includedCodes: selectedPackage.packageDetails?.includedCodes || []
    };

    onAssignPackage(packageAssignment);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Assign Care Package</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Patient Info */}
        <div className="p-6 border-b border-gray-700 bg-gray-750">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {patient?.firstName?.charAt(0)}{patient?.lastName?.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                {patient?.firstName} {patient?.lastName}
              </h3>
              <p className="text-sm text-gray-400">
                Record: {patient?.recordNumber} | DOB: {patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search packages by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Package List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading packages...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchAvailablePackages}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="text-center py-8">
                <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">
                  {searchTerm ? 'No packages match your search criteria.' : 'No packages available.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredPackages.map((pkg) => {
                  const isSelected = selectedPackage?._id === pkg._id;
                  return (
                    <div
                      key={pkg._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
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
                              {pkg.code}
                            </div>
                            <div className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded">
                              Package
                            </div>
                          </div>
                          <div className="text-white font-medium mb-2">
                            {pkg.description}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                            <div>
                              <span className="font-medium">Sessions:</span> {pkg.packageDetails?.totalSessions || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Price:</span> ${pkg.unitRate?.toFixed(2) || '0.00'}
                            </div>
                            <div>
                              <span className="font-medium">Validity:</span> {pkg.packageDetails?.validityDays || 90} days
                            </div>
                            <div>
                              <span className="font-medium">Codes:</span> {pkg.packageDetails?.includedCodes?.length || 0} included
                            </div>
                          </div>
                          {pkg.packageDetails?.includedCodes && pkg.packageDetails.includedCodes.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Includes:</span> {pkg.packageDetails.includedCodes.slice(0, 3).map(code => code.code).join(', ')}
                              {pkg.packageDetails.includedCodes.length > 3 && ` +${pkg.packageDetails.includedCodes.length - 3} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignment Details Sidebar */}
          {selectedPackage && (
            <div className="w-80 border-l border-gray-700 p-6 bg-gray-750">
              <h3 className="text-lg font-medium text-white mb-4">
                Package Assignment
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={assignmentData.startDate}
                    onChange={(e) => setAssignmentData({ ...assignmentData, startDate: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Validity Period (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assignmentData.validityDays}
                    onChange={(e) => setAssignmentData({ ...assignmentData, validityDays: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
                  <div className="flex items-center mb-2">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-400 mr-2" />
                    <span className="text-blue-300 font-medium">Expiration Date</span>
                  </div>
                  <div className="text-blue-200">
                    {calculateExpirationDate()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={assignmentData.notes}
                    onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this package assignment..."
                  />
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-3">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2 mt-0.5" />
                      <div className="text-red-300 text-sm">{error}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {filteredPackages.length} packages available
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignPackage}
              disabled={!selectedPackage}
              className={`px-4 py-2 rounded transition-colors ${
                selectedPackage
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              Assign Package
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarePackageAssignmentModal;
