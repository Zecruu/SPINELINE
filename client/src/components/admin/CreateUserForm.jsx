import { useState, useEffect } from 'react';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const CreateUserForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    clinicId: ''
  });
  const [clinics, setClinics] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/secret-admin/clinics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClinics(response.data.clinics.filter(clinic => clinic.isActive));
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
      setError('Failed to load clinics');
    } finally {
      setLoadingClinics(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        '/api/secret-admin/users',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { user, clinic } = response.data;
        setSuccess(
          `User "${user.name}" created successfully!\n` +
          `Email: ${user.email}\n` +
          `Role: ${user.role}\n` +
          `Clinic: ${clinic ? clinic.clinicName : 'Unknown'} (${clinic ? clinic.clinicId : 'Unknown'})\n` +
          `Password: ${formData.password} (Please share securely with the user)`
        );

        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'doctor',
          clinicId: ''
        });

        // Notify parent component
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Create user error:', error);
      setError(
        error.response?.data?.message ||
        'Failed to create user. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingClinics) {
    return (
      <div className="text-white text-center py-8">
        Loading clinics...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Create New User</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="doctor">Doctor</option>
              <option value="secretary">Secretary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clinic *
            </label>
            <select
              name="clinicId"
              value={formData.clinicId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a clinic</option>
              {clinics.map(clinic => (
                <option key={clinic.clinicId} value={clinic.clinicId}>
                  {clinic.clinicName} ({clinic.clinicId})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password *
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Generate
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Password will be shared with the user. Ensure secure delivery.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded whitespace-pre-line">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                email: '',
                password: '',
                role: 'doctor',
                clinicId: ''
              });
              setError('');
              setSuccess('');
            }}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating User...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
