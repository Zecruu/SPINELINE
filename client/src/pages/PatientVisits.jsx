import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const PatientVisits = () => {
  const [user, setUser] = useState(null);
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateRange: 'all',
    status: 'all',
    visitType: 'all',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);

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
    loadPatientVisits();
  }, [navigate]);

  const loadPatientVisits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/appointments/doctor/visits', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setVisits(response.data.visits);
        setFilteredVisits(response.data.visits);
      }
    } catch (error) {
      console.error('Error loading patient visits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...visits];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(visit =>
        (visit?.patient?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit?.patient?.recordNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (filters.startDate && filters.endDate) {
            filtered = filtered.filter(visit => {
              const visitDate = new Date(visit.appointmentDate);
              return visitDate >= new Date(filters.startDate) && visitDate <= new Date(filters.endDate);
            });
          }
          break;
      }

      if (filters.dateRange !== 'custom' && startDate) {
        filtered = filtered.filter(visit => new Date(visit.appointmentDate) >= startDate);
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(visit => visit.status === filters.status);
    }

    // Visit type filter
    if (filters.visitType !== 'all') {
      filtered = filtered.filter(visit => visit.visitType === filters.visitType);
    }

    setFilteredVisits(filtered);
  }, [visits, searchTerm, filters]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case 'Checked-Out':
        return 'bg-green-900/30 text-green-300 border-green-700';
      case 'Cancelled':
        return 'bg-red-900/30 text-red-300 border-red-700';
      case 'Scheduled':
        return 'bg-blue-900/30 text-blue-300 border-blue-700';
      case 'Checked-In':
      case 'In Progress':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700';
    }
  };

  const handleViewVisit = (visit) => {
    setSelectedVisit(visit);
    setShowVisitModal(true);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'all',
      status: 'all',
      visitType: 'all',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
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
            <h1 className="text-2xl font-bold text-white">Patient Visits</h1>
            <p className="text-gray-400">Complete history of all patient visits</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPatientVisits}
              className="flex items-center px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <div className="text-sm text-gray-400">
              {filteredVisits.length} of {visits.length} visits
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by patient name or record number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Checked-In">Checked-In</option>
                  </select>
                </div>

                {/* Visit Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Visit Type</label>
                  <select
                    value={filters.visitType}
                    onChange={(e) => setFilters(prev => ({ ...prev, visitType: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="Initial Consultation">Initial Consultation</option>
                    <option value="Follow-Up">Follow-Up</option>
                    <option value="Re-evaluation">Re-evaluation</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
              {filters.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visits Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Visit Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredVisits.map((visit) => (
                  <tr key={visit._id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {visit.patient?.fullName ||
                             (visit.patient?.firstName && visit.patient?.lastName
                               ? `${visit.patient.firstName} ${visit.patient.lastName}`
                               : visit.patientId?.fullName ||
                                 (visit.patientId?.firstName && visit.patientId?.lastName
                                   ? `${visit.patientId.firstName} ${visit.patientId.lastName}`
                                   : 'Unknown Patient'))}
                          </div>
                          <div className="text-sm text-gray-400">
                            #{visit.patient?.recordNumber || visit.patientId?.recordNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <div>
                          <div>{formatDate(visit.appointmentDate)}</div>
                          <div className="text-gray-400 flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {formatTime(visit.appointmentTime)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{visit.visitType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(visit.status)}`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewVisit(visit)}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredVisits.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No visits found</p>
              <p className="text-gray-500 text-sm">
                {visits.length === 0 ? 'No patient visits recorded yet.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          )}
        </div>

        {/* Visit Details Modal */}
        {showVisitModal && selectedVisit && (
          <VisitDetailsModal
            visit={selectedVisit}
            onClose={() => {
              setShowVisitModal(false);
              setSelectedVisit(null);
            }}
          />
        )}
      </div>
    </DoctorLayout>
  );
};

// Visit Details Modal Component
const VisitDetailsModal = ({ visit, onClose }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Visit Details</h2>
            <p className="text-gray-400">
              {visit.patient?.fullName ||
               (visit.patient?.firstName && visit.patient?.lastName
                 ? `${visit.patient.firstName} ${visit.patient.lastName}`
                 : visit.patientId?.fullName ||
                   (visit.patientId?.firstName && visit.patientId?.lastName
                     ? `${visit.patientId.firstName} ${visit.patientId.lastName}`
                     : 'Unknown Patient'))} • {formatDate(visit.appointmentDate)} at {formatTime(visit.appointmentTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Visit Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOAP Notes */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">SOAP Notes</h3>
            {visit.soapNotes ? (
              <div className="space-y-3">
                {visit.soapNotes.subjective && (
                  <div>
                    <div className="text-sm font-medium text-gray-300">Subjective:</div>
                    <div className="text-sm text-gray-400">{visit.soapNotes.subjective}</div>
                  </div>
                )}
                {visit.soapNotes.objective && (
                  <div>
                    <div className="text-sm font-medium text-gray-300">Objective:</div>
                    <div className="text-sm text-gray-400">{visit.soapNotes.objective}</div>
                  </div>
                )}
                {visit.soapNotes.assessment && (
                  <div>
                    <div className="text-sm font-medium text-gray-300">Assessment:</div>
                    <div className="text-sm text-gray-400">{visit.soapNotes.assessment}</div>
                  </div>
                )}
                {visit.soapNotes.plan && (
                  <div>
                    <div className="text-sm font-medium text-gray-300">Plan:</div>
                    <div className="text-sm text-gray-400">{visit.soapNotes.plan}</div>
                  </div>
                )}
                {visit.soapNotes.painScale && (
                  <div>
                    <div className="text-sm font-medium text-gray-300">Pain Scale:</div>
                    <div className="text-sm text-gray-400">{visit.soapNotes.painScale}/10</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No SOAP notes recorded</p>
            )}
          </div>

          {/* Procedure Codes */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Procedure Codes</h3>
            {visit.procedureCodes?.length > 0 ? (
              <div className="space-y-2">
                {visit.procedureCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-600 rounded p-2">
                    <div>
                      <div className="text-sm text-white font-medium">{code.code}</div>
                      <div className="text-xs text-gray-400">{code.description}</div>
                    </div>
                    <div className="text-sm text-white">${code.rate}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No procedure codes assigned</p>
            )}
          </div>

          {/* Diagnostic Codes */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Diagnostic Codes</h3>
            {visit.diagnosticCodes?.length > 0 ? (
              <div className="space-y-2">
                {visit.diagnosticCodes.map((code, index) => (
                  <div key={index} className="bg-gray-600 rounded p-2">
                    <div className="text-sm text-white font-medium">{code.code}</div>
                    <div className="text-xs text-gray-400">{code.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No diagnostic codes assigned</p>
            )}
          </div>

          {/* Visit Summary */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Visit Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Visit Type:</span>
                <span className="text-white">{visit.visitType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-white">{visit.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white">{visit.duration || 15} minutes</span>
              </div>
              {visit.notes && (
                <div>
                  <div className="text-gray-400">Notes:</div>
                  <div className="text-white mt-1">{visit.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientVisits;
