import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import PatientDetailsPanel from '../components/secretary/PatientDetailsPanel';
import DailyReportModal from '../components/secretary/DailyReportModal';

import {
  CalendarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowPathIcon,
  FunnelIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const TodaysPatients = () => {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [successMessage, setSuccessMessage] = useState('');

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
    loadTodaysAppointments();
  }, [navigate]);

  // Refresh when returning from checkout or other operations
  useEffect(() => {
    console.log('🔍 Location state changed:', location.state);
    if (location.state?.message) {
      console.log('🔄 Returned from operation, refreshing appointments');
      console.log('📝 Success message:', location.state.message);
      setSuccessMessage(location.state.message);
      loadTodaysAppointments();
      setLastRefresh(new Date());

      // Clear the state message after handling
      navigate(location.pathname, { replace: true, state: {} });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location.state, navigate, location.pathname]);

  // Also refresh when component mounts or when returning to the page
  useEffect(() => {
    console.log('🔄 TodaysPatients component mounted/updated, loading appointments');
    loadTodaysAppointments();
  }, []);

  // Refresh when window regains focus (user returns from another tab/window)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing appointments');
      loadTodaysAppointments();
      setLastRefresh(new Date());
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);



  // Load today's appointments
  const loadTodaysAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      console.log('🔄 Making API call to /api/appointments/today...');
      console.log('🔑 Token exists:', !!token);
      console.log('📅 Current date:', new Date().toISOString());
      console.log('📅 Current local date:', new Date().toLocaleDateString());
      console.log('👤 User role:', user?.role);

      // Add cache-busting parameter to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/appointments/today?_t=${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📡 API Response:', response.data);

      if (response.data.success) {
        console.log('✅ API call successful!');
        console.log('📅 Today\'s appointments loaded:', response.data.appointments);

        // Ensure appointments is always an array
        const appointmentsArray = response.data.appointments || [];
        console.log('📊 Total appointments:', appointmentsArray.length);
        console.log('📋 Scheduled appointments:', appointmentsArray.filter(apt => apt.status === 'Scheduled').length);
        console.log('📋 Checked-In appointments:', appointmentsArray.filter(apt => apt.status === 'Checked-In').length);
        console.log('📋 In Progress appointments:', appointmentsArray.filter(apt => apt.status === 'In Progress').length);

        // Debug each appointment
        appointmentsArray.forEach(apt => {
          console.log(`  📋 ${apt.patient?.fullName || 'Unknown'} - Status: ${apt.status} - Time: ${apt.appointmentTime} - ID: ${apt._id}`);
        });

        setAppointments(appointmentsArray);
      } else {
        console.error('❌ API returned success: false');
        console.error('❌ Failed to load appointments:', response.data.message);
        // Set empty array on failure
        setAppointments(response.data.appointments || []);
      }
    } catch (error) {
      console.error('❌ Load appointments error:', error);
      console.error('❌ Error details:', error.response?.data);
      // Set empty array on error to prevent undefined issues
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle patient selection
  const handleViewPatient = async (appointmentId) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSelectedPatient(response.data.appointment);
        setShowPatientDetails(true);
      }
    } catch (error) {
      console.error('Load patient details error:', error);
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

  // Handle confirmation status toggle
  const handleConfirmationToggle = async (appointmentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Confirmed' ? 'Unconfirmed' : 'Confirmed';
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(`/api/appointments/${appointmentId}/confirmation`,
        { confirmationStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log(`✅ Confirmation status updated to ${newStatus} - refreshing list`);
        await loadTodaysAppointments();
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Update confirmation status error:', error);
    }
  };

  // Handle treatment status toggle
  const handleTreatmentStatusToggle = async (appointmentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Ready for Checkout' ? 'In Progress' : 'Ready for Checkout';
      const token = localStorage.getItem('userToken');
      const response = await axios.patch(`/api/appointments/${appointmentId}/treatment-status`,
        { treatmentStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log(`✅ Treatment status updated to ${newStatus} - refreshing list`);
        await loadTodaysAppointments();
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Update treatment status error:', error);
    }
  };

  // Handle checkout
  const handleCheckout = (appointment) => {
    navigate(`/secretary/checkout/${appointment._id}`);
  };

  // Handle Reschedule - Direct to scheduler with auto-populated data
  const handleReschedule = (appointment) => {
    // Store reschedule data in sessionStorage for the scheduler
    const rescheduleData = {
      appointmentId: appointment._id,
      patientId: appointment.patient._id,
      patientName: appointment.patient.fullName,
      originalDate: new Date(appointment.appointmentDate).toLocaleDateString(),
      originalTime: appointment.appointmentTime,
      reason: 'Rescheduled from Today\'s Patients'
    };

    sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));

    // Navigate directly to scheduler
    navigate('/secretary/appointments/scheduler');
  };

  // Handle Cancel
  const handleCancel = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // Confirm cancellation
  const confirmCancellation = async () => {
    try {
      const token = localStorage.getItem('userToken');

      // Update appointment status to cancelled
      await axios.patch(`/api/appointments/${selectedAppointment._id}/status`,
        { status: 'Cancelled', cancellationReason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Log to ledger for tracking
      try {
        await axios.post('/api/ledger/appointment-action', {
          appointmentId: selectedAppointment._id,
          action: 'cancelled',
          reason: cancelReason,
          originalDate: selectedAppointment.appointmentDate,
          originalTime: selectedAppointment.appointmentTime
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (ledgerError) {
        console.warn('Failed to log to ledger, but appointment was cancelled:', ledgerError);
        // Don't fail the whole operation if ledger logging fails
      }

      // Refresh appointments
      loadTodaysAppointments();

      // Close modal and reset
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');

      alert('Appointment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    }
  };





  // Format time helper
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-900/50 text-blue-300 border border-blue-700';
      case 'Checked-In':
        return 'bg-green-900/50 text-green-300 border border-green-700';
      case 'In Progress':
        return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700';
      case 'Completed':
        return 'bg-purple-900/50 text-purple-300 border border-purple-700';
      case 'Checked-Out':
        return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700';
      case 'No-Show':
        return 'bg-red-900/50 text-red-300 border border-red-700';
      case 'Cancelled':
        return 'bg-gray-900/50 text-gray-300 border border-gray-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <SecretaryLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-4 flex items-center space-x-3">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white">Today's Patients</h1>
            <p className="text-gray-400">
              Manage today's appointments and patient flow • {new Date().toLocaleDateString('en-US', {
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
                console.log('🔄 Manual refresh triggered');
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
            <button
              onClick={() => setShowDailyReport(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              📄 Daily Report
            </button>
            <button
              onClick={() => navigate('/secretary/appointments/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Quick Schedule
            </button>
            <button
              onClick={() => navigate('/secretary/appointments/scheduler')}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-400 bg-transparent hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              Advanced Scheduler
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-row gap-6 min-h-0 overflow-hidden">
          {/* Scheduled Column */}
          <div className="flex-1 bg-gray-800 rounded-lg flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Scheduled ({appointments.filter(apt => apt?.status === 'Scheduled').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-5 gap-2 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                  <span className="text-right col-span-2">Actions</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {appointments.filter(apt => apt?.status === 'Scheduled').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No appointments
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.filter(apt => apt?.status === 'Scheduled').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-5 gap-2 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment._id)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType || 'Regular Visit'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmationToggle(appointment._id, appointment.confirmationStatus);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                              appointment.confirmationStatus === 'Confirmed'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            {appointment.confirmationStatus === 'Confirmed' ? (
                              <>
                                <CheckIcon className="h-3 w-3" />
                                Confirmed
                              </>
                            ) : (
                              <>
                                <ClockIcon className="h-3 w-3" />
                                Unconfirmed
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 flex gap-1 justify-end">
                        <button
                          onClick={() => handleStatusUpdate(appointment._id, 'Checked-In')}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium"
                        >
                          Check In
                        </button>
                        <button
                          onClick={() => handleReschedule(appointment)}
                          className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded font-medium"
                        >
                          <ArrowPathIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleCancel(appointment)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded font-medium"
                        >
                          <XMarkIcon className="h-3 w-3" />
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
                <h3 className="text-white font-medium">Checked-In ({appointments.filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-5 gap-2 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                  <span className="text-right col-span-2">Actions</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {appointments.filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No appointments
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.filter(apt => apt?.status === 'Checked-In' || apt?.status === 'In Treatment' || apt?.status === 'In Progress').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-5 gap-2 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment._id)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType || 'Regular Visit'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTreatmentStatusToggle(appointment._id, appointment.treatmentStatus);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                              appointment.treatmentStatus === 'Ready for Checkout'
                                ? 'bg-green-600 text-white'
                                : 'bg-orange-600 text-white'
                            }`}
                          >
                            {appointment.treatmentStatus === 'Ready for Checkout' ? (
                              <>
                                <CheckIcon className="h-3 w-3" />
                                Ready for Checkout
                              </>
                            ) : (
                              <>
                                <ClockIcon className="h-3 w-3" />
                                In Progress
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 flex gap-1 justify-end">
                        <button
                          onClick={() => handleCheckout(appointment)}
                          disabled={appointment.treatmentStatus !== 'Ready for Checkout'}
                          className={`px-2 py-1 text-white text-xs rounded font-medium ${
                            appointment.treatmentStatus === 'Ready for Checkout'
                              ? 'bg-purple-500 hover:bg-purple-600'
                              : 'bg-gray-500 cursor-not-allowed opacity-50'
                          }`}
                        >
                          Checkout
                        </button>
                        <button
                          onClick={() => handleReschedule(appointment)}
                          className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded font-medium"
                        >
                          <ArrowPathIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checked Out Column */}
          <div className="flex-1 bg-gray-800 rounded-lg flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Checked Out ({appointments.filter(apt => apt?.status === 'Checked-Out').length})</h3>
              </div>
              <div className="mt-2">
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                  <span>Time</span>
                  <span className="col-span-2">Patient</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {appointments.filter(apt => apt?.status === 'Checked-Out').length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  No appointments
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.filter(apt => apt?.status === 'Checked-Out').map((appointment) => (
                    <div key={appointment._id} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-700 rounded hover:bg-gray-600">
                      <div className="text-sm text-white font-medium">
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <div className="col-span-2 text-sm cursor-pointer" onClick={() => handleViewPatient(appointment._id)}>
                        <div className="text-white font-medium">{appointment.patient?.fullName || 'Unknown Patient'}</div>
                        <div className="text-gray-400 text-xs">{appointment.visitType || 'Regular Visit'}</div>
                        <div className="text-green-400 text-xs">✓ Checked Out</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Patient Details Panel */}
      {showPatientDetails && selectedPatient && (
        <PatientDetailsPanel
          appointment={selectedPatient}
          isOpen={showPatientDetails}
          onClose={() => {
            setShowPatientDetails(false);
            setSelectedPatient(null);
          }}
          onRefresh={loadTodaysAppointments}
        />
      )}

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={showDailyReport}
        onClose={() => setShowDailyReport(false)}
        selectedDate={new Date()}
      />



      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-white mb-4">Cancel Appointment</h3>

            {/* Appointment Details */}
            <div className="mb-4 bg-gray-700 rounded-lg p-3">
              <div className="text-white font-medium">{selectedAppointment?.patient?.fullName}</div>
              <div className="text-gray-400 text-sm">
                {formatDate(selectedAppointment?.appointmentDate)} at {formatTime(selectedAppointment?.appointmentTime)}
              </div>
              <div className="text-gray-400 text-sm">{selectedAppointment?.visitType}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cancellation Reason (required)
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">Select reason...</option>
                <option value="Patient No Show">Patient No Show</option>
                <option value="Patient Request">Patient Request</option>
                <option value="Doctor Unavailable">Doctor Unavailable</option>
                <option value="Emergency">Emergency</option>
                <option value="Weather">Weather</option>
                <option value="Equipment Issue">Equipment Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-gray-400 text-sm">Notify Patient?</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedAppointment(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Keep Appointment
              </button>
              <button
                onClick={confirmCancellation}
                disabled={!cancelReason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}

    </SecretaryLayout>
  );
};

export default TodaysPatients;
