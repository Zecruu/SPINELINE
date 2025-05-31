import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import PatientDetailsModal from '../components/doctor/PatientDetailsModal';
import CancelModal from '../components/secretary/CancelModal';

import {
  ArrowPathIcon,
  EyeIcon,
  PlayIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const DoctorTodaysPatients = () => {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

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

    // Check if user is doctor
    if (parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadTodaysAppointments();
  }, [navigate]);

  // Refresh when returning from patient flow or other operations
  useEffect(() => {
    if (location.state?.refreshNeeded) {
      console.log('🔄 Returned from patient flow, refreshing appointments');
      loadTodaysAppointments();
      setLastRefresh(new Date());

      // Clear the state after handling
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);



  // Load today's appointments for this doctor
  const loadTodaysAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/appointments/doctor/today', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('📅 Doctor\'s appointments loaded:', response.data.appointments);
        console.log('📊 Total appointments:', response.data.appointments.length);

        // Log the structure of the first appointment to debug
        if (response.data.appointments.length > 0) {
          console.log('🔍 First appointment structure:', response.data.appointments[0]);
          console.log('🔍 Patient data structure:', response.data.appointments[0].patient || response.data.appointments[0].patientId);
        }

        // Ensure all appointments have safe properties
        const safeAppointments = (response.data.appointments || []).map(appointment => ({
          ...appointment,
          status: appointment.status || 'Scheduled',
          visitType: appointment.visitType || 'Regular Visit',
          patientName: appointment.patientName || appointment.patient?.fullName || appointment.patientId?.fullName || 'Unknown Patient',
          patient: appointment.patient || { fullName: 'Unknown Patient' },
          appointmentTime: appointment.appointmentTime || '00:00'
        }));

        setAppointments(safeAppointments);
      } else {
        console.error('❌ Failed to load appointments:', response.data.message);
        setAppointments([]); // Set empty array on failure
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handle appointment status updates
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(`/api/appointments/${appointmentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log(`✅ Status updated to ${newStatus} - refreshing list`);
        await loadTodaysAppointments(); // Refresh only after status change
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  // Handle patient flow navigation
  const handleStartVisit = (appointment) => {
    navigate(`/doctor/patient/${appointment._id}`);
  };

  // Handle view patient details
  const handleViewPatient = (appointment) => {
    setSelectedPatient(appointment);
    setShowPatientDetails(true);
  };

  // Handle reschedule appointment
  const handleReschedule = (appointment) => {
    // Store reschedule data in sessionStorage for the scheduler
    const rescheduleData = {
      appointmentId: appointment._id,
      patientId: appointment.patientId?._id || appointment.patient?._id,
      patientName: appointment.patientId?.fullName || appointment.patient?.fullName,
      originalDate: new Date(appointment.appointmentDate).toLocaleDateString(),
      originalTime: appointment.appointmentTime,
      reason: 'Doctor requested reschedule'
    };

    sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));
    navigate('/doctor/scheduler');
  };

  // Handle cancel appointment
  const handleCancel = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // Confirm cancellation
  const confirmCancellation = async (reason) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(`/api/appointments/${selectedAppointment._id}/status`,
        {
          status: 'Cancelled',
          cancellationReason: reason,
          actionTaken: 'Appointment Cancelled'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('✅ Appointment cancelled successfully');
        await loadTodaysAppointments();
        setShowCancelModal(false);
        setSelectedAppointment(null);
      }
    } catch (error) {
      console.error('Cancel appointment error:', error);
    }
  };

  // Format time display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white">Today's Patients</h1>
            <p className="text-gray-400">
              Manage your patient appointments and visits • {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                loadTodaysAppointments();
                setLastRefresh(new Date());
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <div className="text-xs text-gray-500 flex items-center">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row gap-6 min-h-0 overflow-hidden">
          {/* Scheduled Column */}
          <div className="flex-1 bg-gray-800 rounded-lg flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Scheduled ({(appointments || []).filter(apt => apt?.status === 'Scheduled').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                  <span className="text-right">Actions</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(appointments || []).filter(apt => apt?.status === 'Scheduled').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No scheduled appointments
                </div>
              ) : (
                <div className="space-y-2">
                  {(appointments || []).filter(apt => apt?.status === 'Scheduled').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-4 gap-4 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || appointment.patientId?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType}</div>
                      </div>
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleStatusUpdate(appointment._id, 'Checked-In')}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          title="Check In Patient"
                        >
                          Check In
                        </button>
                        <button
                          onClick={() => handleReschedule(appointment)}
                          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          title="Reschedule"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(appointment)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          title="Cancel"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleViewPatient(appointment)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="See Details"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checked-In Column */}
          <div className="flex-1 bg-gray-800 rounded-lg flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Checked-In ({(appointments || []).filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                  <span className="text-right">Actions</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(appointments || []).filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No checked-in patients
                </div>
              ) : (
                <div className="space-y-2">
                  {(appointments || []).filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-4 gap-4 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || appointment.patientId?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType}</div>
                        {appointment.status === 'In Treatment' && (
                          <div className="text-orange-400 text-xs">🔄 In Treatment</div>
                        )}
                        {appointment.status === 'In Progress' && (
                          <div className="text-orange-400 text-xs">🔄 In Progress</div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewPatient(appointment)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="See Details"
                        >
                          See Details
                        </button>
                        <button
                          onClick={() => handleStartVisit(appointment)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          title="Start Visit"
                        >
                          Start Visit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checked-Out Column */}
          <div className="flex-1 bg-gray-800 rounded-lg flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Checked-Out ({(appointments || []).filter(apt => apt?.status === 'Checked-Out').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                  <span className="text-right">Actions</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(appointments || []).filter(apt => apt?.status === 'Checked-Out').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No completed visits
                </div>
              ) : (
                <div className="space-y-2">
                  {(appointments || []).filter(apt => apt?.status === 'Checked-Out').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-4 gap-4 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || appointment.patientId?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType}</div>
                        <div className="text-green-400 text-xs">✅ Completed</div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewPatient(appointment)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="See Details"
                        >
                          See Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Patient Details Modal */}
      <PatientDetailsModal
        isOpen={showPatientDetails}
        onClose={() => setShowPatientDetails(false)}
        appointment={selectedPatient}
        onStartVisit={handleStartVisit}
        onRefresh={loadTodaysAppointments}
      />

      {/* Cancel Modal */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        appointment={selectedAppointment}
        onConfirm={confirmCancellation}
      />
    </DoctorLayout>
  );
};

export default DoctorTodaysPatients;
