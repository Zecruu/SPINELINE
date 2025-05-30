import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  DocumentTextIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const AppointmentDetailsForm = ({
  selectedDates,
  selectedTimeSlots,
  appointmentDetails,
  onDetailsChange,
  rescheduleData,
  isRescheduling
}) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [currentAppointmentIndex, setCurrentAppointmentIndex] = useState(0);

  const visitTypes = [
    { value: 'New Patient', label: 'New Patient', color: 'yellow' },
    { value: 'Re-evaluation', label: 'Re-evaluation', color: 'blue' },
    { value: 'Regular Visit', label: 'Regular Visit', color: 'green' },
    { value: 'Follow-Up', label: 'Follow-Up', color: 'green' },
    { value: 'Treatment', label: 'Treatment', color: 'green' },
    { value: 'Emergency', label: 'Emergency', color: 'red' }
  ];

  const colorOptions = [
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'white', label: 'White', class: 'bg-white' },
    { value: 'red', label: 'Red', class: 'bg-red-500' }
  ];

  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '60 minutes' }
  ];

  // Generate appointments array from selected time slots
  const generateAppointments = () => {
    const appointments = [];

    // Check if we have the new timeSlotAppointments structure from parent
    if (appointmentDetails.length > 0 && appointmentDetails[0].id?.includes('-')) {
      // Use existing appointment details if available
      return appointmentDetails;
    }

    // Fallback to old structure for backward compatibility
    Object.entries(selectedTimeSlots).forEach(([dateKey, timeSlots]) => {
      const date = new Date(dateKey + 'T00:00:00');
      timeSlots.forEach(time => {
        const appointmentData = {
          id: `${dateKey}-${time}`,
          date,
          time,
          dateKey,
          patientId: '',
          patientName: '',
          visitType: 'Regular Visit',
          colorTag: 'green',
          duration: 15,
          notes: ''
        };

        // Auto-populate patient data if rescheduling
        if (isRescheduling && rescheduleData) {
          appointmentData.patientId = rescheduleData.patientId;
          appointmentData.patientName = rescheduleData.patientName;
          appointmentData.notes = `Rescheduled from ${rescheduleData.originalDate} at ${rescheduleData.originalTime}. Reason: ${rescheduleData.reason}`;
        }

        appointments.push(appointmentData);
      });
    });
    return appointments.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
      return a.time.localeCompare(b.time);
    });
  };

  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const newAppointments = generateAppointments();
    setAppointments(newAppointments);

    // Initialize appointment details if not already set
    if (appointmentDetails.length === 0) {
      onDetailsChange(newAppointments);
    }
  }, [selectedTimeSlots, isRescheduling, rescheduleData]);

  useEffect(() => {
    loadPatients();
  }, []);

  // Handle reschedule data initialization
  useEffect(() => {
    if (isRescheduling && rescheduleData && appointments.length > 0) {
      // Auto-populate the first appointment with reschedule data
      const updatedAppointments = [...appointments];
      if (updatedAppointments[0] && !updatedAppointments[0].patientId) {
        updatedAppointments[0] = {
          ...updatedAppointments[0],
          patientId: rescheduleData.patientId,
          patientName: rescheduleData.patientName,
          notes: `Rescheduled from ${rescheduleData.originalDate} at ${rescheduleData.originalTime}. Reason: ${rescheduleData.reason}`
        };
        setAppointments(updatedAppointments);
        onDetailsChange(updatedAppointments);
      }
    }
  }, [isRescheduling, rescheduleData, appointments.length]);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim() === '') {
      setFilteredPatients([]);
    } else {
      const filtered = patients.filter(patient =>
        `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.phone && patient.phone.includes(searchTerm))
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error('Load patients error:', error);
    }
  };

  const handleAppointmentChange = (index, field, value) => {
    const updatedAppointments = [...appointments];
    updatedAppointments[index] = {
      ...updatedAppointments[index],
      [field]: value
    };

    // Auto-set color based on visit type
    if (field === 'visitType') {
      const visitType = visitTypes.find(vt => vt.value === value);
      if (visitType) {
        updatedAppointments[index].colorTag = visitType.color;
      }
    }

    setAppointments(updatedAppointments);
    onDetailsChange(updatedAppointments);
  };

  const handlePatientSelect = (patient, appointmentIndex) => {
    // Update both patientId and patientName in a single state update
    const updatedAppointments = [...appointments];
    updatedAppointments[appointmentIndex] = {
      ...updatedAppointments[appointmentIndex],
      patientId: patient._id,
      patientName: `${patient.firstName} ${patient.lastName}`
    };

    setAppointments(updatedAppointments);
    onDetailsChange(updatedAppointments);
    setSearchTerm('');
    setFilteredPatients([]);
  };

  const currentAppointment = appointments[currentAppointmentIndex];

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">No time slots selected. Please go back and select time slots first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Appointment Details</h2>
        </div>
        <div className="text-sm text-gray-400">
          {currentAppointmentIndex + 1} of {appointments.length} appointments
        </div>
      </div>

      {/* Reschedule Banner */}
      {isRescheduling && rescheduleData && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <h3 className="text-yellow-300 font-medium mb-2">Rescheduling Appointment</h3>
          <p className="text-yellow-300 text-sm">
            Patient <strong>{rescheduleData.patientName}</strong> will be automatically selected for the new appointment.
            <br />
            Original appointment: {rescheduleData.originalDate} at {rescheduleData.originalTime}
            <br />
            Reason: {rescheduleData.reason}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          {isRescheduling
            ? 'The patient information has been pre-filled. Select the new date and time, then review the appointment details.'
            : 'Fill in the details for each appointment. You can navigate between appointments using the tabs below.'
          }
        </p>
      </div>

      {/* Appointment Tabs */}
      {appointments.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {appointments.map((apt, index) => (
            <button
              key={apt.id}
              onClick={() => setCurrentAppointmentIndex(index)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentAppointmentIndex === index
                  ? 'bg-blue-600 text-white'
                  : apt.patientId
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {apt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {apt.time}
              {apt.patientId && <span className="ml-1">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Current Appointment Form */}
      {currentAppointment && (
        <div className="bg-gray-700 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              {currentAppointment.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} at {currentAppointment.time}
            </h3>
            <div className={`w-4 h-4 rounded ${colorOptions.find(c => c.value === currentAppointment.colorTag)?.class}`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <UserIcon className="h-4 w-4 inline mr-2" />
                Patient *
              </label>
              <div className="relative">
                {/* Show selected patient or search input */}
                {currentAppointment.patientId ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 bg-green-900/30 border border-green-600 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-white font-medium">{currentAppointment.patientName}</span>
                      {isRescheduling && (
                        <span className="text-green-400 text-xs">(Pre-selected for reschedule)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAppointmentChange(currentAppointmentIndex, 'patientId', '');
                        handleAppointmentChange(currentAppointmentIndex, 'patientName', '');
                        setSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-white"
                      title="Change patient"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, record number, or phone..."
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {/* Patient Search Results */}
                {filteredPatients.length > 0 && searchTerm && !currentAppointment.patientId && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        onClick={() => handlePatientSelect(patient, currentAppointmentIndex)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-500 focus:bg-gray-500 focus:outline-none"
                      >
                        <div className="text-white font-medium">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-gray-300 text-sm">
                          Record: {patient.recordNumber} | Phone: {patient.phone || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results / Create new patient */}
                {searchTerm && !currentAppointment.patientId && filteredPatients.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-md shadow-lg p-4">
                    <div className="text-gray-300 text-sm mb-3">No patients found matching "{searchTerm}"</div>
                    <button
                      type="button"
                      onClick={() => navigate('/secretary/patients/new')}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Create New Patient</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Visit Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <TagIcon className="h-4 w-4 inline mr-2" />
                Visit Type *
              </label>
              <select
                value={currentAppointment.visitType}
                onChange={(e) => handleAppointmentChange(currentAppointmentIndex, 'visitType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {visitTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                <ClockIcon className="h-4 w-4 inline mr-2" />
                Duration
              </label>
              <select
                value={currentAppointment.duration}
                onChange={(e) => handleAppointmentChange(currentAppointmentIndex, 'duration', Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Tag */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Color Tag</label>
              <div className="flex space-x-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleAppointmentChange(currentAppointmentIndex, 'colorTag', color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      currentAppointment.colorTag === color.value
                        ? 'border-white ring-2 ring-blue-500'
                        : 'border-gray-500 hover:border-gray-400'
                    } ${color.class}`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Notes</label>
            <textarea
              value={currentAppointment.notes}
              onChange={(e) => handleAppointmentChange(currentAppointmentIndex, 'notes', e.target.value)}
              placeholder="Additional notes for this appointment..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3">Progress Summary:</h4>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">
              {appointments.filter(apt => apt.patientId).length} completed
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-gray-300">
              {appointments.filter(apt => !apt.patientId).length} remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsForm;
