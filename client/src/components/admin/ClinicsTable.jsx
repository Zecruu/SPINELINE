import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatPhoneDisplay } from '../../utils/phoneFormatter';

const ClinicsTable = ({ onUpdate }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/clinics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClinics(response.data.clinics);
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
      setError('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const toggleClinicStatus = async (clinicId, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.patch(
        `/api/secret-admin/clinics/${clinicId}/status`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update local state
        setClinics(prev =>
          prev.map(clinic =>
            clinic.clinicId === clinicId
              ? { ...clinic, isActive: !currentStatus }
              : clinic
          )
        );

        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error updating clinic status:', error);
      setError('Failed to update clinic status');
    }
  };

  const deleteClinic = async (clinicId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(
        `/api/secret-admin/clinics/${clinicId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Remove from local state
        setClinics(prev => prev.filter(clinic => clinic.clinicId !== clinicId));
        setDeleteConfirm(null);
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting clinic:', error);
      setError(error.response?.data?.message || 'Failed to delete clinic');
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-white text-center py-8">
        Loading clinics...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Manage Clinics</h2>
        <button
          onClick={loadClinics}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Clinic Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Clinic ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Contact Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {clinics.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-400">
                  No clinics found
                </td>
              </tr>
            ) : (
              clinics.map((clinic) => (
                <tr key={clinic._id} className="hover:bg-gray-600">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {clinic.clinicName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300 font-mono">
                      {clinic.clinicId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {clinic.contactInfo?.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {formatPhoneDisplay(clinic.contactInfo?.phone)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      clinic.isActive
                        ? 'bg-green-900 text-green-200'
                        : 'bg-red-900 text-red-200'
                    }`}>
                      {clinic.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(clinic.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleClinicStatus(clinic.clinicId, clinic.isActive)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          clinic.isActive
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {clinic.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(clinic.clinicId)}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        Total clinics: {clinics.length} |
        Active: {clinics.filter(c => c.isActive).length} |
        Inactive: {clinics.filter(c => !c.isActive).length}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-4">
              Confirm Clinic Deletion
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this clinic? This action cannot be undone.
              <br />
              <br />
              <strong>Clinic ID:</strong> {deleteConfirm}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteClinic(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Clinic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicsTable;
