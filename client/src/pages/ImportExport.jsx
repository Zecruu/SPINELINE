import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SecretaryLayout from '../components/secretary/SecretaryLayout';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const ImportExport = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('export');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Export states
  const [exportType, setExportType] = useState('patients');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFilters, setExportFilters] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    status: 'all',
    visitType: 'all'
  });

  // Import states
  const [importType, setImportType] = useState('patients');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Map, 3: Preview, 4: Import, 5: Results
  const [importResults, setImportResults] = useState(null);

  // ChiroTouch specific states
  const [isChirotouch, setIsChirotouch] = useState(false);
  const [chirotouchStructure, setChirotouchStructure] = useState(null);
  const [selectedDatasets, setSelectedDatasets] = useState({
    patients: true,
    appointments: true,
    ledger: true,
    chartNotes: true,
    scannedDocs: true
  });

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);

  // Progress tracking states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const exportTypes = [
    { value: 'patients', label: 'Patient Records', description: 'Export patient information and demographics' },
    { value: 'appointments', label: 'Appointments', description: 'Export appointment schedules and visit data' },
    { value: 'billing', label: 'Billing Codes & Packages', description: 'Export service codes and package usage' },
    { value: 'audit', label: 'Audit Reports', description: 'Export audit trail and compliance records' },
    { value: 'checkouts', label: 'Checkout Records', description: 'Export payment and checkout transactions' }
  ];

  const importTypes = [
    { value: 'patients', label: 'Patient Lists', description: 'Import patient demographics and information' },
    { value: 'appointments', label: 'Appointments', description: 'Import appointment schedules' },
    { value: 'service-codes', label: 'Service Code Catalog', description: 'Import billing codes and rates' },
    { value: 'icd-codes', label: 'ICD Diagnostic Codes', description: 'Import diagnostic code library' },
    { value: 'chirotouch-full', label: 'ChiroTouch Export (Full)', description: 'Import data from a structured ChiroTouch export folder (.zip)' }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV (.csv)', description: 'Comma-separated values format' },
    { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Microsoft Excel format' },
    { value: 'pdf', label: 'PDF (.pdf)', description: 'Portable document format (export only)' }
  ];

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('userToken');
      const queryParams = new URLSearchParams({
        type: exportType,
        format: exportFormat,
        ...exportFilters
      });

      const response = await fetch(`/api/import-export/export?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`${exportType} data exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      setError(error.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // Validate file type
      const allowedTypes = importType === 'chirotouch-full' ? ['.zip'] : ['.csv', '.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedTypes.includes(fileExtension)) {
        setError(`Invalid file type. ${importType === 'chirotouch-full' ? 'Only ZIP files are allowed.' : 'Only CSV and Excel files are allowed.'}`);
        return;
      }

      // Validate file size (Railway supports larger files)
      const isRailway = window.location.hostname.includes('railway.app') || window.location.hostname.includes('up.railway.app');
      const maxSize = importType === 'chirotouch-full'
        ? (isRailway ? 500 * 1024 * 1024 : 50 * 1024 * 1024)
        : 10 * 1024 * 1024;

      if (file.size > maxSize) {
        const maxSizeText = importType === 'chirotouch-full'
          ? (isRailway ? '500MB' : '50MB')
          : '10MB';
        const platform = isRailway ? 'Railway' : 'Vercel';
        setError(`File too large. Maximum size is ${maxSizeText} on ${platform}.`);
        return;
      }

      // Just set the file, don't process it yet
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const processFile = async (file) => {
    setSelectedFile(file);
    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('importFile', file);
      formData.append('type', importType);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Stop at 90% until response
          }
          return prev + 10;
        });
      }, 200);

      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/import-export/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'File upload failed');
      }

      setImportPreview(result);

      // Handle ChiroTouch imports differently
      if (result.isChirotouch) {
        setIsChirotouch(true);
        setChirotouchStructure(result.structure);
        setImportStep(2); // Go to ChiroTouch review step
        setSuccess(`ChiroTouch export uploaded successfully. Found ${result.preview.summary.totalPatients} patients, ${result.preview.summary.totalAppointments} appointments, and ${result.preview.summary.totalLedgerRecords} ledger records.`);
      } else {
        setIsChirotouch(false);
        setImportStep(2); // Go to column mapping step
        setSuccess(`File uploaded successfully. Found ${result.totalRows} rows.`);
      }

    } catch (error) {
      console.error('File upload error:', error);
      setError(error.message || 'Failed to upload file');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (Railway supports larger files)
    const isRailway = window.location.hostname.includes('railway.app') || window.location.hostname.includes('up.railway.app');
    const maxSize = importType === 'chirotouch-full'
      ? (isRailway ? 500 * 1024 * 1024 : 50 * 1024 * 1024)
      : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      const maxSizeText = importType === 'chirotouch-full'
        ? (isRailway ? '500MB' : '50MB')
        : '10MB';
      const platform = isRailway ? 'Railway' : 'Vercel';
      setError(`File too large. Maximum size is ${maxSizeText} on ${platform}.`);
      return;
    }

    // Just set the file, don't process it yet
    setSelectedFile(file);
    setError('');
    setSuccess('');
  };

  const downloadTemplate = async (type) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/import-export/template/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}-import-template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`${type} template downloaded successfully`);
    } catch (error) {
      setError(error.message || 'Failed to download template');
    }
  };

  const handleImportProcess = async () => {
    setLoading(true);
    setError('');
    setImportStep(4);
    setProcessingProgress(0);

    try {
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80; // Stop at 80% until response
          }
          return prev + 15;
        });
      }, 500);

      const token = localStorage.getItem('userToken');

      // Use different endpoints for ChiroTouch vs regular imports
      const endpoint = isChirotouch
        ? '/api/import-export/process-chirotouch'  // Server-side for ChiroTouch
        : '/api/import-export/process';            // API for regular imports

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: importType,
          data: importPreview.data,
          columnMapping: columnMapping,
          isChirotouch: isChirotouch,
          structure: chirotouchStructure,
          extractPath: importPreview.extractPath,
          selectedDatasets: selectedDatasets,
          originalFileName: selectedFile?.name,
          fileSize: selectedFile?.size
        })
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import processing failed');
      }

      setImportResults(result);
      setImportStep(5);
      setSuccess(`Import completed! ${result.summary.successCount} records imported successfully.`);
    } catch (error) {
      console.error('Import processing error:', error);
      setError(error.message || 'Failed to process import');
      setImportStep(3); // Go back to preview
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportPreview(null);
    setColumnMapping({});
    setImportStep(1);
    setImportResults(null);
    setError('');
    setSuccess('');
    setIsChirotouch(false);
    setChirotouchStructure(null);
    setIsDragOver(false);
    setUploadProgress(0);
    setProcessingProgress(0);
    setSelectedDatasets({
      patients: true,
      appointments: true,
      ledger: true,
      chartNotes: true,
      scannedDocs: true
    });
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
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate('/secretary')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Import/Export Data</h1>
              <p className="text-gray-400 mt-1">Manage data import and export operations for your clinic</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {success}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <XCircleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-lg mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('export')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span>Export Data</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentArrowUpIcon className="h-5 w-5" />
                  <span>Import Data</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
                  <p className="text-gray-400 mb-6">
                    Export your clinic data in various formats for backup, analysis, or migration purposes.
                  </p>
                </div>

                {/* Export Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Data Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exportTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                          exportType === type.value
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                        onClick={() => setExportType(type.value)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{type.label}</h4>
                            <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                          </div>
                          {exportType === type.value && (
                            <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Export Format</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {formatOptions.map((format) => (
                      <div
                        key={format.value}
                        className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                          exportFormat === format.value
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                        onClick={() => setExportFormat(format.value)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{format.label}</h4>
                            <p className="text-xs text-gray-400 mt-1">{format.description}</p>
                          </div>
                          {exportFormat === format.value && (
                            <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Filters */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-white mb-4">Export Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                      <select
                        value={exportFilters.dateRange}
                        onChange={(e) => setExportFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>

                    {exportFilters.dateRange === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={exportFilters.startDate}
                            onChange={(e) => setExportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                          <input
                            type="date"
                            value={exportFilters.endDate}
                            onChange={(e) => setExportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <select
                        value={exportFilters.status}
                        onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                    {loading ? 'Exporting...' : 'Export Data'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Import Data</h3>
                  <p className="text-gray-400 mb-6">
                    Import data from external sources or other EHR systems. Download templates to ensure proper formatting.
                  </p>
                </div>

                {/* Import Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Import Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                          importType === type.value
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                        onClick={() => {
                          console.log('Setting importType to:', type.value);
                          setImportType(type.value);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{type.label}</h4>
                            <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {importType === type.value && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadTemplate(type.value);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              Download Template
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
                <div className="bg-gray-700/30 rounded-lg p-6">
                  <h4 className="text-sm font-medium text-white mb-4">Upload File</h4>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <CloudArrowUpIcon className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`} />
                    <div className="text-sm text-gray-300 mb-2">
                      <label htmlFor="file-upload" className="cursor-pointer text-blue-400 hover:text-blue-300">
                        Click to upload
                      </label>
                      <span> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {importType === 'chirotouch-full'
                        ? `ZIP files only (max ${window.location.hostname.includes('railway.app') ? '500MB' : '50MB'})`
                        : 'CSV or XLSX files only (max 10MB)'}
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      accept={importType === 'chirotouch-full' ? '.zip' : '.csv,.xlsx'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-gray-600 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DocumentArrowUpIcon className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-white">{selectedFile.name}</span>
                          <span className="text-xs text-gray-400">({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setImportStep(1);
                            setImportPreview(null);
                            setIsChirotouch(false);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Show upload progress when loading */}
                      {loading && !importPreview && (
                        <div className="mt-3 pt-3 border-t border-gray-500">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-300">
                              <span>📤 Uploading file...</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {uploadProgress}%
                            </span>
                          </div>
                          <div className="bg-gray-600 rounded-full h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Show Initiate Import button for uploaded files */}
                      {!loading && !importPreview && (
                        <div className="mt-3 pt-3 border-t border-gray-500">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-300">
                              <span>📁 File ready for upload</span>
                            </div>
                            <button
                              onClick={() => processFile(selectedFile)}
                              disabled={loading}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {loading ? 'Uploading...' : 'Upload & Process'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show success message and next step button after upload */}
                      {importPreview && importStep === 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-500">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-300">
                              {isChirotouch ? (
                                <span>✅ ChiroTouch ZIP file uploaded successfully</span>
                              ) : (
                                <span>✅ File uploaded successfully - {importPreview.totalRows} rows detected</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isChirotouch) {
                                  setImportStep(2); // Go to ChiroTouch review
                                } else {
                                  setImportStep(2); // Go to column mapping
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {isChirotouch ? 'Review & Import' : 'Map Columns'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Import Steps Indicator */}
                {selectedFile && (
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-white">Import Progress</h4>
                      <span className="text-xs text-gray-400">Step {importStep} of 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {[1, 2, 3, 4, 5].map((step, index) => (
                        <div key={step} className="flex flex-col items-center flex-1">
                          <div className="flex items-center w-full">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                step <= importStep
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-600 text-gray-400'
                              }`}
                            >
                              {step === 5 && importStep === 5 ? '✓' : step}
                            </div>
                            {step < 5 && (
                              <div
                                className={`flex-1 h-0.5 mx-2 ${
                                  step < importStep ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                              />
                            )}
                          </div>
                          <span className="text-xs text-gray-400 mt-2">
                            {['Upload', 'Map', 'Preview', 'Import', 'Results'][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Column Mapping (Step 2) */}
                {importStep === 2 && importPreview && !isChirotouch && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-white mb-4">Column Mapping</h4>
                    <p className="text-xs text-gray-400 mb-4">
                      Map the columns from your file to SpineLine fields. Unmapped columns will be ignored.
                    </p>

                    <div className="space-y-3">
                      {importPreview.columns.map((column, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="w-1/3">
                            <span className="text-sm text-white">{column}</span>
                          </div>
                          <div className="w-8 text-center">
                            <span className="text-gray-400">→</span>
                          </div>
                          <div className="w-1/3">
                            <select
                              value={columnMapping[column] || ''}
                              onChange={(e) => setColumnMapping(prev => ({ ...prev, [column]: e.target.value }))}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">-- Skip Column --</option>
                              {importType === 'patients' && (
                                <>
                                  <option value="firstName">First Name</option>
                                  <option value="lastName">Last Name</option>
                                  <option value="dateOfBirth">Date of Birth</option>
                                  <option value="gender">Gender</option>
                                  <option value="phone">Phone</option>
                                  <option value="email">Email</option>
                                  <option value="recordNumber">Record Number</option>
                                  <option value="notes">Notes</option>
                                </>
                              )}
                              {importType === 'appointments' && (
                                <>
                                  <option value="appointmentDate">Appointment Date</option>
                                  <option value="appointmentTime">Appointment Time</option>
                                  <option value="patientRecordNumber">Patient Record Number</option>
                                  <option value="visitType">Visit Type</option>
                                  <option value="duration">Duration</option>
                                  <option value="providerName">Provider Name</option>
                                  <option value="notes">Notes</option>
                                </>
                              )}
                              {importType === 'service-codes' && (
                                <>
                                  <option value="code">Service Code</option>
                                  <option value="description">Description</option>
                                  <option value="category">Category</option>
                                  <option value="unitRate">Unit Rate</option>
                                  <option value="isPackage">Is Package</option>
                                  <option value="totalSessions">Total Sessions</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => {
                          setImportStep(1);
                          setImportPreview(null);
                          setColumnMapping({});
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setImportStep(3)}
                        disabled={Object.keys(columnMapping).length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Preview Import
                      </button>
                    </div>
                  </div>
                )}

                {/* ChiroTouch Review Screen (Step 2 for ChiroTouch) */}
                {importStep === 2 && isChirotouch && importPreview && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-white mb-4">ChiroTouch Import Review</h4>
                    <p className="text-xs text-gray-400 mb-6">
                      Review the detected data and select which datasets to import. You can deselect any datasets you don't want to import.
                    </p>

                    {/* Import Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-400">{importPreview.preview.summary.totalPatients}</div>
                        <div className="text-xs text-blue-300">Patients Found</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-400">{importPreview.preview.summary.totalAppointments}</div>
                        <div className="text-xs text-green-300">Appointments Found</div>
                      </div>
                      <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-400">{importPreview.preview.summary.totalLedgerRecords}</div>
                        <div className="text-xs text-purple-300">Ledger Records Found</div>
                      </div>
                    </div>

                    {/* Dataset Selection */}
                    <div className="space-y-4 mb-6">
                      <h5 className="text-sm font-medium text-white">Select Datasets to Import</h5>

                      {/* Patients */}
                      <div className="flex items-center justify-between p-4 bg-gray-600/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="patients-dataset"
                            checked={selectedDatasets.patients}
                            onChange={(e) => setSelectedDatasets(prev => ({ ...prev, patients: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="patients-dataset" className="text-sm font-medium text-white">
                            Patient Records
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">{importPreview.preview.patients.count} records</span>
                      </div>

                      {/* Appointments */}
                      <div className="flex items-center justify-between p-4 bg-gray-600/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="appointments-dataset"
                            checked={selectedDatasets.appointments}
                            onChange={(e) => setSelectedDatasets(prev => ({ ...prev, appointments: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="appointments-dataset" className="text-sm font-medium text-white">
                            Appointments
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">{importPreview.preview.appointments.count} records</span>
                      </div>

                      {/* Ledger */}
                      <div className="flex items-center justify-between p-4 bg-gray-600/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="ledger-dataset"
                            checked={selectedDatasets.ledger}
                            onChange={(e) => setSelectedDatasets(prev => ({ ...prev, ledger: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="ledger-dataset" className="text-sm font-medium text-white">
                            Ledger Records
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">{importPreview.preview.ledger.count} records</span>
                      </div>

                      {/* Chart Notes */}
                      <div className="flex items-center justify-between p-4 bg-gray-600/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="chartnotes-dataset"
                            checked={selectedDatasets.chartNotes}
                            onChange={(e) => setSelectedDatasets(prev => ({ ...prev, chartNotes: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="chartnotes-dataset" className="text-sm font-medium text-white">
                            Chart Notes (PDFs)
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">{importPreview.preview.chartNotes.count} files</span>
                      </div>

                      {/* Scanned Documents */}
                      <div className="flex items-center justify-between p-4 bg-gray-600/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="scanneddocs-dataset"
                            checked={selectedDatasets.scannedDocs}
                            onChange={(e) => setSelectedDatasets(prev => ({ ...prev, scannedDocs: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="scanneddocs-dataset" className="text-sm font-medium text-white">
                            Scanned Documents (PDFs)
                          </label>
                        </div>
                        <span className="text-xs text-gray-400">{importPreview.preview.scannedDocs.count} files</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                      <button
                        onClick={() => {
                          setImportStep(1);
                          setImportPreview(null);
                          setIsChirotouch(false);
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleImportProcess}
                        disabled={loading || !Object.values(selectedDatasets).some(Boolean)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Processing...' : 'Start Import'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Data Preview (Step 3) */}
                {importStep === 3 && importPreview && !isChirotouch && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-white mb-4">Data Preview</h4>
                    <p className="text-xs text-gray-400 mb-4">
                      Review the first 5 rows of mapped data before importing. Check for any formatting issues.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-600">
                        <thead className="bg-gray-600">
                          <tr>
                            {Object.values(columnMapping).filter(Boolean).map((field, index) => (
                              <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                {field}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-gray-700 divide-y divide-gray-600">
                          {importPreview.preview.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {Object.entries(columnMapping).filter(([_, field]) => field).map(([column, field], colIndex) => (
                                <td key={colIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                  {row[column] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        onClick={() => setImportStep(2)}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Back to Mapping
                      </button>
                      <button
                        onClick={handleImportProcess}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Processing...' : 'Start Import'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Import Confirmation (Step 4) */}
                {importStep === 4 && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-white mb-4">Import in Progress</h4>
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-300">
                        {isChirotouch
                          ? 'Processing ChiroTouch export...'
                          : `Processing ${importPreview?.totalRows} records...`
                        }
                      </span>
                      <span className="text-xs text-gray-400">
                        {processingProgress}%
                      </span>
                    </div>
                    <div className="mt-4 bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Import Results (Step 5) */}
                {importStep === 5 && importResults && (
                  <div className="bg-gray-700/30 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-white mb-4">Import Results</h4>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-400">{importResults.summary.totalProcessed}</div>
                        <div className="text-xs text-blue-300">Total Processed</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-400">{importResults.summary.successCount}</div>
                        <div className="text-xs text-green-300">Successfully Imported</div>
                      </div>
                      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-400">{importResults.summary.errorCount}</div>
                        <div className="text-xs text-red-300">Errors</div>
                      </div>
                      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-400">{importResults.summary.duplicateCount}</div>
                        <div className="text-xs text-yellow-300">Duplicates Skipped</div>
                      </div>
                    </div>

                    {/* ChiroTouch Specific Summary */}
                    {importResults.chirotouchData && (
                      <div className="mb-6">
                        <h5 className="text-sm font-medium text-white mb-3">ChiroTouch Import Details</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-gray-600/50 rounded-lg p-3">
                            <div className="text-lg font-bold text-blue-400">{importResults.chirotouchData.patientsImported}</div>
                            <div className="text-xs text-gray-300">Patients</div>
                          </div>
                          <div className="bg-gray-600/50 rounded-lg p-3">
                            <div className="text-lg font-bold text-green-400">{importResults.chirotouchData.appointmentsImported}</div>
                            <div className="text-xs text-gray-300">Appointments</div>
                          </div>
                          <div className="bg-gray-600/50 rounded-lg p-3">
                            <div className="text-lg font-bold text-purple-400">{importResults.chirotouchData.ledgerRecordsImported}</div>
                            <div className="text-xs text-gray-300">Ledger Records</div>
                          </div>
                          <div className="bg-gray-600/50 rounded-lg p-3">
                            <div className="text-lg font-bold text-orange-400">{importResults.chirotouchData.chartNotesAttached}</div>
                            <div className="text-xs text-gray-300">Chart Notes</div>
                          </div>
                          <div className="bg-gray-600/50 rounded-lg p-3">
                            <div className="text-lg font-bold text-pink-400">{importResults.chirotouchData.scannedDocsAttached}</div>
                            <div className="text-xs text-gray-300">Scanned Docs</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Errors Section */}
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-medium text-red-400 mb-3">Import Errors (First 10)</h5>
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                          {importResults.errors.map((error, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="text-xs text-red-300">
                                <span className="font-medium">Row {error.row}:</span> {error.error}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Data: {JSON.stringify(error.data)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duplicates Section */}
                    {importResults.duplicates && importResults.duplicates.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-medium text-yellow-400 mb-3">Duplicate Records Skipped (First 10)</h5>
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                          {importResults.duplicates.map((duplicate, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="text-xs text-yellow-300">
                                {duplicate.type === 'patient' && (
                                  <>Record: {duplicate.recordNumber} - {duplicate.name}</>
                                )}
                                {duplicate.type === 'service-code' && (
                                  <>Code: {duplicate.code} - {duplicate.description}</>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings Section (ChiroTouch) */}
                    {importResults.warnings && importResults.warnings.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-sm font-medium text-orange-400 mb-3">Import Warnings (First 10)</h5>
                        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                          {importResults.warnings.map((warning, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="text-xs text-orange-300">
                                <span className="font-medium">{warning.type}:</span> {warning.message}
                              </div>
                              {warning.fileName && (
                                <div className="text-xs text-gray-400 mt-1">
                                  File: {warning.fileName}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                      <button
                        onClick={resetImport}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Import Another File
                      </button>
                      <button
                        onClick={() => navigate('/secretary')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  </div>
                )}

                {/* Security Notice */}
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-400">Security Notice</h4>
                      <p className="text-xs text-yellow-300 mt-1">
                        All imported data will be scoped to your clinic and logged for audit purposes.
                        Duplicate records will be detected and flagged for review.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SecretaryLayout>
  );
};

export default ImportExport;
