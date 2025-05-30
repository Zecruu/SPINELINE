import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import {
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const Ledger = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientLedger, setPatientLedger] = useState([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
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
    loadPatients();
  }, [navigate]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPatients(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadPatients = async (searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await axios.get('/api/ledger/patients', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (response.data.success) {
        // Ensure data is always an array
        const patientsData = response.data.data || response.data.patients || [];
        setPatients(patientsData);
      } else {
        console.error('API returned success: false');
        setPatients([]); // Set empty array on failure
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadPatientLedger = async (patientId) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/ledger/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        }
      });

      if (response.data.success) {
        // Ensure data is always an array
        const ledgerData = response.data.data || [];
        setPatientLedger(ledgerData);
      } else {
        console.error('API returned success: false');
        setPatientLedger([]); // Set empty array on failure
      }
    } catch (error) {
      console.error('Error loading patient ledger:', error);
      setPatientLedger([]); // Set empty array on error
    }
  };

  const handleViewLedger = async (patient) => {
    setSelectedPatient(patient);
    setShowLedgerModal(true);
    await loadPatientLedger(patient._id);
  };

  const exportLedger = async (format, patientId = null) => {
    try {
      const token = localStorage.getItem('userToken');
      const endpoint = patientId ? `/api/ledger/export/${format}/${patientId}` : `/api/ledger/export/${format}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = patientId
        ? `ledger_${selectedPatient?.fullName}_${new Date().toISOString().split('T')[0]}.${format}`
        : `all_ledgers_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting ledger:', error);
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
              <h1 className="text-3xl font-bold text-white">Patient Ledger</h1>
              <p className="text-gray-400 mt-1">Track patient financial transactions and balances</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => loadPatients(searchTerm)}
                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => exportLedger('csv')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export All
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Patient List Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Patient Financial Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Visit Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Outstanding Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : !patients || patients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No patients found matching your search' : 'No patients found'}
                    </td>
                  </tr>
                ) : (
                  (patients || []).map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {patient.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString() : 'No visits'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          patient.outstandingBalance > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          ${patient.outstandingBalance?.toFixed(2) || '0.00'}
                        </span>
                        {patient.outstandingBalance > 0 && (
                          <ExclamationTriangleIcon className="h-4 w-4 inline ml-1 text-red-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                        ${patient.totalPaid?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleViewLedger(patient)}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Ledger Modal */}
        {showLedgerModal && selectedPatient && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowLedgerModal(false)}></div>

              <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        Patient Ledger - {selectedPatient.fullName}
                      </h3>
                      <p className="text-sm text-gray-400">Complete transaction history</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => exportLedger('csv', selectedPatient._id)}
                        className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                        Export CSV
                      </button>
                      <button
                        onClick={() => exportLedger('pdf', selectedPatient._id)}
                        className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                        Export PDF
                      </button>
                      <button
                        onClick={() => setShowLedgerModal(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 px-6 py-4 max-h-96 overflow-y-auto">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Service Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Charge
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Paid
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {!patientLedger || patientLedger.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-4 text-center text-gray-500">
                              No transactions found
                            </td>
                          </tr>
                        ) : (
                          (patientLedger || []).map((transaction, index) => (
                            <tr key={index} className={`${transaction.balance > 0 ? 'bg-red-900/20' : ''}`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                                {new Date(transaction.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 font-mono">
                                {transaction.serviceCode}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-300">
                                {transaction.description}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">
                                ${transaction.charge?.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400 font-medium">
                                ${transaction.paid?.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                {transaction.paymentMethod || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`font-medium ${
                                  transaction.balance > 0 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  ${transaction.balance?.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-700 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      Total Transactions: {(patientLedger || []).length}
                    </div>
                    <div className="flex space-x-6">
                      <div className="text-sm">
                        <span className="text-gray-400">Total Charges: </span>
                        <span className="text-white font-medium">
                          ${(patientLedger || []).reduce((sum, t) => sum + (t.charge || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Total Paid: </span>
                        <span className="text-green-400 font-medium">
                          ${(patientLedger || []).reduce((sum, t) => sum + (t.paid || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Outstanding: </span>
                        <span className={`font-medium ${
                          selectedPatient.outstandingBalance > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          ${selectedPatient.outstandingBalance?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SecretaryLayout>
  );
};

export default Ledger;
