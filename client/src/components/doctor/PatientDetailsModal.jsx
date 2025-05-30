import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const PatientDetailsModal = ({ isOpen, onClose, appointment, onStartVisit, onRefresh }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newAppointment, setNewAppointment] = useState({
    appointmentDate: '',
    appointmentTime: '',
    visitType: 'Follow-Up',
    duration: 30,
    notes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && appointment) {
      loadPatientDetails();
    }
  }, [isOpen, appointment]);

  const loadPatientDetails = async () => {
    if (!appointment?.patient?._id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/patients/${appointment.patient._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPatient(response.data.patient);
        setAlerts(response.data.patient.alerts?.filter(alert => alert.isVisible) || []);
      }
    } catch (error) {
      console.error('Error loading patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Patient
  const handleEditPatient = () => {
    navigate(`/secretary/patients/edit/${patient._id}`);
    onClose();
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (reason) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`/api/appointments/${appointment._id}/status`,
        { status: 'Cancelled', cancellationReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Log to ledger for tracking
      await axios.post('/api/ledger/appointment-action', {
        appointmentId: appointment._id,
        action: 'cancelled',
        reason: reason,
        originalDate: appointment.appointmentDate,
        originalTime: appointment.appointmentTime
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  // Handle Reschedule Appointment - Navigate to scheduler
  const handleRescheduleAppointment = () => {
    // Store reschedule data in sessionStorage for the scheduler
    const rescheduleData = {
      appointmentId: appointment._id,
      patientId: appointment.patient?._id || appointment.patientId?._id,
      patientName: appointment.patient?.fullName || appointment.patientId?.fullName,
      originalDate: new Date(appointment.appointmentDate).toLocaleDateString(),
      originalTime: appointment.appointmentTime,
      reason: 'Rescheduled from Patient Details'
    };

    sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));

    // Close modal and navigate to scheduler
    onClose();
    window.location.href = '/doctor/scheduler';
  };

  // Handle Schedule Next Visit
  const handleScheduleNextVisit = () => {
    setShowScheduleModal(true);
  };

  // Handle scheduling new appointment
  const handleScheduleNewAppointment = async (appointmentData) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.post('/api/appointments', {
        ...appointmentData,
        patientId: patient._id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (onRefresh) onRefresh();
      setShowScheduleModal(false);
      onClose();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
    }
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'text-yellow-400 bg-yellow-900/20';
      case 'Checked-In': return 'text-blue-400 bg-blue-900/20';
      case 'In Treatment': return 'text-orange-400 bg-orange-900/20';
      case 'Checked-Out': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-900/20';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20';
      case 'low': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                <UserIcon className="h-6 w-6 mr-2" />
                Patient Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading patient details...</p>
            </div>
          ) : (
            <div className="bg-gray-800 px-6 py-4 max-h-[600px] overflow-y-auto">
              {/* Patient Profile Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center">
                      <UserIcon className="h-5 w-5 mr-2" />
                      Patient Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-medium text-lg">
                            {appointment?.patient?.fullName?.charAt(0)?.toUpperCase() || 'P'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{appointment?.patient?.fullName || 'Unknown Patient'}</p>
                          <p className="text-gray-400 text-sm">Record #{patient?.recordNumber || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm text-gray-400">Age</label>
                          <p className="text-white">{calculateAge(patient?.dateOfBirth)} years</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Date of Birth</label>
                          <p className="text-white">{formatDate(patient?.dateOfBirth)}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Gender</label>
                          <p className="text-white">{patient?.gender || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">Phone</label>
                          <p className="text-white">{patient?.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Today's Appointment
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time:</span>
                        <span className="text-white">{formatTime(appointment?.appointmentTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Visit Type:</span>
                        <span className="text-white">{appointment?.visitType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment?.status)}`}>
                          {appointment?.status}
                        </span>
                      </div>
                      {appointment?.notes && (
                        <div>
                          <span className="text-gray-400">Notes:</span>
                          <p className="text-white text-sm mt-1">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Insurance & Packages */}
                <div className="space-y-4">
                  {/* Insurance Information */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2" />
                      Insurance Information
                    </h4>
                    {patient?.insurances?.length > 0 ? (
                      <div className="space-y-3">
                        {patient.insurances.filter(ins => ins.isPrimary).map((insurance, index) => (
                          <div key={index} className="border border-gray-600 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-medium">{insurance.insuranceName}</p>
                                <p className="text-gray-400 text-sm">Policy: {insurance.memberId}</p>
                                <p className="text-gray-400 text-sm">Group: {insurance.groupId || 'N/A'}</p>
                              </div>
                              <span className="px-2 py-1 text-xs bg-blue-900/20 text-blue-400 rounded">Primary</span>
                            </div>
                            <div className="mt-2">
                              <span className="text-gray-400 text-sm">Expires: </span>
                              <span className="text-white text-sm">{formatDate(insurance.expirationDate)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No insurance information available</p>
                    )}
                  </div>

                  {/* Care Packages */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center">
                      <CreditCardIcon className="h-5 w-5 mr-2" />
                      Care Packages
                    </h4>
                    {patient?.packages?.filter(pkg => pkg.isActive).length > 0 ? (
                      <div className="space-y-3">
                        {patient.packages.filter(pkg => pkg.isActive).map((pkg, index) => (
                          <div key={index} className="border border-gray-600 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-medium">{pkg.packageName}</p>
                                <p className="text-gray-400 text-sm">
                                  {pkg.remainingVisits} of {pkg.totalVisits} visits remaining
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded ${
                                pkg.remainingVisits > 5 ? 'bg-green-900/20 text-green-400' :
                                pkg.remainingVisits > 0 ? 'bg-yellow-900/20 text-yellow-400' :
                                'bg-red-900/20 text-red-400'
                              }`}>
                                {pkg.remainingVisits > 0 ? 'Active' : 'Expired'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No active care packages</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Alerts Section */}
              {alerts.length > 0 && (
                <div className="mb-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-medium mb-3 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Active Alerts
                  </h4>
                  <div className="space-y-2">
                    {alerts.map((alert, index) => (
                      <div key={index} className={`flex items-center justify-between p-2 rounded ${getPriorityColor(alert.priority)}`}>
                        <div>
                          <p className="font-medium">{alert.type}</p>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-700">
                          {alert.priority || 'Medium'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Information */}
              {patient?.referrals?.filter(ref => ref.isActive).length > 0 && (
                <div className="mb-6 bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Active Referrals
                  </h4>
                  <div className="space-y-3">
                    {patient.referrals.filter(ref => ref.isActive).map((referral, index) => (
                      <div key={index} className="border border-gray-600 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium">From: {referral.source}</p>
                            <p className="text-gray-400 text-sm">Visits: {referral.visitsUsed} of {referral.totalVisits}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            referral.remainingDays > 7 ? 'bg-green-900/20 text-green-400' :
                            referral.remainingDays > 0 ? 'bg-yellow-900/20 text-yellow-400' :
                            'bg-red-900/20 text-red-400'
                          }`}>
                            {referral.remainingDays} days left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>

                <button
                  onClick={handleEditPatient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Patient
                </button>

                {appointment?.status === 'Scheduled' && (
                  <>
                    <button
                      onClick={handleRescheduleAppointment}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Reschedule
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </>
                )}

                <button
                  onClick={handleScheduleNextVisit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Manage Appointments
                </button>

                {(appointment?.status === 'Checked-In' || appointment?.status === 'In Treatment') && onStartVisit && (
                  <button
                    onClick={() => {
                      onStartVisit(appointment);
                      onClose();
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Visit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Appointment Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-white mb-4">Cancel Appointment</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Reason for cancellation
              </label>
              <select
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                <option value="Patient Request">Patient Request</option>
                <option value="Doctor Unavailable">Doctor Unavailable</option>
                <option value="Emergency">Emergency</option>
                <option value="Weather">Weather</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Keep Appointment
              </button>
              <button
                onClick={() => {
                  handleCancelAppointment(cancelReason || 'No reason provided');
                  setShowCancelModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Appointment Management Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-6">Manage Appointments</h3>

            {/* Current Appointment Section */}
            <div className="mb-6 bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Current Appointment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">{formatDate(appointment?.appointmentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white">{formatTime(appointment?.appointmentTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{appointment?.visitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment?.status)}`}>
                    {appointment?.status}
                  </span>
                </div>
              </div>

              {/* Current Appointment Actions */}
              {appointment?.status === 'Scheduled' && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      handleRescheduleAppointment();
                    }}
                    className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                  >
                    Reschedule This
                  </button>
                  <button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setShowCancelModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Cancel This
                  </button>
                </div>
              )}
            </div>

            {/* Schedule New Appointment Section */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-4">Schedule New Appointment</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
                    <input
                      type="date"
                      value={newAppointment.appointmentDate}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, appointmentDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Time</label>
                    <input
                      type="time"
                      value={newAppointment.appointmentTime}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, appointmentTime: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Visit Type</label>
                    <select
                      value={newAppointment.visitType}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, visitType: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    >
                      <option value="Follow-Up">Follow-Up</option>
                      <option value="Regular Visit">Regular Visit</option>
                      <option value="Re-evaluation">Re-evaluation</option>
                      <option value="Treatment">Treatment</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration (min)</label>
                    <select
                      value={newAppointment.duration}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Notes (optional)</label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    placeholder="Any special notes for this appointment..."
                  />
                </div>

                <button
                  onClick={() => handleScheduleNewAppointment(newAppointment)}
                  disabled={!newAppointment.appointmentDate || !newAppointment.appointmentTime}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule New Appointment
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetailsModal;
