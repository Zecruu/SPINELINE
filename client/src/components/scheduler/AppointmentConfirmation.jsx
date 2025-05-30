import { useState } from 'react';
import axios from 'axios';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const AppointmentConfirmation = ({
  selectedDates,
  selectedTimeSlots,
  appointmentDetails,
  onSave,
  loading,
  setLoading,
  rescheduleData,
  isRescheduling
}) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const colorOptions = {
    green: { class: 'bg-green-500', label: 'Green' },
    yellow: { class: 'bg-yellow-500', label: 'Yellow' },
    blue: { class: 'bg-blue-500', label: 'Blue' },
    white: { class: 'bg-white border border-gray-400', label: 'White' },
    red: { class: 'bg-red-500', label: 'Red' }
  };

  // Validate all appointments have required fields
  const validateAppointments = () => {
    const errors = [];

    console.log('🔍 Validating appointments:', appointmentDetails);

    appointmentDetails.forEach((apt, index) => {
      console.log(`🔍 Validating appointment ${index + 1}:`, {
        patientId: apt.patientId,
        visitType: apt.visitType,
        hasPatientId: !!apt.patientId,
        hasVisitType: !!apt.visitType
      });

      if (!apt.patientId) {
        errors.push(`Appointment ${index + 1}: Patient is required (patientId: "${apt.patientId}")`);
      }
      if (!apt.visitType) {
        errors.push(`Appointment ${index + 1}: Visit type is required (visitType: "${apt.visitType}")`);
      }
    });

    console.log('🔍 Validation errors:', errors);
    return errors;
  };

  const handleSaveAppointments = async () => {
    setError('');
    setSuccess('');

    // Validate appointments
    const validationErrors = validateAppointments();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    console.log(isRescheduling ? '🔄 Proceeding with appointment rescheduling...' : '🚀 Proceeding with appointment creation...');

    setLoading(true);

    try {
      const token = localStorage.getItem('userToken');

      if (isRescheduling && rescheduleData) {
        // Handle rescheduling - update the original appointment
        const newAppointment = appointmentDetails[0]; // Should only be one appointment when rescheduling

        // Format date to YYYY-MM-DD in local timezone
        const year = newAppointment.date.getFullYear();
        const month = String(newAppointment.date.getMonth() + 1).padStart(2, '0');
        const day = String(newAppointment.date.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;

        const updateData = {
          appointmentDate: localDateString,
          appointmentTime: newAppointment.time,
          duration: newAppointment.duration,
          visitType: newAppointment.visitType,
          colorTag: newAppointment.colorTag,
          notes: newAppointment.notes || '',
          status: 'Scheduled',
          rescheduleReason: rescheduleData.reason,
          actionTaken: 'Appointment Rescheduled'
        };

        console.log('🔄 Updating appointment:', rescheduleData.appointmentId, updateData);

        // Update the original appointment
        const response = await axios.put(`/api/appointments/${rescheduleData.appointmentId}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data.success) {
          setError('Failed to reschedule appointment');
          return;
        }

        setSuccess('Appointment rescheduled successfully!');
      } else {
        // Handle normal appointment creation
        const appointmentsToCreate = appointmentDetails.map(apt => {
          // Format date to YYYY-MM-DD in local timezone to avoid timezone issues
          const year = apt.date.getFullYear();
          const month = String(apt.date.getMonth() + 1).padStart(2, '0');
          const day = String(apt.date.getDate()).padStart(2, '0');
          const localDateString = `${year}-${month}-${day}`;

          return {
            patientId: apt.patientId,
            appointmentDate: localDateString,
            appointmentTime: apt.time,
            duration: apt.duration,
            visitType: apt.visitType,
            colorTag: apt.colorTag,
            notes: apt.notes || '',
            chiefComplaint: apt.notes || ''
          };
        });

        console.log('🚀 Sending appointment data to API:', appointmentsToCreate);

        // Create appointments in batch
        const promises = appointmentsToCreate.map(aptData => {
          console.log('📤 Creating appointment:', aptData);
          return axios.post('/api/appointments', aptData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        });

        const results = await Promise.all(promises);

        // Check if all appointments were created successfully
        const failedAppointments = results.filter(result => !result.data.success);

        if (failedAppointments.length > 0) {
          setError(`Failed to create ${failedAppointments.length} appointment(s)`);
          return;
        }

        setSuccess(`Successfully created ${appointmentDetails.length} appointment(s)!`);
      }

      // Redirect after a short delay
      setTimeout(() => {
        onSave();
      }, 2000);

    } catch (error) {
      console.error(isRescheduling ? 'Reschedule appointment error:' : 'Create appointments error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.errors?.join(', ') ||
                          (isRescheduling ? 'Failed to reschedule appointment' : 'Failed to create appointments');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalAppointments = appointmentDetails.length;
  const completedAppointments = appointmentDetails.filter(apt => apt.patientId).length;
  const isReadyToSave = completedAppointments === totalAppointments && totalAppointments > 0;

  // Debug logging
  console.log('🔍 Appointment Details Debug:', {
    totalAppointments,
    completedAppointments,
    isReadyToSave,
    appointmentDetails: appointmentDetails.map(apt => ({
      id: apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      hasPatientId: !!apt.patientId
    }))
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">
            {isRescheduling ? 'Confirm Reschedule' : 'Confirm Appointments'}
          </h2>
        </div>
        <div className="text-sm text-gray-400">
          {isRescheduling
            ? 'Rescheduling 1 appointment'
            : `${totalAppointments} appointment${totalAppointments !== 1 ? 's' : ''} to create`
          }
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg flex items-start space-x-3">
          <CheckIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Success</p>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{selectedDates.length}</p>
              <p className="text-sm text-gray-400">Date{selectedDates.length !== 1 ? 's' : ''} Selected</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{totalAppointments}</p>
              <p className="text-sm text-gray-400">Time Slot{totalAppointments !== 1 ? 's' : ''} Selected</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{completedAppointments}</p>
              <p className="text-sm text-gray-400">Patient{completedAppointments !== 1 ? 's' : ''} Assigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Appointment Summary</h3>

        {!isReadyToSave && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg mb-4 flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Incomplete Appointments</p>
              <p className="text-sm">Please ensure all appointments have patients assigned before saving.</p>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {appointmentDetails.map((apt, index) => (
            <div
              key={apt.id}
              className={`p-4 rounded-lg border-l-4 ${
                apt.patientId
                  ? 'bg-gray-600 border-green-500'
                  : 'bg-gray-800 border-red-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded ${colorOptions[apt.colorTag]?.class}`}></div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white font-medium">
                        {apt.date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <ClockIcon className="h-4 w-4 text-gray-400 ml-4" />
                      <span className="text-white">{apt.time}</span>
                      <span className="text-gray-400">({apt.duration} min)</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className={apt.patientId ? 'text-white' : 'text-red-400'}>
                        {apt.patientName || 'No patient assigned'}
                      </span>
                      <TagIcon className="h-4 w-4 text-gray-400 ml-4" />
                      <span className="text-gray-300">{apt.visitType}</span>
                    </div>
                    {apt.notes && (
                      <p className="text-gray-400 text-sm mt-1">{apt.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  {apt.patientId ? (
                    <CheckIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSaveAppointments}
          disabled={!isReadyToSave || loading}
          className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
            isReadyToSave && !loading
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{isRescheduling ? 'Rescheduling Appointment...' : 'Creating Appointments...'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5" />
              <span>{isRescheduling ? 'Confirm Reschedule' : 'Save All Appointments'}</span>
            </div>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          Review all appointment details above. Once you click "Save All Appointments",
          these appointments will be created in the system and you'll be redirected to the Today's Patients page.
        </p>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;
