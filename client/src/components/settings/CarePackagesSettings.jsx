import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const CarePackagesSettings = ({ user }) => {
  const [packages, setPackages] = useState([]);
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for add/edit package
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unitRate: '',
    totalSessions: '',
    validityDays: '90',
    includedCodes: [],
    isActive: true
  });

  // Fetch packages and service codes
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      // Fetch packages
      const packagesResponse = await fetch('/api/service-codes?isPackage=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch service codes for package creation
      const codesResponse = await fetch('/api/service-codes?isPackage=false', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!packagesResponse.ok || !codesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const packagesData = await packagesResponse.json();
      const codesData = await codesResponse.json();
      
      setPackages(packagesData.serviceCodes || []);
      setServiceCodes(codesData.serviceCodes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load packages and service codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter packages based on search
  const filteredPackages = packages.filter(pkg =>
    pkg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form submission for add/edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.code || !formData.description || !formData.unitRate || !formData.totalSessions) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.includedCodes.length === 0) {
      setError('Please select at least one service code for the package');
      return;
    }

    if (isNaN(formData.unitRate) || parseFloat(formData.unitRate) < 0) {
      setError('Package rate must be a valid positive number');
      return;
    }

    if (isNaN(formData.totalSessions) || parseInt(formData.totalSessions) < 1) {
      setError('Total sessions must be a valid positive number');
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const url = selectedPackage ? `/api/service-codes/${selectedPackage._id}` : '/api/service-codes';
      const method = selectedPackage ? 'PUT' : 'POST';

      const payload = {
        code: formData.code,
        description: formData.description,
        unitRate: parseFloat(formData.unitRate),
        isPackage: true,
        isActive: formData.isActive,
        packageDetails: {
          totalSessions: parseInt(formData.totalSessions),
          validityDays: parseInt(formData.validityDays),
          includedCodes: formData.includedCodes.map(codeId => {
            const serviceCode = serviceCodes.find(sc => sc._id === codeId);
            return {
              code: serviceCode.code,
              description: serviceCode.description,
              unitsPerSession: 1
            };
          })
        }
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save package');
      }

      setSuccess(selectedPackage ? 'Package updated successfully' : 'Package created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        code: '',
        description: '',
        unitRate: '',
        totalSessions: '',
        validityDays: '90',
        includedCodes: [],
        isActive: true
      });
      setSelectedPackage(null);
      fetchData();
    } catch (error) {
      console.error('Error saving package:', error);
      setError(error.message);
    }
  };

  // Handle package deletion
  const handleDeletePackage = async (packageId) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      
      const response = await fetch(`/api/service-codes/${packageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete package');
      }

      setSuccess('Package deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting package:', error);
      setError('Failed to delete package');
    }
  };

  // Open edit modal
  const openEditModal = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      code: pkg.code,
      description: pkg.description,
      unitRate: pkg.unitRate.toString(),
      totalSessions: pkg.packageDetails?.totalSessions?.toString() || '',
      validityDays: pkg.packageDetails?.validityDays?.toString() || '90',
      includedCodes: pkg.packageDetails?.includedCodes?.map(ic => {
        const serviceCode = serviceCodes.find(sc => sc.code === ic.code);
        return serviceCode?._id;
      }).filter(Boolean) || [],
      isActive: pkg.isActive
    });
    setShowEditModal(true);
  };

  // Handle included codes change
  const handleIncludedCodesChange = (codeId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        includedCodes: [...formData.includedCodes, codeId]
      });
    } else {
      setFormData({
        ...formData,
        includedCodes: formData.includedCodes.filter(id => id !== codeId)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Care Packages</h2>
          <p className="text-sm text-gray-400 mt-1">
            Create and manage bundled service packages for patients
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Package</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-300">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search packages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Packages Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading packages...</p>
                  </td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">
                      {searchTerm ? 'No packages match your search criteria' : 'No packages found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                          <CubeIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{pkg.code}</div>
                          <div className="text-sm text-gray-400">{pkg.description}</div>
                          {pkg.packageDetails?.includedCodes && (
                            <div className="text-xs text-gray-500 mt-1">
                              {pkg.packageDetails.includedCodes.length} service codes included
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {pkg.packageDetails?.totalSessions || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-400">
                        ${pkg.unitRate.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {pkg.packageDetails?.validityDays || 90} days
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pkg.isActive 
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-red-900/30 text-red-300'
                      }`}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(pkg)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Edit Package"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg._id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete Package"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Package Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {selectedPackage ? 'Edit Package' : 'Add New Package'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Package Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., PKG001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Package Rate ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitRate}
                      onChange={(e) => setFormData({ ...formData, unitRate: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Package Description *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Package description"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Total Sessions *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalSessions}
                      onChange={(e) => setFormData({ ...formData, totalSessions: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Number of sessions"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.validityDays}
                      onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="90"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Included Service Codes *
                  </label>
                  <div className="bg-gray-700 rounded border border-gray-600 p-3 max-h-48 overflow-y-auto">
                    {serviceCodes.length === 0 ? (
                      <p className="text-gray-400 text-sm">No service codes available</p>
                    ) : (
                      <div className="space-y-2">
                        {serviceCodes.map(code => (
                          <label key={code._id} className="flex items-center text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={formData.includedCodes.includes(code._id)}
                              onChange={(e) => handleIncludedCodesChange(code._id, e.target.checked)}
                              className="rounded bg-gray-600 border-gray-500 text-blue-600 focus:ring-blue-500 mr-3"
                            />
                            <span className="font-medium text-blue-400">{code.code}</span>
                            <span className="ml-2">{code.description}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
                    Active Package
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedPackage(null);
                      setFormData({
                        code: '',
                        description: '',
                        unitRate: '',
                        totalSessions: '',
                        validityDays: '90',
                        includedCodes: [],
                        isActive: true
                      });
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    {selectedPackage ? 'Update Package' : 'Create Package'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarePackagesSettings;
