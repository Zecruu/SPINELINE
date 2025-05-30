import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PrinterIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const AppointmentHistory = ({ patient, currentAppointmentId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first

  useEffect(() => {
    if (patient?._id) {
      loadAppointmentHistory();
    }
  }, [patient?._id]);

  const loadAppointmentHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/patients/${patient._id}/appointments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      console.error('Error loading appointment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (appointmentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId);
    } else {
      newExpanded.add(appointmentId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
      case 'Checked-Out':
        return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
      case 'Cancelled':
        return <XCircleIcon className="h-4 w-4 text-red-400" />;
      case 'Rescheduled':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />;
      case 'Checked-In':
      case 'In Progress':
        return <ClockIcon className="h-4 w-4 text-blue-400" />;
      case 'Scheduled':
        return <CalendarIcon className="h-4 w-4 text-gray-400" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case 'Checked-Out':
        return 'bg-green-900/30 text-green-300 border-green-700';
      case 'Cancelled':
        return 'bg-red-900/30 text-red-300 border-red-700';
      case 'Rescheduled':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
      case 'Checked-In':
      case 'In Progress':
        return 'bg-blue-900/30 text-blue-300 border-blue-700';
      case 'Scheduled':
        return 'bg-gray-900/30 text-gray-300 border-gray-700';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const filteredAppointments = appointments
    .filter(apt => filterStatus === 'all' || apt.status === filterStatus)
    .sort((a, b) => {
      const dateA = new Date(a.appointmentDate);
      const dateB = new Date(b.appointmentDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleJumpToVisit = (appointmentId) => {
    // Navigate to the specific appointment in patient flow
    window.open(`/doctor/patient/${appointmentId}`, '_blank');
  };

  const handlePrintHistory = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Visit Timeline</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintHistory}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Print</span>
          </button>
          <div className="text-sm text-gray-400">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">Sort:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Visit Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Procedure Codes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment._id}
                  appointment={appointment}
                  isExpanded={expandedRows.has(appointment._id)}
                  onToggleExpansion={() => toggleRowExpansion(appointment._id)}
                  onJumpToVisit={() => handleJumpToVisit(appointment._id)}
                  isCurrentAppointment={appointment._id === currentAppointmentId}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No appointments found</p>
            <p className="text-gray-500 text-sm">
              {filterStatus === 'all' ? 'This patient has no appointment history.' : `No ${filterStatus.toLowerCase()} appointments found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Separate component for appointment rows to keep the main component clean
const AppointmentRow = ({
  appointment,
  isExpanded,
  onToggleExpansion,
  onJumpToVisit,
  isCurrentAppointment,
  getStatusIcon,
  getStatusColor,
  formatDate,
  formatTime
}) => {
  return (
    <>
      <tr className={`hover:bg-gray-700/50 ${isCurrentAppointment ? 'bg-blue-900/20' : ''}`}>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <button
              onClick={onToggleExpansion}
              className="mr-2 text-gray-400 hover:text-white"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-white">
                {formatDate(appointment.appointmentDate)}
              </div>
              <div className="text-sm text-gray-400">
                {formatTime(appointment.appointmentTime)}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="text-sm text-white">{appointment.visitType}</div>
          {isCurrentAppointment && (
            <div className="text-xs text-blue-400">Current Visit</div>
          )}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(appointment.status)}`}>
            {getStatusIcon(appointment.status)}
            <span>{appointment.status}</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="text-sm text-gray-300">
            {appointment.procedureCodes?.length > 0 ? (
              <div className="space-y-1">
                {appointment.procedureCodes.slice(0, 2).map((code, index) => (
                  <div key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {code.code}
                  </div>
                ))}
                {appointment.procedureCodes.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{appointment.procedureCodes.length - 2} more
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="text-sm">
            {appointment.checkoutData?.totalAmount ? (
              <div>
                <div className="text-white">${appointment.checkoutData.totalAmount}</div>
                <div className={`text-xs ${appointment.checkoutData.paymentStatus === 'Paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {appointment.checkoutData.paymentStatus || 'Pending'}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <button
              onClick={onJumpToVisit}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              title="Jump to Visit"
            >
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              <span>View</span>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Row Content */}
      {isExpanded && (
        <tr>
          <td colSpan="6" className="px-4 py-4 bg-gray-750">
            <ExpandedAppointmentDetails appointment={appointment} />
          </td>
        </tr>
      )}
    </>
  );
};

// Expanded appointment details component
const ExpandedAppointmentDetails = ({ appointment }) => {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOAP Notes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            SOAP Notes
          </h4>
          {appointment.soapNotes ? (
            <div className="bg-gray-700 rounded p-3 space-y-2">
              {appointment.soapNotes.subjective && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">Subjective:</div>
                  <div className="text-sm text-gray-300">{appointment.soapNotes.subjective}</div>
                </div>
              )}
              {appointment.soapNotes.objective && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">Objective:</div>
                  <div className="text-sm text-gray-300">{appointment.soapNotes.objective}</div>
                </div>
              )}
              {appointment.soapNotes.assessment && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">Assessment:</div>
                  <div className="text-sm text-gray-300">{appointment.soapNotes.assessment}</div>
                </div>
              )}
              {appointment.soapNotes.plan && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">Plan:</div>
                  <div className="text-sm text-gray-300">{appointment.soapNotes.plan}</div>
                </div>
              )}
              {appointment.soapNotes.painScale && (
                <div>
                  <div className="text-xs text-gray-400 font-medium">Pain Scale:</div>
                  <div className="text-sm text-gray-300">{appointment.soapNotes.painScale}/10</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No SOAP notes recorded</div>
          )}
        </div>

        {/* ICD-10 Codes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
            ICD-10 Diagnostic Codes
          </h4>
          {appointment.diagnosticCodes?.length > 0 ? (
            <div className="space-y-2">
              {appointment.diagnosticCodes.map((code, index) => (
                <div key={index} className="bg-gray-700 rounded p-2">
                  <div className="text-sm text-white font-medium">{code.code}</div>
                  <div className="text-xs text-gray-400">{code.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No diagnostic codes assigned</div>
          )}
        </div>

        {/* Procedure Codes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Procedure Codes
          </h4>
          {appointment.procedureCodes?.length > 0 ? (
            <div className="space-y-2">
              {appointment.procedureCodes.map((code, index) => (
                <div key={index} className="bg-gray-700 rounded p-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-white font-medium">{code.code}</div>
                      <div className="text-xs text-gray-400">{code.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white">${code.rate}</div>
                      <div className="text-xs text-gray-400">Units: {code.units || 1}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No procedure codes assigned</div>
          )}
        </div>

        {/* Signature Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Signature Status
          </h4>
          <div className="bg-gray-700 rounded p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Doctor Signature:</span>
                <span className={`text-sm ${appointment.doctorSignature ? 'text-green-400' : 'text-red-400'}`}>
                  {appointment.doctorSignature ? '✓ Signed' : '✗ Not Signed'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Patient Signature:</span>
                <span className={`text-sm ${appointment.patientSignature ? 'text-green-400' : 'text-red-400'}`}>
                  {appointment.patientSignature ? '✓ Signed' : '✗ Not Signed'}
                </span>
              </div>
              {appointment.doctorSignature && (
                <div className="text-xs text-gray-500">
                  Signed: {formatTimestamp(appointment.doctorSignature.timestamp)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      {appointment.history?.length > 0 && (
        <div className="space-y-3 border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-white">Audit Trail</h4>
          <div className="space-y-2">
            {appointment.history.map((entry, index) => (
              <div key={index} className="bg-gray-700 rounded p-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-white capitalize">{entry.action}</div>
                    <div className="text-xs text-gray-400">by {entry.performedBy}</div>
                    {entry.reason && (
                      <div className="text-xs text-gray-500 mt-1">Reason: {entry.reason}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {appointment.notes && (
        <div className="space-y-3 border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-white">Additional Notes</h4>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-sm text-gray-300">{appointment.notes}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;
