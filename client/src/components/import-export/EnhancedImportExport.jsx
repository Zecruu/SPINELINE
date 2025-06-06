import { useState } from 'react';
import axios from 'axios';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';

const EnhancedImportExport = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportType, setExportType] = useState('patients');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importType, setImportType] = useState('patients');
  const [importResults, setImportResults] = useState(null);

  const exportTypes = [
    { value: 'patients', label: 'Patients', icon: UserGroupIcon, description: 'Patient demographics and contact information' },
    { value: 'appointments', label: 'Appointments', icon: CalendarIcon, description: 'Appointment schedules and visit details' },
    { value: 'ledger', label: 'Ledger Records', icon: CurrencyDollarIcon, description: 'Financial transactions and payments' },
    { value: 'checkouts', label: 'Checkouts', icon: DocumentTextIcon, description: 'Completed visits and billing information' },
    { value: 'soap-notes', label: 'SOAP Notes', icon: PencilSquareIcon, description: 'Clinical notes and assessments' },
    { value: 'signatures', label: 'Patient Signatures', icon: IdentificationIcon, description: 'Digital signatures from checkouts' },
    { value: 'billing', label: 'Service Codes', icon: ClipboardDocumentListIcon, description: 'CPT codes and billing information' }
  ];

  const importTypes = [
    { value: 'patients', label: 'Patients', description: 'Import patient demographics' },
    { value: 'appointments', label: 'Appointments', description: 'Import appointment schedules' },
    { value: 'ledger', label: 'Ledger Records', description: 'Import financial transactions' },
    { value: 'service-codes', label: 'Service Codes', description: 'Import CPT billing codes' },
    { value: 'icd-codes', label: 'ICD-10 Codes', description: 'Import diagnostic codes' },
    { value: 'soap-notes', label: 'SOAP Notes', description: 'Import clinical notes' }
  ];

  const handleExport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      
      const params = new URLSearchParams({
        type: exportType,
        format: exportFormat,
        dateRange,
        status
      });

      if (dateRange === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await axios.get(`/api/import-export/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `${exportType}-export.${exportFormat}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (type) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/import-export/template/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-import-template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download error:', error);
      alert('Failed to download template');
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('importFile', importFile);
      formData.append('type', importType);

      const response = await axios.post('/api/import-export/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setImportResults(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please check your file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Import/Export Data</h1>
        <p className="text-gray-400">Import data from other systems or export your clinic data</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-md font-medium ${
            activeTab === 'export'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <ArrowDownTrayIcon className="h-5 w-5 inline mr-2" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-md font-medium ${
            activeTab === 'import'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <ArrowUpTrayIcon className="h-5 w-5 inline mr-2" />
          Import Data
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Export Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Select Data Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div
                    key={type.value}
                    onClick={() => setExportType(type.value)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      exportType === type.value
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="h-6 w-6 text-blue-400" />
                      <div>
                        <h4 className="font-medium text-white">{type.label}</h4>
                        <p className="text-sm text-gray-400">{type.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {exportType === 'patients' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Patients</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <ArrowDownTrayIcon className="h-5 w-5" />
              )}
              <span>{loading ? 'Exporting...' : 'Export Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Import Type Selection */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Select Import Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {importTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setImportType(type.value)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    importType === type.value
                      ? 'border-green-500 bg-green-900/20'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <h4 className="font-medium text-white">{type.label}</h4>
                  <p className="text-sm text-gray-400">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Template Download */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Download Template</h4>
            <p className="text-sm text-gray-400 mb-3">
              Download the template file to see the required format for importing {importType}.
            </p>
            <button
              onClick={() => handleDownloadTemplate(importType)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Download {importType} Template
            </button>
          </div>

          {/* File Upload */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Upload File</h4>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
              
              <button
                onClick={handleFileUpload}
                disabled={!importFile || loading}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <ArrowUpTrayIcon className="h-5 w-5" />
                )}
                <span>{loading ? 'Processing...' : 'Upload & Process'}</span>
              </button>
            </div>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-4">Import Results</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-400">{importResults.totalRows}</div>
                  <div className="text-sm text-gray-400">Total Rows</div>
                </div>
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-400">{importResults.summary?.successCount || 0}</div>
                  <div className="text-sm text-gray-400">Successful</div>
                </div>
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-400">{importResults.summary?.errorCount || 0}</div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-400">{importResults.summary?.duplicateCount || 0}</div>
                  <div className="text-sm text-gray-400">Duplicates</div>
                </div>
              </div>

              {/* Preview Data */}
              {importResults.preview && importResults.preview.length > 0 && (
                <div>
                  <h5 className="font-medium text-white mb-2">Data Preview (First 10 rows)</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-700">
                          {importResults.columns.map((column, index) => (
                            <th key={index} className="px-3 py-2 text-left text-gray-300 border-r border-gray-600">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.preview.map((row, index) => (
                          <tr key={index} className="border-b border-gray-700">
                            {importResults.columns.map((column, colIndex) => (
                              <td key={colIndex} className="px-3 py-2 text-gray-300 border-r border-gray-600">
                                {row[column] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedImportExport;
