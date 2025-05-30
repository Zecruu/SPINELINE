import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import PatientForm from '../components/secretary/PatientForm';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatPhoneDisplay } from '../utils/phoneFormatter';

const PatientManagement = () => {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Check if user is secretary
    if (parsedUser.role !== 'secretary') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadPatients();

    // Check if we should open the new patient form
    if (location.pathname === '/secretary/patients/new') {
      setShowForm(true);
      setEditingPatient(null);
    }
  }, [navigate, location.pathname]);

  // Load patients from API
  const loadPatients = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchTerm, status: statusFilter }
      });

      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Load patients error:', error);
      setError(error.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  // Reload patients when search or filter changes
  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        loadPatients();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, statusFilter, user]);

  // Patient management functions
  const handleAddPatient = () => {
    setEditingPatient(null);
    setShowForm(true);
  };

  const handleEditPatient = async (patientId) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setEditingPatient(response.data.patient);
        setShowForm(true);
      }
    } catch (error) {
      console.error('Load patient error:', error);
      setError(error.response?.data?.message || 'Failed to load patient details');
    }
  };

  const handleSavePatient = async (patientData) => {
    try {
      const token = localStorage.getItem('userToken');

      if (editingPatient) {
        // Update existing patient
        const response = await axios.put(`/api/patients/${editingPatient._id}`, patientData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          await loadPatients(); // Reload the list
          setShowForm(false);
          setEditingPatient(null);
        }
      } else {
        // Create new patient
        const response = await axios.post('/api/patients', patientData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          await loadPatients(); // Reload the list
          setShowForm(false);
          // If we came from the /new route, navigate back to patients list
          if (location.pathname === '/secretary/patients/new') {
            navigate('/secretary/patients');
          }
        }
      }
    } catch (error) {
      console.error('Save patient error:', error);
      throw new Error(error.response?.data?.message || 'Failed to save patient');
    }
  };

  const handleDeletePatient = async (patientId, patientName) => {
    if (confirm(`Are you sure you want to deactivate ${patientName}? This will set their status to Inactive.`)) {
      try {
        const token = localStorage.getItem('userToken');
        const response = await axios.delete(`/api/patients/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          await loadPatients(); // Reload the list
        }
      } catch (error) {
        console.error('Delete patient error:', error);
        setError(error.response?.data?.message || 'Failed to deactivate patient');
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    // If we came from the /new route, navigate back to patients list
    if (location.pathname === '/secretary/patients/new') {
      navigate('/secretary/patients');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <SecretaryLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Patient Management</h1>
            <p className="text-gray-400">Manage patient records and information</p>
          </div>
          <button
            onClick={handleAddPatient}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Patient
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, record number, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Loading patients...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Patient Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Record Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                        {searchTerm || statusFilter !== 'all'
                          ? 'No patients found matching your criteria'
                          : 'No patients found. Click "Add New Patient" to get started.'
                        }
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient._id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-white">{patient.fullName}</div>
                              <div className="text-sm text-gray-400">
                                DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} • Age: {patient.age}
                              </div>
                            </div>
                            {patient.hasActiveAlerts && (
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 ml-2" title={`${patient.alertCount} active alerts`} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{patient.recordNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{patient.email || '-'}</div>
                          <div className="text-sm text-gray-400">{formatPhoneDisplay(patient.phone)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            patient.status === 'Active'
                              ? 'bg-green-900 text-green-200'
                              : patient.status === 'Inactive'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : '-'}
                          </div>
                          {patient.nextAppointment && (
                            <div className="text-sm text-blue-400">
                              Next: {new Date(patient.nextAppointment).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditPatient(patient._id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View/Edit
                            </button>
                            <button
                              onClick={() => handleDeletePatient(patient._id, patient.fullName)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && patients.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>
                Showing {patients.length} patients
              </span>
              <span>
                Active: {patients.filter(p => p.status === 'Active').length} •
                Inactive: {patients.filter(p => p.status === 'Inactive').length} •
                Pending: {patients.filter(p => p.status === 'Pending').length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Patient Form Modal */}
      <PatientForm
        isOpen={showForm}
        onClose={handleCloseForm}
        patient={editingPatient}
        onSave={handleSavePatient}
      />
    </SecretaryLayout>
  );
};

export default PatientManagement;
