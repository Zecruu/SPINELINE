import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import {
  CalendarIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  FunnelIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const Reports = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'today'
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'secretary') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadReportData();
  }, [navigate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/reports/summary', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (period) => {
    const today = new Date();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        startDate = weekStart.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setDateRange({ startDate, endDate, period });
  };

  const exportReport = async (format) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/reports/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${dateRange.startDate}_${dateRange.endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const emailReport = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.post('/api/reports/email', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Report emailed successfully!');
    } catch (error) {
      console.error('Error emailing report:', error);
      alert('Failed to email report');
    }
  };

  if (!user) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </SecretaryLayout>
    );
  }

  return (
    <SecretaryLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Reports</h1>
              <p className="text-gray-400 mt-1">View clinic activity summaries and analytics</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadReportData}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-white">Date Range</h3>
              <div className="flex space-x-2">
                {['today', 'week', 'month'].map((period) => (
                  <button
                    key={period}
                    onClick={() => handleDateRangeChange(period)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      dateRange.period === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value, period: 'custom' })}
                  className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value, period: 'custom' })}
                  className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={loadReportData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-8 w-8 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-400">Total Appointments</p>
                    <p className="text-2xl font-bold text-white">{reportData.appointments?.total || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-white">{reportData.appointments?.completed || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <XCircleIcon className="h-8 w-8 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-400">No-Shows</p>
                    <p className="text-2xl font-bold text-white">{reportData.appointments?.noShows || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">${reportData.billing?.totalRevenue || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Overview */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Appointment Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Visit Types</h4>
                  <div className="space-y-2">
                    {reportData.appointments?.visitTypes?.map((type, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-300">{type.name}</span>
                        <span className="text-white font-medium">{type.count}</span>
                      </div>
                    )) || <p className="text-gray-500">No data available</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Status Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Scheduled</span>
                      <span className="text-blue-400 font-medium">{reportData.appointments?.scheduled || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Checked-In</span>
                      <span className="text-yellow-400 font-medium">{reportData.appointments?.checkedIn || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Completed</span>
                      <span className="text-green-400 font-medium">{reportData.appointments?.completed || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Summary */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Billing Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Top 5 Service Codes</h4>
                  <div className="space-y-2">
                    {reportData.billing?.topServiceCodes?.map((code, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-300">{code.code} - {code.description}</span>
                        <span className="text-white font-medium">{code.count}</span>
                      </div>
                    )) || <p className="text-gray-500">No billing data available</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Payment Methods</h4>
                  <div className="space-y-2">
                    {reportData.billing?.paymentMethods?.map((method, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-300">{method.method}</span>
                        <span className="text-green-400 font-medium">${method.amount}</span>
                      </div>
                    )) || <p className="text-gray-500">No payment data available</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding Balances */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Outstanding Balances</h3>
                <span className="text-sm text-gray-400">
                  {reportData.outstandingBalances?.length || 0} patients with unpaid balances
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Last Visit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {reportData.outstandingBalances?.map((patient, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {patient.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(patient.lastVisit).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400 font-medium">
                          ${patient.balance}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button className="text-blue-400 hover:text-blue-300">Send Invoice</button>
                          <button className="text-green-400 hover:text-green-300">Mark Paid</button>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                          No outstanding balances
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Export Options</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => exportReport('pdf')}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export PDF
                </button>
                <button
                  onClick={() => exportReport('csv')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={emailReport}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Email Report
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4" />
            <p>No report data available for the selected date range</p>
          </div>
        )}
      </div>
    </SecretaryLayout>
  );
};

export default Reports;
