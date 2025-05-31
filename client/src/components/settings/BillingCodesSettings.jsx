import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

const BillingCodesSettings = ({ user }) => {
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for add/edit service code
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    category: 'Other',
    unitRate: '',
    insuranceCoverage: [],
    isActive: true
  });

  const categories = [
    'All',
    'Evaluation',
    'Therapeutic Procedures',
    'Physical Medicine Modalities',
    'Manual Therapy',
    'Exercise',
    'Chiropractic Manipulation',
    'Office Visits',
    'Radiology',
    'Acupuncture',
    'Work Conditioning',
    'Other'
  ];

  const insuranceOptions = [
    'Medicare',
    'Medicaid',
    'Most Private Insurance',
    'Some Private Insurance',
    'Puerto Rico Health Insurance',
    'Workers Compensation',
    'Limited Coverage',
    'Some Medicare Plans',
    'Many Private Insurance'
  ];

  // Fetch service codes for the clinic
  const fetchServiceCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      const response = await fetch('/api/service-codes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service codes');
      }

      const data = await response.json();
      setServiceCodes(data.serviceCodes || []);
    } catch (error) {
      console.error('Error fetching service codes:', error);
      setError('Failed to load service codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceCodes();
  }, []);

  // Filter service codes based on search and category
  const filteredServiceCodes = (serviceCodes || []).filter(code => {
    const matchesSearch = (code?.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (code?.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || code?.category === filterCategory;
    return matchesSearch && matchesCategory && !code?.isPackage; // Exclude packages from billing codes
  });

  // Handle form submission for add/edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.code || !formData.description || !formData.unitRate) {
      setError('Please fill in all required fields');
      return;
    }

    if (isNaN(formData.unitRate) || parseFloat(formData.unitRate) < 0) {
      setError('Unit rate must be a valid positive number');
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const url = selectedCode ? `/api/service-codes/${selectedCode._id}` : '/api/service-codes';
      const method = selectedCode ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        unitRate: parseFloat(formData.unitRate),
        isPackage: false // Ensure this is not a package
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
        throw new Error(errorData.message || 'Failed to save service code');
      }

      setSuccess(selectedCode ? 'Service code updated successfully' : 'Service code created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        code: '',
        description: '',
        category: 'Other',
        unitRate: '',
        insuranceCoverage: [],
        isActive: true
      });
      setSelectedCode(null);
      fetchServiceCodes();
    } catch (error) {
      console.error('Error saving service code:', error);
      setError(error.message);
    }
  };

  // Handle service code deletion
  const handleDeleteCode = async (codeId) => {
    if (!confirm('Are you sure you want to delete this service code?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');

      const response = await fetch(`/api/service-codes/${codeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete service code');
      }

      setSuccess('Service code deleted successfully');
      fetchServiceCodes();
    } catch (error) {
      console.error('Error deleting service code:', error);
      setError('Failed to delete service code');
    }
  };

  // Open edit modal
  const openEditModal = (code) => {
    setSelectedCode(code);
    setFormData({
      code: code.code,
      description: code.description,
      category: code.category,
      unitRate: code.unitRate.toString(),
      insuranceCoverage: code.insuranceCoverage || [],
      isActive: code.isActive
    });
    setShowEditModal(true);
  };

  // Handle insurance coverage change
  const handleInsuranceChange = (insurance, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        insuranceCoverage: [...formData.insuranceCoverage, insurance]
      });
    } else {
      setFormData({
        ...formData,
        insuranceCoverage: formData.insuranceCoverage.filter(item => item !== insurance)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Billing Codes</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage service codes and billing rates for your clinic
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Service Code</span>
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

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search service codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Service Codes Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rate
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
                    <p className="text-gray-400 mt-2">Loading service codes...</p>
                  </td>
                </tr>
              ) : filteredServiceCodes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">
                      {searchTerm || filterCategory !== 'All'
                        ? 'No service codes match your search criteria'
                        : 'No service codes found'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServiceCodes.map((code) => (
                  <tr key={code._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-blue-400">{code.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{code.description}</div>
                      {code.insuranceCoverage && code.insuranceCoverage.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Coverage: {code.insuranceCoverage.slice(0, 2).join(', ')}
                          {code.insuranceCoverage.length > 2 && ` +${code.insuranceCoverage.length - 2} more`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {code.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-400">
                        ${code.unitRate.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        code.isActive
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-red-900/30 text-red-300'
                      }`}>
                        {code.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(code)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Edit Service Code"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code._id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete Service Code"
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

      {/* Add/Edit Service Code Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {selectedCode ? 'Edit Service Code' : 'Add New Service Code'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Service Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 97110"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Unit Rate ($) *
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
                    Description *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Service description"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.slice(1).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Insurance Coverage
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {insuranceOptions.map(insurance => (
                      <label key={insurance} className="flex items-center text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={formData.insuranceCoverage.includes(insurance)}
                          onChange={(e) => handleInsuranceChange(insurance, e.target.checked)}
                          className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        {insurance}
                      </label>
                    ))}
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
                    Active Service Code
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedCode(null);
                      setFormData({
                        code: '',
                        description: '',
                        category: 'Other',
                        unitRate: '',
                        insuranceCoverage: [],
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
                    {selectedCode ? 'Update Service Code' : 'Create Service Code'}
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

export default BillingCodesSettings;
