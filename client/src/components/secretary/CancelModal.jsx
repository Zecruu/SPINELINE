import { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const CancelModal = ({ isOpen, onClose, appointment, onConfirm }) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [notifyPatient, setNotifyPatient] = useState(false);
  const [loading, setLoading] = useState(false);

  const cancellationReasons = [
    'Patient requested cancellation',
    'Doctor unavailable',
    'Emergency scheduling conflict',
    'Patient no-show',
    'Weather/transportation issues',
    'Patient illness',
    'Facility closure',
    'Equipment malfunction',
    'Other'
  ];

  const handleConfirm = async () => {
    if (!cancellationReason.trim()) {
      alert('Please select a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(cancellationReason, notifyPatient);
      // Reset form
      setCancellationReason('');
      setNotifyPatient(false);
    } catch (error) {
      console.error('Error confirming cancellation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCancellationReason('');
    setNotifyPatient(false);
    onClose();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Cancel Appointment</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Appointment Details */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-3">Appointment Details</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-300">
              <UserIcon className="h-4 w-4" />
              <span>{appointment.patient?.fullName || appointment.patientId?.fullName || 'Unknown Patient'}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDate(appointment.appointmentDate)}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <ClockIcon className="h-4 w-4" />
              <span>{formatTime(appointment.appointmentTime)}</span>
            </div>
            <div className="text-gray-400 text-sm">
              Visit Type: {appointment.visitType}
            </div>
          </div>
        </div>

        {/* Cancellation Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cancellation Reason *
          </label>
          <select
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select a reason...</option>
            {cancellationReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Reason Input */}
        {cancellationReason === 'Other' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Reason
            </label>
            <textarea
              value={cancellationReason === 'Other' ? '' : cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please specify the reason for cancellation..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {/* Notify Patient Option */}
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notifyPatient}
              onChange={(e) => setNotifyPatient(e.target.checked)}
              className="rounded border-gray-600 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
            />
            <span className="text-gray-300 text-sm">Notify patient of cancellation</span>
          </label>
        </div>

        {/* Warning Message */}
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">Warning</p>
              <p className="text-red-400 text-sm">
                This action cannot be undone. The appointment will be permanently cancelled and removed from today's schedule.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleConfirm}
            disabled={!cancellationReason.trim() || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Cancelling...</span>
              </div>
            ) : (
              'Cancel Appointment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;
