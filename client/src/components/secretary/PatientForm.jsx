import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatPhoneNumber } from '../../utils/phoneFormatter';
import { InsuranceTab, ReferralsTab, PackagesTab, AlertsTab, FilesTab } from './PatientFormTabs';

const PatientForm = ({ isOpen, onClose, patient = null, onSave }) => {
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    recordNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    status: 'Active',
    notes: '',

    // Insurance Information
    insurances: [],

    // Referral Information
    referrals: [],

    // Packages
    packages: [],

    // Alerts
    alerts: [],

    // Files
    files: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [generatingRecordNumber, setGeneratingRecordNumber] = useState(false);

  // Initialize form data when patient prop changes
  useEffect(() => {
    if (patient) {
      setFormData({
        ...patient,
        address: patient.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        insurances: patient.insurances || [],
        referrals: patient.referrals || [],
        packages: patient.packages || [],
        alerts: patient.alerts || [],
        files: patient.files || []
      });
    } else {
      // Reset form for new patient
      setFormData({
        firstName: '',
        lastName: '',
        recordNumber: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
        email: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        status: 'Active',
        notes: '',
        insurances: [],
        referrals: [],
        packages: [],
        alerts: [],
        files: []
      });
    }
    setActiveTab('basic');
    setError('');
  }, [patient, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Apply phone number formatting
    const processedValue = name === 'phone' ? formatPhoneNumber(value) : value;

    if (name.includes('.')) {
      const keys = name.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;

        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = processedValue;
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }

    setError('');
  };

  // Insurance management - Memoized
  const addInsurance = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      insurances: [...prev.insurances, {
        insuranceName: '',
        memberId: '',
        groupId: '',
        copay: 0,
        expirationDate: '',
        isPrimary: prev.insurances.length === 0
      }]
    }));
  }, []);

  const updateInsurance = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      insurances: prev.insurances.map((insurance, i) =>
        i === index ? { ...insurance, [field]: value } : insurance
      )
    }));
  }, []);

  const removeInsurance = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      insurances: prev.insurances.filter((_, i) => i !== index)
    }));
  }, []);

  // Referral management - Memoized
  const addReferral = useCallback(() => {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(expirationDate.getDate() + 90); // Default 90 days

    setFormData(prev => ({
      ...prev,
      referrals: [...prev.referrals, {
        source: '',
        referralDate: today.toISOString().split('T')[0],
        duration: 90,
        notes: '',
        isActive: true
      }]
    }));
  }, []);

  const updateReferral = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      referrals: prev.referrals.map((referral, i) =>
        i === index ? { ...referral, [field]: value } : referral
      )
    }));
  }, []);

  const removeReferral = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      referrals: prev.referrals.filter((_, i) => i !== index)
    }));
  }, []);

  // Package management - Memoized
  const addPackage = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, {
        packageName: '',
        totalVisits: 1,
        packageCost: 0,
        isActive: true
      }]
    }));
  }, []);

  const updatePackage = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) =>
        i === index ? { ...pkg, [field]: value } : pkg
      )
    }));
  }, []);

  const removePackage = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
  }, []);

  // Alert management - Memoized
  const addAlert = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      alerts: [...prev.alerts, {
        type: 'Important Note',
        message: '',
        priority: 'Medium',
        isVisible: true
      }]
    }));
  }, []);

  const updateAlert = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      alerts: prev.alerts.map((alert, i) =>
        i === index ? { ...alert, [field]: value } : alert
      )
    }));
  }, []);

  const removeAlert = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      alerts: prev.alerts.filter((_, i) => i !== index)
    }));
  }, []);

  // File management functions - Memoized to prevent unnecessary re-renders
  const addFile = useCallback((fileData) => {
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, {
        ...fileData,
        uploadedAt: new Date(),
        uploadedBy: 'Current User'
      }]
    }));
  }, []);

  const updateFile = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.map((file, i) =>
        i === index ? { ...file, [field]: value } : file
      )
    }));
  }, []);

  const removeFile = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  }, []);

  // Auto-generate record number
  const generateRecordNumber = async () => {
    try {
      setGeneratingRecordNumber(true);
      setError('');

      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/patients/generate-record-number', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate record number');
      }

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          recordNumber: data.recordNumber
        }));
      } else {
        throw new Error(data.message || 'Failed to generate record number');
      }
    } catch (error) {
      console.error('Generate record number error:', error);
      setError(error.message || 'Failed to generate record number');
    } finally {
      setGeneratingRecordNumber(false);
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      setActiveTab('basic');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      setActiveTab('basic');
      return false;
    }
    if (!formData.dateOfBirth) {
      setError('Date of birth is required');
      setActiveTab('basic');
      return false;
    }
    if (!formData.gender) {
      setError('Gender is required');
      setActiveTab('basic');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      setActiveTab('basic');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '👤' },
    { id: 'insurance', name: 'Insurance', icon: '🏥' },
    { id: 'referrals', name: 'Referrals', icon: '📋' },
    { id: 'packages', name: 'Packages', icon: '📦' },
    { id: 'alerts', name: 'Alerts', icon: '⚠️' },
    { id: 'files', name: 'Files', icon: '📁' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full bg-gray-800">
          {/* Header */}
          <div className="bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg leading-6 font-medium text-white">
              {patient ? `Edit Patient: ${patient.firstName} ${patient.lastName}` : 'Add New Patient'}
            </h3>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 overflow-y-auto">
              {error && (
                <div className="mb-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Tab Content */}
              <div className="min-h-full">
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">First Name *</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Last Name *</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Record Number</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="text"
                          name="recordNumber"
                          value={formData.recordNumber}
                          onChange={handleChange}
                          placeholder="Auto-generated or enter manually"
                          className="flex-1 block w-full border border-gray-600 rounded-l-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          readOnly={patient ? true : false} // Read-only when editing existing patient
                        />
                        {!patient && ( // Only show generate button for new patients
                          <button
                            type="button"
                            onClick={generateRecordNumber}
                            disabled={generatingRecordNumber}
                            className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-600 rounded-r-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingRecordNumber ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                              </>
                            ) : (
                              'Auto Generate'
                            )}
                          </button>
                        )}
                      </div>
                      {patient && (
                        <p className="mt-1 text-sm text-gray-400">Record number cannot be changed for existing patients</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Date of Birth *</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Phone *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          maxLength="12"
                          placeholder="555-123-4567"
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Street Address</label>
                      <input
                        type="text"
                        name="address.street"
                        value={formData.address.street}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">City</label>
                        <input
                          type="text"
                          name="address.city"
                          value={formData.address.city}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">State</label>
                        <input
                          type="text"
                          name="address.state"
                          value={formData.address.state}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">ZIP Code</label>
                        <input
                          type="text"
                          name="address.zipCode"
                          value={formData.address.zipCode}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 block w-full border border-gray-600 rounded-md bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'insurance' && (
                  <InsuranceTab
                    formData={formData}
                    addInsurance={addInsurance}
                    updateInsurance={updateInsurance}
                    removeInsurance={removeInsurance}
                  />
                )}

                {activeTab === 'referrals' && (
                  <ReferralsTab
                    formData={formData}
                    addReferral={addReferral}
                    updateReferral={updateReferral}
                    removeReferral={removeReferral}
                  />
                )}

                {activeTab === 'packages' && (
                  <PackagesTab
                    formData={formData}
                    addPackage={addPackage}
                    updatePackage={updatePackage}
                    removePackage={removePackage}
                  />
                )}

                {activeTab === 'alerts' && (
                  <AlertsTab
                    formData={formData}
                    addAlert={addAlert}
                    updateAlert={updateAlert}
                    removeAlert={removeAlert}
                  />
                )}

                {activeTab === 'files' && (
                  <FilesTab
                    formData={formData}
                    addFile={addFile}
                    updateFile={updateFile}
                    removeFile={removeFile}
                    patientId={patient?._id}
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-600">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : (patient ? 'Update Patient' : 'Create Patient')}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
