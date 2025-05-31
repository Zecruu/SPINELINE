import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import { useToast, ToastContainer } from '../components/common/Toast';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const NewAppointment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Helper function to get current time rounded to next 15-minute interval
  const getCurrentTimeSlot = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;

    if (roundedMinutes >= 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(roundedMinutes);
    }

    return now.toTimeString().slice(0, 5); // Format as HH:MM
  };

  // Helper function to get today's date
  const getTodaysDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patientId: '',
    appointmentDate: getTodaysDate(), // Auto-populate with today's date
    appointmentTime: getCurrentTimeSlot(), // Auto-populate with next available time slot
    visitType: 'Follow-Up',
    duration: 30,
    chiefComplaint: '',
    notes: ''
  });

  const visitTypes = [
    'Initial Consultation',
    'Follow-Up',
    'Re-evaluation',
    'Treatment',
    'Maintenance',
    'Emergency',
    'Consultation',
    'Other'
  ];

  const timeSlots = [
    { value: '08:00', label: '8:00 AM' },
    { value: '08:30', label: '8:30 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '09:30', label: '9:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '12:30', label: '12:30 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '13:30', label: '1:30 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '14:30', label: '2:30 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '15:30', label: '3:30 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '16:30', label: '4:30 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '17:30', label: '5:30 PM' },
    { value: '18:00', label: '6:00 PM' }
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'secretary') {
      navigate('/login');
      return;
    }

    loadPatients();
  }, [navigate]);

  // Handle pre-filled patient data from navigation state
  useEffect(() => {
    if (location.state?.prefilledPatient) {
      const prefilledPatient = location.state.prefilledPatient;
      setFormData(prev => ({
        ...prev,
        patientId: prefilledPatient.id
      }));

      // Clear the state after using it
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim() === '' || selectedPatient) {
      setFilteredPatients([]);
    } else {
      const filtered = (patients || []).filter(patient =>
        `${patient?.firstName || ''} ${patient?.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient?.recordNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient?.phone && patient.phone.includes(searchTerm))
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients, selectedPatient]);

  const loadPatients = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPatients(response.data.patients);
        setFilteredPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Load patients error:', error);
      setError('Failed to load patients');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientId: patient._id
    }));
    setSearchTerm(`${patient.firstName} ${patient.lastName} (${patient.recordNumber})`);
    setFilteredPatients([]);
    setError(''); // Clear any validation errors
    showInfo(`Selected patient: ${patient.firstName} ${patient.lastName}`, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate required fields
    if (!formData.patientId) {
      setError('Please select a patient');
      setLoading(false);
      return;
    }

    if (!formData.appointmentDate) {
      setError('Please select an appointment date');
      setLoading(false);
      return;
    }

    if (!formData.appointmentTime) {
      setError('Please select an appointment time');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post('/api/appointments', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        showSuccess('Appointment scheduled successfully!');
        setSuccess('Appointment scheduled successfully!');
        setTimeout(() => {
          navigate('/secretary/todays-patients', {
            state: { message: 'Appointment scheduled successfully!', type: 'success' }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Create appointment error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to schedule appointment';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <SecretaryLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate('/secretary')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Quick Schedule</h1>
              <p className="text-gray-400 mt-1">Quickly schedule an appointment for today - just select patient, visit type, and duration</p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Appointment Form */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-yellow-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Select Patient *
                <span className="ml-2 text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">STEP 1</span>
              </label>
              <div className="relative">
                {/* Hidden input for form data */}
                <input
                  type="hidden"
                  name="patientId"
                  value={formData.patientId}
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedPatient) {
                      setSelectedPatient(null);
                      setFormData(prev => ({ ...prev, patientId: '' }));
                    }
                  }}
                  placeholder="Search by name, record number, or phone..."
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    selectedPatient ? 'border-green-600' : 'border-gray-600'
                  }`}
                />

                {/* Selected patient indicator and clear button */}
                {selectedPatient && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setFormData(prev => ({ ...prev, patientId: '' }));
                        setSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-white text-sm"
                      title="Clear selection"
                    >
                      ✕
                    </button>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}

                {/* Patient Search Results */}
                {filteredPatients.length > 0 && searchTerm && !selectedPatient && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-600 focus:bg-gray-600 focus:outline-none"
                      >
                        <div className="text-white font-medium">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Record: {patient.recordNumber} | Phone: {patient.phone || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {searchTerm && !selectedPatient && filteredPatients.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg p-4">
                    <div className="text-gray-400 text-sm mb-3">No patients found matching "{searchTerm}"</div>
                    <button
                      type="button"
                      onClick={() => navigate('/secretary/patients/new')}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      + Create New Patient
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Patient Info */}
              {selectedPatient && (
                <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Selected Patient</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white ml-2">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Record:</span>
                      <span className="text-white ml-2">{selectedPatient.recordNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white ml-2">{selectedPatient.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Schedule Info */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <ClockIcon className="h-5 w-5" />
                <span className="font-medium">Quick Schedule Active</span>
              </div>
              <p className="text-blue-300 text-sm">
                Date and time are automatically set to today and the next available time slot.
                You can adjust them if needed, or just select the patient and visit details below.
              </p>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-2" />
                  Appointment Date *
                  <span className="ml-2 text-xs text-green-400">(Auto-filled)</span>
                </label>
                <input
                  type="date"
                  name="appointmentDate"
                  value={formData.appointmentDate}
                  onChange={handleInputChange}
                  min={today}
                  className="w-full px-3 py-2 bg-gray-700 border border-green-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-2" />
                  Appointment Time *
                  <span className="ml-2 text-xs text-green-400">(Auto-filled)</span>
                </label>
                <select
                  name="appointmentTime"
                  value={formData.appointmentTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-green-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select time...</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visit Type and Duration */}
            <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Visit Type *
                    <span className="ml-2 text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">STEP 2</span>
                  </label>
                  <select
                    name="visitType"
                    value={formData.visitType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-yellow-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {visitTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Duration (minutes) *
                    <span className="ml-2 text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">STEP 3</span>
                  </label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-yellow-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                Chief Complaint
              </label>
              <textarea
                name="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={handleInputChange}
                rows={3}
                placeholder="Reason for visit..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/secretary')}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.patientId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </SecretaryLayout>
    </>
  );
};

export default NewAppointment;
