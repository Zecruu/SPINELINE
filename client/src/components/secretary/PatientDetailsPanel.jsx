import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ExclamationTriangleIcon, CalendarIcon, CreditCardIcon, PencilIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatPhoneDisplay } from '../../utils/phoneFormatter';
import axios from 'axios';

const PatientDetailsPanel = ({ appointment, isOpen, onClose, onRefresh }) => {
  const [addingAlert, setAddingAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'Important Note',
    message: '',
    priority: 'Medium'
  });
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

  if (!isOpen || !appointment) return null;

  const patient = appointment.patient;

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
      patientId: appointment.patient._id,
      patientName: appointment.patient.fullName,
      originalDate: new Date(appointment.appointmentDate).toLocaleDateString(),
      originalTime: appointment.appointmentTime,
      reason: 'Rescheduled from Patient Details'
    };

    sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));

    // Close modal and navigate to scheduler
    onClose();
    navigate('/secretary/appointments/scheduler');
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

  const handleAddAlert = async () => {
    try {
      // This would typically make an API call to add the alert
      // For now, we'll just close the form
      setAddingAlert(false);
      setNewAlert({
        type: 'Important Note',
        message: '',
        priority: 'Medium'
      });
      onRefresh();
    } catch (error) {
      console.error('Add alert error:', error);
    }
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getReferralStatus = (referral) => {
    if (!referral.isActive) return { text: 'Inactive', color: 'text-gray-400' };

    const remainingDays = referral.remainingDays || 0;
    if (remainingDays <= 0) return { text: 'Expired', color: 'text-red-400' };
    if (remainingDays <= 7) return { text: `${remainingDays} days left`, color: 'text-red-400' };
    if (remainingDays <= 30) return { text: `${remainingDays} days left`, color: 'text-yellow-400' };
    return { text: `${remainingDays} days left`, color: 'text-green-400' };
  };

  const getAlertPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-400 bg-red-900';
      case 'High': return 'text-orange-400 bg-orange-900';
      case 'Medium': return 'text-yellow-400 bg-yellow-900';
      case 'Low': return 'text-gray-400 bg-gray-900';
      default: return 'text-gray-400 bg-gray-900';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'text-yellow-400 bg-yellow-900/20';
      case 'Checked-In': return 'text-blue-400 bg-blue-900/20';
      case 'In Treatment': return 'text-orange-400 bg-orange-900/20';
      case 'Checked-Out': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gray-800 shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Patient Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Patient Basic Info */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {patient.fullName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{patient.fullName}</h3>
                  <p className="text-gray-400">
                    DOB: {formatDate(patient.dateOfBirth)} • Age: {calculateAge(patient.dateOfBirth)}
                  </p>
                  <p className="text-gray-400">
                    Record: {patient.recordNumber} • Phone: {formatPhoneDisplay(patient.phone)}
                  </p>
                  {patient.email && (
                    <p className="text-gray-400">Email: {patient.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Insurance Details */}
            {patient.activeInsurance && (
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Insurance Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Insurance:</span>
                    <span className="text-white">{patient.activeInsurance.insuranceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Member ID:</span>
                    <span className="text-white">{patient.activeInsurance.memberId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Co-pay:</span>
                    <span className="text-white">${patient.activeInsurance.copay || 0}</span>
                  </div>
                  {patient.activeInsurance.expirationDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expires:</span>
                      <span className="text-white">{formatDate(patient.activeInsurance.expirationDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referral Status */}
            {patient.activeReferrals && patient.activeReferrals.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Referral Status</h4>
                <div className="space-y-3">
                  {patient.activeReferrals.map((referral, index) => {
                    const status = getReferralStatus(referral);
                    return (
                      <div key={index} className="border border-gray-600 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium">{referral.source}</p>
                            <p className="text-gray-400 text-sm">
                              Date: {formatDate(referral.referralDate)}
                            </p>
                            {referral.notes && (
                              <p className="text-gray-300 text-sm mt-1">{referral.notes}</p>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Alerts */}
            {patient.activeAlerts && patient.activeAlerts.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-400" />
                  Active Alerts
                </h4>
                <div className="space-y-3">
                  {patient.activeAlerts.map((alert, index) => (
                    <div key={index} className="border border-gray-600 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{alert.type}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getAlertPriorityColor(alert.priority)}`}>
                              {alert.priority}
                            </span>
                          </div>
                          <p className="text-gray-300 mt-1">{alert.message}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            Created: {formatDate(alert.createdAt)} by {alert.createdBy}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visit History */}
            {patient.visitHistory && patient.visitHistory.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Recent Visit History</h4>
                <div className="space-y-3">
                  {patient.visitHistory.map((visit, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-gray-600 pb-2">
                      <div>
                        <p className="text-white">{visit.visitType}</p>
                        <p className="text-gray-400 text-sm">{formatDate(visit.appointmentDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">${visit.totalAmount || 0}</p>
                        <p className="text-gray-400 text-sm">{visit.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Alert Section */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Add Alert</h4>

              {!addingAlert ? (
                <button
                  onClick={() => setAddingAlert(true)}
                  className="w-full py-2 px-4 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  + Add Manual Alert
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alert Type</label>
                    <select
                      value={newAlert.type}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2"
                    >
                      <option value="Important Note">Important Note</option>
                      <option value="Payment Pending">Payment Pending</option>
                      <option value="Referral Expiring">Referral Expiring</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <select
                      value={newAlert.priority}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                    <textarea
                      value={newAlert.message}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-600 rounded-md bg-gray-800 text-white px-3 py-2"
                      placeholder="Enter alert message..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddAlert}
                      disabled={!newAlert.message.trim()}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Alert
                    </button>
                    <button
                      onClick={() => {
                        setAddingAlert(false);
                        setNewAlert({ type: 'Important Note', message: '', priority: 'Medium' });
                      }}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-900 px-6 py-4 flex space-x-3">
            <button
              onClick={() => {
                navigate(`/secretary/patients/edit/${patient._id}`);
                onClose();
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Patient
            </button>
            <button
              onClick={handleScheduleNextVisit}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              Manage Appointments
            </button>
          </div>
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

export default PatientDetailsPanel;
