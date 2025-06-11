import React, { useState } from 'react';
import { Upload, FileText, Users, CheckCircle, AlertCircle } from 'lucide-react';

const SimpleImport = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [columns, setColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/simple-import/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setPreview(data.preview);
        setColumns(data.columns);
        
        // Auto-map common columns
        const mapping = {};
        data.columns.forEach(col => {
          const lower = col.toLowerCase();
          if (lower.includes('first') && lower.includes('name')) mapping.firstName = col;
          if (lower.includes('last') && lower.includes('name')) mapping.lastName = col;
          if (lower.includes('phone')) mapping.phone = col;
          if (lower.includes('email')) mapping.email = col;
          if (lower.includes('birth') || lower.includes('dob')) mapping.dateOfBirth = col;
          if (lower.includes('gender') || lower.includes('sex')) mapping.gender = col;
          if (lower.includes('record') || lower.includes('id')) mapping.recordNumber = col;
        });
        setColumnMapping(mapping);
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
  };

  const handleImport = async () => {
    if (!preview || !columnMapping.firstName || !columnMapping.lastName) {
      alert('Please map at least First Name and Last Name columns');
      return;
    }

    setImporting(true);
    
    try {
      const response = await fetch('/api/simple-import/import-patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          data: preview, // In real implementation, send full data
          columnMapping
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Upload className="w-8 h-8" />
          Simple Patient Import
        </h1>

        {/* File Upload */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload File
          </h2>
          
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">Click to select a CSV or Excel file</p>
              <p className="text-gray-400">Supported formats: .csv, .xlsx, .xls</p>
            </label>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <p><strong>Selected:</strong> {file.name}</p>
              <p><strong>Size:</strong> {(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={handleUpload}
                className="mt-3 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
              >
                Upload & Preview
              </button>
            </div>
          )}
        </div>

        {/* Column Mapping */}
        {preview && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Map Columns</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { key: 'firstName', label: 'First Name *', required: true },
                { key: 'lastName', label: 'Last Name *', required: true },
                { key: 'phone', label: 'Phone' },
                { key: 'email', label: 'Email' },
                { key: 'dateOfBirth', label: 'Date of Birth' },
                { key: 'gender', label: 'Gender' },
                { key: 'recordNumber', label: 'Record Number' }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                  </label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) => setColumnMapping(prev => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="">-- Select Column --</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <h3 className="text-lg font-semibold mb-3">Preview (First 5 rows)</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-600">
                <thead>
                  <tr className="bg-gray-700">
                    {columns.map(col => (
                      <th key={col} className="border border-gray-600 px-3 py-2 text-left">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-gray-600">
                      {columns.map(col => (
                        <td key={col} className="border border-gray-600 px-3 py-2">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !columnMapping.firstName || !columnMapping.lastName}
              className="mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              {importing ? 'Importing...' : 'Import Patients'}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Import Results
            </h2>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {result.summary?.successCount || 0}
                </div>
                <div className="text-green-300">Imported</div>
              </div>
              <div className="bg-red-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">
                  {result.summary?.errorCount || 0}
                </div>
                <div className="text-red-300">Errors</div>
              </div>
              <div className="bg-blue-900 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {result.summary?.totalProcessed || 0}
                </div>
                <div className="text-blue-300">Total</div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Errors
                </h3>
                <div className="bg-red-900 p-4 rounded-lg">
                  {result.errors.map((error, i) => (
                    <div key={i} className="mb-2">
                      <strong>Row {error.row}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleImport;
