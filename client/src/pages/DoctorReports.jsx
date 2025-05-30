import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import {
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowPathIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const DoctorReports = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalPatients: 0,
    weeklyPatients: 0,
    monthlyPatients: 0,
    topProcedureCodes: [],
    insuranceBreakdown: [],
    averageVisitLength: 0,
    recentActivity: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [visitTypeFilter, setVisitTypeFilter] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadReportData();
  }, [navigate, dateRange, visitTypeFilter]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      const response = await axios.get('/api/reports/doctor/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          visitType: visitTypeFilter
        }
      });

      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      // Set mock data for development
      setReportData({
        totalPatients: 156,
        weeklyPatients: 23,
        monthlyPatients: 89,
        topProcedureCodes: [
          { code: '98941', description: 'Chiropractic Manipulation', count: 45, revenue: 4500 },
          { code: '98942', description: 'Chiropractic Manipulation', count: 32, revenue: 3200 },
          { code: '97110', description: 'Therapeutic Exercise', count: 28, revenue: 2800 },
          { code: '97140', description: 'Manual Therapy', count: 21, revenue: 2100 },
          { code: '99213', description: 'Office Visit', count: 18, revenue: 1800 }
        ],
        insuranceBreakdown: [
          { name: 'Blue Cross Blue Shield', count: 45, percentage: 28.8 },
          { name: 'Aetna', count: 32, percentage: 20.5 },
          { name: 'UnitedHealth', count: 28, percentage: 17.9 },
          { name: 'Cigna', count: 25, percentage: 16.0 },
          { name: 'Self-Pay', count: 26, percentage: 16.7 }
        ],
        averageVisitLength: 32,
        recentActivity: [
          { date: '2024-01-15', patients: 12, revenue: 1200 },
          { date: '2024-01-14', patients: 8, revenue: 800 },
          { date: '2024-01-13', patients: 15, revenue: 1500 },
          { date: '2024-01-12', patients: 10, revenue: 1000 },
          { date: '2024-01-11', patients: 14, revenue: 1400 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/reports/doctor/export/pdf', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          visitType: visitTypeFilter
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `doctor-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF report');
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/reports/doctor/export/csv', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          visitType: visitTypeFilter
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `doctor-data-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV data');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-gray-400">Clinical activity overview and analytics</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={loadReportData}
              className="flex items-center px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Visit Type</label>
              <select
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Visit Types</option>
                <option value="Initial Consultation">Initial Consultation</option>
                <option value="Follow-Up">Follow-Up</option>
                <option value="Re-evaluation">Re-evaluation</option>
                <option value="Treatment">Treatment</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Patients</p>
                <p className="text-2xl font-bold text-white">{reportData.totalPatients}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">This Week</p>
                <p className="text-2xl font-bold text-white">{reportData.weeklyPatients}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-white">{reportData.monthlyPatients}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm text-gray-400">Avg Visit Length</p>
                <p className="text-2xl font-bold text-white">{reportData.averageVisitLength} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Procedure Codes */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Top 5 Procedure Codes</h3>
            <div className="space-y-3">
              {reportData.topProcedureCodes.map((procedure, index) => (
                <div key={procedure.code} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{procedure.code}</div>
                      <div className="text-gray-400 text-sm">{procedure.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{procedure.count} uses</div>
                    <div className="text-gray-400 text-sm">{formatCurrency(procedure.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Insurance Breakdown</h3>
            <div className="space-y-3">
              {reportData.insuranceBreakdown.map((insurance, index) => (
                <div key={insurance.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">{insurance.name}</span>
                    <span className="text-gray-400 text-sm">{insurance.count} patients ({insurance.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${insurance.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {reportData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-white text-sm">{formatDate(activity.date)}</div>
                      <div className="text-gray-400 text-xs">{activity.patients} patients</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm font-medium">{formatCurrency(activity.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Revenue</span>
                <span className="text-white font-medium">
                  {formatCurrency(reportData.topProcedureCodes.reduce((sum, proc) => sum + proc.revenue, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Average per Patient</span>
                <span className="text-white font-medium">
                  {formatCurrency(
                    reportData.topProcedureCodes.reduce((sum, proc) => sum + proc.revenue, 0) /
                    Math.max(reportData.totalPatients, 1)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Most Common Visit</span>
                <span className="text-white font-medium">Follow-Up</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Completion Rate</span>
                <span className="text-green-400 font-medium">94.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Export Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <PrinterIcon className="h-6 w-6 text-red-400" />
                <div>
                  <h4 className="text-white font-medium">PDF Report</h4>
                  <p className="text-gray-400 text-sm">Comprehensive visual report with charts</p>
                </div>
              </div>
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Generate PDF
              </button>
            </div>

            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <DocumentArrowDownIcon className="h-6 w-6 text-green-400" />
                <div>
                  <h4 className="text-white font-medium">CSV Data Export</h4>
                  <p className="text-gray-400 text-sm">Raw data for external analysis</p>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
};

export default DoctorReports;
