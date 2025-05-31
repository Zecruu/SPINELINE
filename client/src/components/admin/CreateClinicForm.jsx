import { useState } from 'react';
import axios from 'axios';
import { formatPhoneNumber } from '../../utils/phoneFormatter';

const CreateClinicForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    clinicName: '',
    clinicId: '',
    contactInfo: {
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingId, setGeneratingId] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Apply phone number formatting for phone fields
    const processedValue = name === 'contactInfo.phone' ? formatPhoneNumber(value) : value;

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
    setSuccess('');
  };

  const generateClinicId = async () => {
    if (!formData.clinicName.trim()) {
      setError('Please enter a clinic name first');
      return;
    }

    setGeneratingId(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `/api/secret-admin/generate-clinic-id?clinicName=${encodeURIComponent(formData.clinicName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          clinicId: response.data.suggestedId
        }));
      }
    } catch (error) {
      console.error('Error generating clinic ID:', error);
      setError('Failed to generate clinic ID');
    } finally {
      setGeneratingId(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        '/api/secret-admin/clinics',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(`Clinic "${response.data.clinic.clinicName}" created successfully with ID: ${response.data.clinic.clinicId}`);

        // Reset form
        setFormData({
          clinicName: '',
          clinicId: '',
          contactInfo: {
            email: '',
            phone: '',
            address: {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'USA'
            }
          }
        });

        // Notify parent component
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Create clinic error:', error);
      setError(
        error.response?.data?.message ||
        'Failed to create clinic. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Create New Clinic</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clinic Name *
            </label>
            <input
              type="text"
              name="clinicName"
              value={formData.clinicName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter clinic name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clinic ID *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                name="clinicId"
                value={formData.clinicId}
                onChange={handleChange}
                required
                className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter or generate clinic ID"
              />
              <button
                type="button"
                onClick={generateClinicId}
                disabled={generatingId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingId ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t border-gray-600 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Contact Information (Optional)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="contactInfo.email"
                value={formData.contactInfo.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="clinic@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="contactInfo.phone"
                value={formData.contactInfo.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="555-123-4567"
                maxLength="12"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Street Address
            </label>
            <input
              type="text"
              name="contactInfo.address.street"
              value={formData.contactInfo.address.street}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                name="contactInfo.address.city"
                value={formData.contactInfo.address.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                name="contactInfo.address.state"
                value={formData.contactInfo.address.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                name="contactInfo.address.zipCode"
                value={formData.contactInfo.address.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Clinic...' : 'Create Clinic'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClinicForm;
