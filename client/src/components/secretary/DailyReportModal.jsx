import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const DailyReportModal = ({ isOpen, onClose, selectedDate = new Date() }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    showAll: true,
    showSigned: false,
    showUnsigned: false,
    showCompleted: false,
    provider: '',
    visitType: ''
  });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDailyReport();
    }
  }, [isOpen, selectedDate]);

  const loadDailyReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const dateStr = selectedDate.toISOString().split('T')[0];

      const response = await axios.get(`/api/audit/daily-report?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setReportData(response.data.report);
        setAlerts(response.data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const dateStr = selectedDate.toISOString().split('T')[0];

      const response = await axios.get(`/api/audit/daily-report/pdf?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-report-${dateStr}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleEmailReport = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const dateStr = selectedDate.toISOString().split('T')[0];

      await axios.post(`/api/audit/daily-report/email`,
        { date: dateStr },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Report emailed successfully!');
    } catch (error) {
      console.error('Error emailing report:', error);
      alert('Failed to email report');
    }
  };

  const handleProductionReport = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const dateStr = selectedDate.toISOString().split('T')[0];

      const response = await axios.get(`/api/reports/production?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `production-report-${dateStr}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading production report:', error);
      alert('Failed to generate production report');
    }
  };

  const getFilteredAppointments = () => {
    if (!reportData?.appointments) return [];

    return reportData.appointments.filter(apt => {
      if (filters.showSigned && !apt.hasSignature) return false;
      if (filters.showUnsigned && apt.hasSignature) return false;
      if (filters.showCompleted && apt.status !== 'Checked-Out') return false;
      if (filters.provider && apt.provider !== filters.provider) return false;
      if (filters.visitType && apt.visitType !== filters.visitType) return false;
      return true;
    });
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
      case 'Scheduled': return 'text-yellow-400';
      case 'Checked-In': return 'text-blue-400';
      case 'Checked-Out': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                <DocumentTextIcon className="h-6 w-6 mr-2" />
                📄 Daily Report - {selectedDate.toLocaleDateString()}
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-600 hover:text-white transition-colors"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-600 hover:text-white transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  PDF
                </button>
                <button
                  onClick={handleEmailReport}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-600 hover:text-white transition-colors"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </button>
                <button
                  onClick={handleProductionReport}
                  className="inline-flex items-center px-3 py-2 border border-green-600 text-sm font-medium rounded-md text-green-400 bg-transparent hover:bg-green-600 hover:text-white transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  📊 Production Report
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading daily report...</p>
            </div>
          ) : (
            <div className="bg-gray-800 px-6 py-4 max-h-96 overflow-y-auto">
              {/* Alert Banner */}
              {alerts.length > 0 && (
                <div className="mb-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <h4 className="text-yellow-400 font-medium">Attention Required</h4>
                  </div>
                  <ul className="mt-2 text-sm text-yellow-300 space-y-1">
                    {alerts.map((alert, index) => (
                      <li key={index}>• {alert.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary Cards */}
              {reportData && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <CalendarIcon className="h-8 w-8 text-blue-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-400">Total Appointments</p>
                        <p className="text-2xl font-bold text-white">{reportData.totalAppointments}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <UserGroupIcon className="h-8 w-8 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-400">Active Patients</p>
                        <p className="text-2xl font-bold text-white">{reportData.activePatients}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-8 w-8 text-purple-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-400">Signed Records</p>
                        <p className="text-2xl font-bold text-white">{reportData.signedRecords}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-8 w-8 text-orange-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-400">Pending Tasks</p>
                        <p className="text-2xl font-bold text-white">{reportData.pendingTasks}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Filters:</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showAll}
                      onChange={(e) => setFilters(prev => ({ ...prev, showAll: e.target.checked, showSigned: false, showUnsigned: false, showCompleted: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">All Records</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showSigned}
                      onChange={(e) => setFilters(prev => ({ ...prev, showSigned: e.target.checked, showAll: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">Signed Only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showUnsigned}
                      onChange={(e) => setFilters(prev => ({ ...prev, showUnsigned: e.target.checked, showAll: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">Unsigned Only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showCompleted}
                      onChange={(e) => setFilters(prev => ({ ...prev, showCompleted: e.target.checked, showAll: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">Completed Only</span>
                  </label>
                </div>
              </div>

              {/* Appointments Table */}
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-600">
                  <h4 className="text-lg font-medium text-white">Patient Activity ({filteredAppointments.length})</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-600">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Visit Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Provider</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Signature</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-700 divide-y divide-gray-600">
                      {filteredAppointments.map((appointment, index) => (
                        <tr key={index} className="hover:bg-gray-600">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {appointment.patientName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatTime(appointment.appointmentTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {appointment.visitType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {appointment.provider || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {appointment.hasSignature ? (
                              <span className="text-green-400">✓ Signed</span>
                            ) : (
                              <span className="text-red-400">✗ Unsigned</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;
