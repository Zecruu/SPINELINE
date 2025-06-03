import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import axios from 'axios';

const AppointmentHistory = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    patientName: '',
    status: '',
    provider: ''
  });
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    loadAppointmentHistory();
    loadProviders();
  }, []);

  const loadAppointmentHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/appointments/history', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
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

  const loadProviders = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/settings/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProviders(response.data.providers);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    loadAppointmentHistory();
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      patientName: '',
      status: '',
      provider: ''
    });
    setTimeout(() => loadAppointmentHistory(), 100);
  };

  const exportToPDF = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/appointments/history/export/pdf', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appointment-history-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/appointments/history/export/excel', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appointment-history-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-900/50 text-blue-300';
      case 'Rescheduled': return 'bg-yellow-900/50 text-yellow-300';
      case 'Cancelled': return 'bg-red-900/50 text-red-300';
      case 'Completed': return 'bg-green-900/50 text-green-300';
      case 'Checked-Out': return 'bg-emerald-900/50 text-emerald-300';
      default: return 'bg-gray-900/50 text-gray-300';
    }
  };

  if (loading) {
    return (
      <SecretaryLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <CalendarDaysIcon className="h-8 w-8 mr-3" />
              Appointment History
            </h1>
            <p className="text-gray-400">View and manage appointment records</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-transparent hover:bg-gray-600 hover:text-white transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-400 bg-transparent hover:bg-green-600 hover:text-white transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={applyFilters}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Patient Name</label>
              <input
                type="text"
                value={filters.patientName}
                onChange={(e) => handleFilterChange('patientName', e.target.value)}
                placeholder="Search patient..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
                <option value="Checked-Out">Checked-Out</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Provider</label>
              <select
                value={filters.provider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Providers</option>
                {providers.map((provider) => (
                  <option key={provider._id} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-white font-medium">
              Appointment Records ({appointments.length})
            </h3>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Visit Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-600">Action Taken</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      No appointment records found
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr key={appointment._id} className="hover:bg-gray-700 border-b border-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white border-r border-gray-600">
                        {formatDate(appointment.appointmentDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white border-r border-gray-600">
                        {formatTime(appointment.appointmentTime)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white border-r border-gray-600">
                        {appointment.patient?.fullName || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 border-r border-gray-600">
                        {appointment.visitType}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-r border-gray-600">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 border-r border-gray-600">
                        {appointment.assignedDoctor || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 border-r border-gray-600">
                        {appointment.actionTaken || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {appointment.notes || appointment.cancellationReason || appointment.rescheduleReason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SecretaryLayout>
  );
};

export default AppointmentHistory;
