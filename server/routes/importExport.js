const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Check if yauzl is available
let yauzl;
try {
  yauzl = require('yauzl');
  console.log('✅ yauzl module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load yauzl module:', error.message);
  console.error('❌ ZIP file processing will not be available');
}

console.log('🔄 ImportExport route module loading...');

const { verifyToken } = require('../middleware/auth');

// Simple logging middleware
router.use((req, res, next) => {
  console.log(`🔄 Import/Export route hit: ${req.method} ${req.path}`);
  next();
});

// Test endpoint to verify server is running latest code
router.get('/test', (req, res) => {
  let yauzlTest = 'not available';
  if (yauzl) {
    try {
      yauzlTest = 'available and functional';
    } catch (error) {
      yauzlTest = `available but error: ${error.message}`;
    }
  }

  res.json({
    message: 'Import/Export API is running',
    timestamp: new Date().toISOString(),
    yauzlAvailable: !!yauzl,
    yauzlTest: yauzlTest,
    version: '3.1.0',
    nodeVersion: process.version,
    platform: process.platform
  });
});

const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const ServiceCode = require('../models/ServiceCode');
const DiagnosticCode = require('../models/DiagnosticCode');
const Checkout = require('../models/Checkout');
const Ledger = require('../models/Ledger');
const SoapTemplate = require('../models/SoapTemplate');
const User = require('../models/User');
const ImportHistory = require('../models/ImportHistory');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 250 * 1024 * 1024 // 250MB limit for ChiroTouch exports
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, Excel, and ZIP files are allowed'));
    }
  }
});

// Helper function to convert data to CSV
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) return '';

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};

// Helper function to convert data to Excel
const convertToExcel = (data, headers, sheetName = 'Sheet1') => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Helper function to extract zip file
const extractZipFile = (zipPath, extractPath) => {
  return new Promise((resolve, reject) => {
    const extractedFiles = [];

    console.log(`🔄 Opening ZIP file: ${zipPath}`);

    if (!yauzl) {
      return reject(new Error('ZIP processing not available - yauzl module not loaded'));
    }

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('❌ Failed to open ZIP file:', err);
        return reject(err);
      }

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          const dirPath = path.join(extractPath, entry.fileName);
          fs.mkdirSync(dirPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            const filePath = path.join(extractPath, entry.fileName);
            const dirPath = path.dirname(filePath);
            fs.mkdirSync(dirPath, { recursive: true });

            const writeStream = fs.createWriteStream(filePath);
            readStream.pipe(writeStream);

            writeStream.on('close', () => {
              extractedFiles.push({
                fileName: entry.fileName,
                filePath: filePath,
                size: entry.uncompressedSize
              });
              zipfile.readEntry();
            });
          });
        }
      });

      zipfile.on('end', () => {
        resolve(extractedFiles);
      });

      zipfile.on('error', reject);
    });
  });
};

// Helper function to detect ChiroTouch folder structure
const detectChirotouchStructure = (extractedFiles) => {
  const structure = {
    isChirotouch: false,
    folders: {
      tables: [],
      ledgerHistory: [],
      statements: [],
      scannedDocs: [],
      chartNotes: []
    }
  };

  // Check for ChiroTouch folder patterns
  const folderPatterns = {
    tables: /^00_Tables\//i,
    ledgerHistory: /^01_LedgerHistory\//i,
    statements: /^01_Statements\//i,
    scannedDocs: /^02_ScannedDocs\//i,
    chartNotes: /^03_ChartNotes\//i
  };

  extractedFiles.forEach(file => {
    Object.entries(folderPatterns).forEach(([key, pattern]) => {
      if (pattern.test(file.fileName)) {
        structure.folders[key].push(file);
      }
    });
  });

  // Determine if this is a valid ChiroTouch export
  structure.isChirotouch = structure.folders.tables.length > 0 ||
                          structure.folders.ledgerHistory.length > 0;

  return structure;
};

// Helper function to parse CSV file
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Helper function to process ChiroTouch preview
const processChirotouchPreview = async (structure, extractPath) => {
  const preview = {
    patients: { count: 0, sample: [] },
    appointments: { count: 0, sample: [] },
    ledger: { count: 0, sample: [] },
    chartNotes: { count: 0, files: [] },
    scannedDocs: { count: 0, files: [] },
    summary: {
      totalPatients: 0,
      totalAppointments: 0,
      totalLedgerRecords: 0,
      totalChartNotes: 0,
      totalScannedDocs: 0
    }
  };

  try {
    // Process patients from 00_Tables
    const patientFiles = structure.folders.tables.filter(f =>
      f.fileName.toLowerCase().includes('patient') && f.fileName.endsWith('.csv')
    );

    for (const file of patientFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        preview.patients.count += data.length;
        preview.patients.sample = data.slice(0, 5); // First 5 records
        preview.summary.totalPatients += data.length;
      } catch (error) {
        console.warn(`Failed to parse patient file ${file.fileName}:`, error.message);
      }
    }

    // Process appointments from 00_Tables
    const appointmentFiles = structure.folders.tables.filter(f =>
      f.fileName.toLowerCase().includes('appointment') && f.fileName.endsWith('.csv')
    );

    for (const file of appointmentFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        preview.appointments.count += data.length;
        preview.appointments.sample = data.slice(0, 5);
        preview.summary.totalAppointments += data.length;
      } catch (error) {
        console.warn(`Failed to parse appointment file ${file.fileName}:`, error.message);
      }
    }

    // Process ledger from 01_LedgerHistory
    for (const file of structure.folders.ledgerHistory) {
      if (file.fileName.endsWith('.csv')) {
        try {
          const data = await parseCSVFile(file.filePath);
          preview.ledger.count += data.length;
          if (preview.ledger.sample.length < 5) {
            preview.ledger.sample.push(...data.slice(0, 5 - preview.ledger.sample.length));
          }
          preview.summary.totalLedgerRecords += data.length;
        } catch (error) {
          console.warn(`Failed to parse ledger file ${file.fileName}:`, error.message);
        }
      }
    }

    // Count chart notes (PDFs/TXT files)
    preview.chartNotes.count = structure.folders.chartNotes.length;
    preview.chartNotes.files = structure.folders.chartNotes.slice(0, 10).map(f => ({
      fileName: path.basename(f.fileName),
      size: f.size
    }));
    preview.summary.totalChartNotes = structure.folders.chartNotes.length;

    // Count scanned docs (PDFs)
    preview.scannedDocs.count = structure.folders.scannedDocs.length;
    preview.scannedDocs.files = structure.folders.scannedDocs.slice(0, 10).map(f => ({
      fileName: path.basename(f.fileName),
      size: f.size
    }));
    preview.summary.totalScannedDocs = structure.folders.scannedDocs.length;

  } catch (error) {
    console.error('Error processing ChiroTouch preview:', error);
    throw error;
  }

  return preview;
};

// Export data endpoint
router.get('/export', verifyToken, async (req, res) => {
  try {
    const { type, format, dateRange, startDate, endDate, status } = req.query;
    const { clinicId } = req.user;

    console.log(`📤 Export request: type=${type}, format=${format}, clinic=${clinicId}`);

    let data = [];
    let headers = [];
    let filename = '';

    // Build date filter
    let dateFilter = {};
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = { $gte: weekStart };
          break;
        case 'month':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          };
          break;
        case 'year':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateFilter = {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            };
          }
          break;
      }
    }

    switch (type) {
      case 'patients':
        const patientQuery = { clinicId };
        if (status && status !== 'all') {
          patientQuery.status = status === 'active' ? 'Active' : 'Inactive';
        }
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          patientQuery.createdAt = dateFilter;
        }

        const patients = await Patient.find(patientQuery).lean();
        data = patients.map(patient => ({
          recordNumber: patient.recordNumber,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '',
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: `${patient.address?.street || ''}, ${patient.address?.city || ''}, ${patient.address?.state || ''} ${patient.address?.zipCode || ''}`.trim(),
          status: patient.status,
          createdAt: new Date(patient.createdAt).toLocaleDateString(),
          lastVisit: patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : '',
          notes: patient.notes || ''
        }));
        headers = ['recordNumber', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'status', 'createdAt', 'lastVisit', 'notes'];
        filename = `patients-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'appointments':
        const appointmentQuery = { clinicId };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          appointmentQuery.appointmentDate = dateFilter;
        }

        const appointments = await Appointment.find(appointmentQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = appointments.map(apt => ({
          appointmentDate: new Date(apt.appointmentDate).toLocaleDateString(),
          appointmentTime: apt.appointmentTime,
          patientName: apt.patientId ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : 'Unknown',
          recordNumber: apt.patientId?.recordNumber || '',
          visitType: apt.visitType,
          status: apt.status,
          duration: apt.duration,
          providerName: apt.providerName || '',
          notes: apt.notes || '',
          totalAmount: apt.totalAmount || 0,
          copayAmount: apt.copayAmount || 0
        }));
        headers = ['appointmentDate', 'appointmentTime', 'patientName', 'recordNumber', 'visitType', 'status', 'duration', 'providerName', 'notes', 'totalAmount', 'copayAmount'];
        filename = `appointments-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'billing':
        const serviceCodes = await ServiceCode.find({ clinicId }).lean();
        data = serviceCodes.map(code => ({
          code: code.code,
          description: code.description,
          category: code.category,
          unitRate: code.unitRate,
          isPackage: code.isPackage ? 'Yes' : 'No',
          totalSessions: code.packageDetails?.totalSessions || '',
          isActive: code.isActive ? 'Yes' : 'No',
          usageCount: code.usageCount || 0,
          lastUsed: code.lastUsed ? new Date(code.lastUsed).toLocaleDateString() : ''
        }));
        headers = ['code', 'description', 'category', 'unitRate', 'isPackage', 'totalSessions', 'isActive', 'usageCount', 'lastUsed'];
        filename = `billing-codes-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'checkouts':
        const checkoutQuery = { clinicId };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          checkoutQuery.checkoutDate = dateFilter;
        }

        const checkouts = await Checkout.find(checkoutQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = checkouts.map(checkout => ({
          checkoutDate: new Date(checkout.checkoutDate).toLocaleDateString(),
          patientName: checkout.patientId ? `${checkout.patientId.firstName} ${checkout.patientId.lastName}` : 'Unknown',
          recordNumber: checkout.patientId?.recordNumber || '',
          receiptNumber: checkout.receiptNumber,
          totalAmount: checkout.totalAmount,
          amountPaid: checkout.amountPaid,
          paymentMethod: checkout.paymentMethod,
          serviceCodes: checkout.serviceCodes?.map(sc => sc.code).join(', ') || '',
          signature: checkout.signature ? 'Yes' : 'No',
          notes: checkout.checkoutNotes || ''
        }));
        headers = ['checkoutDate', 'patientName', 'recordNumber', 'receiptNumber', 'totalAmount', 'amountPaid', 'paymentMethod', 'serviceCodes', 'signature', 'notes'];
        filename = `checkouts-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'ledger':
        const ledgerQuery = { clinicId };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          ledgerQuery.transactionDate = dateFilter;
        }

        const ledgerRecords = await Ledger.find(ledgerQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = ledgerRecords.map(record => ({
          transactionDate: new Date(record.transactionDate).toLocaleDateString(),
          patientName: record.patientId ? `${record.patientId.firstName} ${record.patientId.lastName}` : 'Unknown',
          recordNumber: record.patientId?.recordNumber || '',
          transactionType: record.transactionType,
          description: record.description,
          amount: record.amount,
          balance: record.balance,
          paymentMethod: record.paymentMethod || '',
          receiptNumber: record.receiptNumber || '',
          notes: record.notes || ''
        }));
        headers = ['transactionDate', 'patientName', 'recordNumber', 'transactionType', 'description', 'amount', 'balance', 'paymentMethod', 'receiptNumber', 'notes'];
        filename = `ledger-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'soap-notes':
        // For SOAP notes, we'll export from appointments that have SOAP data
        const soapQuery = {
          clinicId,
          $or: [
            { 'soapNotes.subjective': { $exists: true, $ne: '' } },
            { 'soapNotes.objective': { $exists: true, $ne: '' } },
            { 'soapNotes.assessment': { $exists: true, $ne: '' } },
            { 'soapNotes.plan': { $exists: true, $ne: '' } }
          ]
        };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          soapQuery.appointmentDate = dateFilter;
        }

        const soapAppointments = await Appointment.find(soapQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = soapAppointments.map(apt => ({
          appointmentDate: new Date(apt.appointmentDate).toLocaleDateString(),
          patientName: apt.patientId ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : 'Unknown',
          recordNumber: apt.patientId?.recordNumber || '',
          visitType: apt.visitType,
          subjective: apt.soapNotes?.subjective || '',
          objective: apt.soapNotes?.objective || '',
          assessment: apt.soapNotes?.assessment || '',
          plan: apt.soapNotes?.plan || '',
          painScale: apt.soapNotes?.painScale || '',
          vitalSigns: apt.soapNotes?.vitalSigns ? JSON.stringify(apt.soapNotes.vitalSigns) : '',
          providerName: apt.providerName || ''
        }));
        headers = ['appointmentDate', 'patientName', 'recordNumber', 'visitType', 'subjective', 'objective', 'assessment', 'plan', 'painScale', 'vitalSigns', 'providerName'];
        filename = `soap-notes-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'signatures':
        // Export patient signatures from checkouts
        const signatureQuery = {
          clinicId,
          signature: { $exists: true, $ne: null }
        };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          signatureQuery.checkoutDate = dateFilter;
        }

        const signatureCheckouts = await Checkout.find(signatureQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = signatureCheckouts.map(checkout => ({
          checkoutDate: new Date(checkout.checkoutDate).toLocaleDateString(),
          patientName: checkout.patientId ? `${checkout.patientId.firstName} ${checkout.patientId.lastName}` : 'Unknown',
          recordNumber: checkout.patientId?.recordNumber || '',
          receiptNumber: checkout.receiptNumber,
          signatureType: checkout.signatureType || 'Digital',
          signatureTimestamp: checkout.signatureTimestamp ? new Date(checkout.signatureTimestamp).toLocaleString() : '',
          totalAmount: checkout.totalAmount,
          serviceCodes: checkout.serviceCodes?.map(sc => sc.code).join(', ') || ''
        }));
        headers = ['checkoutDate', 'patientName', 'recordNumber', 'receiptNumber', 'signatureType', 'signatureTimestamp', 'totalAmount', 'serviceCodes'];
        filename = `signatures-export-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // Generate file based on format
    let fileBuffer;
    let contentType;
    let fileExtension;

    switch (format) {
      case 'csv':
        fileBuffer = Buffer.from(convertToCSV(data, headers), 'utf8');
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'xlsx':
        fileBuffer = convertToExcel(data, headers, type);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'pdf':
        // For PDF, we'll redirect to the audit PDF generation for now
        // This could be expanded to generate custom PDF reports
        return res.status(400).json({ message: 'PDF export not yet implemented for this data type' });
      default:
        return res.status(400).json({ message: 'Invalid export format' });
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    console.log(`✅ Export completed: ${data.length} records, ${fileBuffer.length} bytes`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      message: 'Export failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Download import template
router.get('/template/:type', verifyToken, async (req, res) => {
  try {
    const { type } = req.params;

    let headers = [];
    let sampleData = [];
    let filename = '';

    switch (type) {
      case 'patients':
        headers = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'street', 'city', 'state', 'zipCode', 'recordNumber', 'notes'];
        sampleData = [{
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          gender: 'Male',
          phone: '555-123-4567',
          email: 'john.doe@email.com',
          street: '123 Main St',
          city: 'Anytown',
          state: 'NY',
          zipCode: '12345',
          recordNumber: 'P001',
          notes: 'Sample patient record'
        }];
        filename = 'patient-import-template';
        break;
      case 'appointments':
        headers = ['appointmentDate', 'appointmentTime', 'patientRecordNumber', 'visitType', 'duration', 'providerName', 'notes'];
        sampleData = [{
          appointmentDate: '2025-01-15',
          appointmentTime: '09:00',
          patientRecordNumber: 'P001',
          visitType: 'Regular Visit',
          duration: '30',
          providerName: 'Dr. Smith',
          notes: 'Follow-up appointment'
        }];
        filename = 'appointment-import-template';
        break;
      case 'service-codes':
        headers = ['code', 'description', 'category', 'unitRate', 'isPackage', 'totalSessions'];
        sampleData = [{
          code: '98941',
          description: 'Chiropractic manipulative treatment',
          category: 'Chiropractic Manipulation',
          unitRate: '75.00',
          isPackage: 'No',
          totalSessions: ''
        }];
        filename = 'service-codes-import-template';
        break;
      case 'icd-codes':
        headers = ['code', 'description', 'category', 'bodySystem', 'commonlyUsed'];
        sampleData = [{
          code: 'M54.5',
          description: 'Low back pain',
          category: 'Musculoskeletal',
          bodySystem: 'Spine',
          commonlyUsed: 'Yes'
        }];
        filename = 'icd-codes-import-template';
        break;
      case 'ledger':
        headers = ['patientRecordNumber', 'transactionDate', 'transactionType', 'description', 'amount', 'paymentMethod', 'notes'];
        sampleData = [{
          patientRecordNumber: 'P001',
          transactionDate: '2025-01-15',
          transactionType: 'Payment',
          description: 'Chiropractic treatment payment',
          amount: '75.00',
          paymentMethod: 'Cash',
          notes: 'Full payment received'
        }];
        filename = 'ledger-import-template';
        break;
      case 'soap-notes':
        headers = ['appointmentDate', 'patientRecordNumber', 'visitType', 'subjective', 'objective', 'assessment', 'plan', 'painScale', 'providerName'];
        sampleData = [{
          appointmentDate: '2025-01-15',
          patientRecordNumber: 'P001',
          visitType: 'Regular Visit',
          subjective: 'Patient reports lower back pain',
          objective: 'Limited ROM in lumbar spine',
          assessment: 'Lumbar strain',
          plan: 'Chiropractic adjustment, ice therapy',
          painScale: '6',
          providerName: 'Dr. Smith'
        }];
        filename = 'soap-notes-import-template';
        break;
      case 'chirotouch-full':
        // For ChiroTouch, return a ZIP file structure guide instead of CSV
        const guideContent = `ChiroTouch Export Structure Guide

This import type expects a ZIP file with the following folder structure:

📁 ChiroTouch Export.zip
├── 📁 00_Tables/
│   ├── 📄 Patients.csv (Patient demographics and information)
│   ├── 📄 Appointments.csv (Appointment schedules)
│   └── 📄 Other table files...
├── 📁 01_LedgerHistory/
│   └── 📄 Ledger files (Billing and payment records)
├── 📁 02_ScannedDocs/
│   └── 📄 PDF files (Scanned documents)
└── 📁 03_ChartNotes/
    └── 📄 PDF files (Chart notes and clinical documents)

Instructions:
1. Export your data from ChiroTouch using their export function
2. Ensure the ZIP file contains the above folder structure
3. Upload the entire ZIP file using the drag-and-drop area
4. The system will automatically detect and process all data types

Supported file types in ZIP:
- CSV files for patient and appointment data
- PDF files for documents and chart notes

Maximum file size: 250MB`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="ChiroTouch-Import-Guide.txt"');
        return res.send(guideContent);
      default:
        return res.status(400).json({ message: 'Invalid template type' });
    }

    const csvContent = convertToCSV(sampleData, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ message: 'Failed to generate template' });
  }
});

// Simple test upload endpoint
router.post('/upload-test', verifyToken, (req, res) => {
  console.log('🔄 Test upload endpoint hit');
  res.json({
    message: 'Test upload endpoint working',
    timestamp: new Date().toISOString(),
    body: req.body,
    files: req.files ? 'files present' : 'no files'
  });
});

// Upload and process import file - now with multer and error handling
router.post('/upload', upload.single('file'), (req, res) => {
  console.log('--- /api/import-export/upload called ---');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('File:', req.file);
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Multer error handler for this router
router.use((err, req, res, next) => {
  console.error('Router Multer/FileType error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message, type: 'MulterError' });
  } else if (err && err.message && err.message.includes('Only CSV, Excel, and ZIP files are allowed')) {
    return res.status(400).json({ message: err.message, type: 'FileTypeError' });
  }
  next(err);
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error('❌ Unhandled error in import/export router:', error);
  console.error('❌ Error type:', typeof error);
  if (error && error.stack) console.error('❌ Error stack:', error.stack);

  // Force JSON response
  res.setHeader('Content-Type', 'application/json');

  if (!res.headersSent) {
    const errorResponse = {
      message: 'Internal server error',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      route: req.path,
      method: req.method
    };
    console.error('Responding with JSON error:', errorResponse);
    res.status(500).json(errorResponse);
  }
});

// Process import data
router.post('/process', verifyToken, async (req, res) => {
  try {
    const { type, data, columnMapping, isChirotouch, structure, extractPath, selectedDatasets } = req.body;
    const { clinicId, userId, name: userName } = req.user;

    console.log(`🔄 Processing import: type=${type}, clinic=${clinicId}`);

    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    let duplicates = [];
    let warnings = [];

    // Handle ChiroTouch full import
    if (isChirotouch && type === 'chirotouch-full') {
      console.log('🏥 Processing ChiroTouch full import...');

      const importHistory = new ImportHistory({
        clinicId,
        importType: 'chirotouch-full',
        importSource: 'ChiroTouch Export',
        originalFileName: req.body.originalFileName || 'chirotouch-export.zip',
        fileSize: req.body.fileSize || 0,
        fileType: 'zip',
        importedBy: userName,
        importedByUserId: userId,
        status: 'processing',
        processingStarted: new Date()
      });

      try {
        const result = await processChirotouchFullImport(structure, extractPath, clinicId, userName, selectedDatasets);

        // Update import history
        importHistory.summary = result.summary;
        importHistory.chirotouchData = result.chirotouchData;
        importHistory.errors = result.errors;
        importHistory.duplicates = result.duplicates;
        importHistory.warnings = result.warnings;
        importHistory.status = 'completed';
        importHistory.processingCompleted = new Date();
        importHistory.processingDuration = Date.now() - importHistory.processingStarted.getTime();

        await importHistory.save();

        // Clean up extracted files
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
        }

        return res.json({
          success: true,
          summary: result.summary,
          chirotouchData: result.chirotouchData,
          errors: result.errors.slice(0, 10),
          duplicates: result.duplicates.slice(0, 10),
          warnings: result.warnings.slice(0, 10),
          importHistoryId: importHistory._id
        });

      } catch (error) {
        importHistory.status = 'failed';
        importHistory.processingCompleted = new Date();
        importHistory.errors.push({
          errorMessage: error.message,
          timestamp: new Date()
        });
        await importHistory.save();
        throw error;
      }
    }

    // Handle regular CSV/Excel imports
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    console.log(`📊 Processing ${data.length} records...`);

    // Process each record based on type
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const mappedData = {};

      // Map columns to fields
      Object.entries(columnMapping).forEach(([column, field]) => {
        if (field && row[column] !== undefined) {
          mappedData[field] = row[column];
        }
      });

      try {
        switch (type) {
          case 'patients':
            await processPatientImport(mappedData, clinicId, userName, duplicates);
            break;
          case 'appointments':
            await processAppointmentImport(mappedData, clinicId, userName);
            break;
          case 'service-codes':
            await processServiceCodeImport(mappedData, clinicId, userName, duplicates);
            break;
          case 'icd-codes':
            await processIcdCodeImport(mappedData, clinicId, userName, duplicates);
            break;
          case 'ledger':
            await processLedgerImport(mappedData, clinicId, userName);
            break;
          case 'soap-notes':
            await processSoapNotesImport(mappedData, clinicId, userName);
            break;
          default:
            throw new Error(`Unsupported import type: ${type}`);
        }
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          data: mappedData,
          error: error.message
        });
      }
    }

    // Log import activity
    console.log(`✅ Import completed: ${successCount} success, ${errorCount} errors, ${duplicates.length} duplicates`);

    res.json({
      success: true,
      summary: {
        totalProcessed: data.length,
        successCount,
        errorCount,
        duplicateCount: duplicates.length
      },
      errors: errors.slice(0, 10), // Return first 10 errors
      duplicates: duplicates.slice(0, 10) // Return first 10 duplicates
    });

  } catch (error) {
    console.error('Import processing error:', error);
    res.status(500).json({ message: 'Failed to process import data' });
  }
});

// Helper function to process patient import
async function processPatientImport(data, clinicId, createdBy, duplicates) {
  // Check for duplicates
  if (data.recordNumber) {
    const existing = await Patient.findOne({
      clinicId,
      recordNumber: data.recordNumber
    });
    if (existing) {
      duplicates.push({
        type: 'patient',
        recordNumber: data.recordNumber,
        name: `${data.firstName} ${data.lastName}`
      });
      return; // Skip duplicate
    }
  }

  // Create patient record
  const patientData = {
    ...data,
    clinicId,
    createdBy,
    status: 'Active',
    imported: true,
    importSource: 'CSV/Excel Import',
    importedAt: new Date()
  };

  // Parse date of birth if provided
  if (data.dateOfBirth) {
    patientData.dateOfBirth = new Date(data.dateOfBirth);
  }

  // Handle address fields
  if (data.street || data.city || data.state || data.zipCode) {
    patientData.address = {
      street: data.street || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || ''
    };
  }

  const patient = new Patient(patientData);
  await patient.save();
}

// Helper function to process appointment import
async function processAppointmentImport(data, clinicId, createdBy) {
  // Find patient by record number
  const patient = await Patient.findOne({
    clinicId,
    recordNumber: data.patientRecordNumber
  });

  if (!patient) {
    throw new Error(`Patient not found: ${data.patientRecordNumber}`);
  }

  // Create appointment record
  const appointmentData = {
    patientId: patient._id,
    clinicId,
    appointmentDate: new Date(data.appointmentDate),
    appointmentTime: data.appointmentTime,
    visitType: data.visitType || 'Regular Visit',
    duration: parseInt(data.duration) || 30,
    providerName: data.providerName || '',
    notes: data.notes || '',
    status: 'Scheduled',
    createdBy,
    imported: true,
    importSource: 'CSV/Excel Import',
    importedAt: new Date()
  };

  const appointment = new Appointment(appointmentData);
  await appointment.save();
}

// Helper function to process service code import
async function processServiceCodeImport(data, clinicId, createdBy, duplicates) {
  // Check for duplicates
  const existing = await ServiceCode.findOne({
    clinicId,
    code: data.code
  });

  if (existing) {
    duplicates.push({
      type: 'service-code',
      code: data.code,
      description: data.description
    });
    return; // Skip duplicate
  }

  // Create service code record
  const serviceCodeData = {
    clinicId,
    code: data.code,
    description: data.description,
    category: data.category || 'Other',
    unitRate: parseFloat(data.unitRate) || 0,
    isPackage: data.isPackage === 'Yes' || data.isPackage === 'true',
    isActive: true,
    createdBy,
    imported: true,
    importSource: 'CSV/Excel Import',
    importedAt: new Date()
  };

  // Handle package details
  if (serviceCodeData.isPackage && data.totalSessions) {
    serviceCodeData.packageDetails = {
      totalSessions: parseInt(data.totalSessions),
      includedCodes: []
    };
  }

  const serviceCode = new ServiceCode(serviceCodeData);
  await serviceCode.save();
}

// Helper function to process ICD code import
async function processIcdCodeImport(data, clinicId, createdBy, duplicates) {
  // Check for duplicates
  const existing = await DiagnosticCode.findOne({
    clinicId,
    code: data.code
  });

  if (existing) {
    duplicates.push({
      type: 'icd-code',
      code: data.code,
      description: data.description
    });
    return; // Skip duplicate
  }

  // Create diagnostic code record
  const diagnosticCodeData = {
    clinicId,
    code: data.code.toUpperCase(),
    description: data.description,
    category: data.category || 'Other',
    bodySystem: data.bodySystem || 'Other',
    commonlyUsed: data.commonlyUsed === 'Yes' || data.commonlyUsed === 'true',
    isActive: true,
    imported: true,
    importSource: 'CSV/Excel Import',
    importedAt: new Date()
  };

  const diagnosticCode = new DiagnosticCode(diagnosticCodeData);
  await diagnosticCode.save();
}

// Helper function to process ledger import
async function processLedgerImport(data, clinicId, createdBy) {
  // Find patient by record number
  const patient = await Patient.findOne({
    clinicId,
    recordNumber: data.patientRecordNumber
  });

  if (!patient) {
    throw new Error(`Patient not found: ${data.patientRecordNumber}`);
  }

  // Create ledger record
  const ledgerData = {
    patientId: patient._id,
    clinicId,
    transactionDate: new Date(data.transactionDate),
    transactionType: data.transactionType,
    description: data.description,
    amount: parseFloat(data.amount) || 0,
    paymentMethod: data.paymentMethod || '',
    notes: data.notes || '',
    createdBy,
    imported: true,
    importSource: 'CSV/Excel Import',
    importedAt: new Date()
  };

  const ledger = new Ledger(ledgerData);
  await ledger.save();
}

// Helper function to process SOAP notes import
async function processSoapNotesImport(data, clinicId, createdBy) {
  // Find patient by record number
  const patient = await Patient.findOne({
    clinicId,
    recordNumber: data.patientRecordNumber
  });

  if (!patient) {
    throw new Error(`Patient not found: ${data.patientRecordNumber}`);
  }

  // Find or create appointment for the date
  let appointment = await Appointment.findOne({
    clinicId,
    patientId: patient._id,
    appointmentDate: new Date(data.appointmentDate)
  });

  if (!appointment) {
    // Create new appointment if it doesn't exist
    appointment = new Appointment({
      patientId: patient._id,
      clinicId,
      appointmentDate: new Date(data.appointmentDate),
      appointmentTime: '09:00', // Default time
      visitType: data.visitType || 'Regular Visit',
      status: 'Checked-Out',
      providerName: data.providerName || '',
      createdBy,
      imported: true,
      importSource: 'CSV/Excel Import',
      importedAt: new Date()
    });
  }

  // Add SOAP notes
  appointment.soapNotes = {
    subjective: data.subjective || '',
    objective: data.objective || '',
    assessment: data.assessment || '',
    plan: data.plan || '',
    painScale: parseInt(data.painScale) || null,
    vitalSigns: {},
    lastUpdated: new Date(),
    updatedBy: createdBy
  };

  await appointment.save();
}

// Helper function to process ChiroTouch full import
async function processChirotouchFullImport(structure, extractPath, clinicId, createdBy, selectedDatasets = {}) {
  const result = {
    summary: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      skippedCount: 0
    },
    chirotouchData: {
      patientsImported: 0,
      appointmentsImported: 0,
      ledgerRecordsImported: 0,
      chartNotesAttached: 0,
      scannedDocsAttached: 0,
      foldersProcessed: []
    },
    errors: [],
    duplicates: [],
    warnings: []
  };

  try {
    // Process patients from 00_Tables if selected
    if (selectedDatasets.patients !== false) {
      console.log('👥 Processing patients...');
      const patientFiles = structure.folders.tables.filter(f =>
        f.fileName.toLowerCase().includes('patient') && f.fileName.endsWith('.csv')
      );

      for (const file of patientFiles) {
        try {
          const data = await parseCSVFile(file.filePath);
          let fileSuccessCount = 0;
          let fileErrorCount = 0;

          for (const row of data) {
            try {
              // Map ChiroTouch patient fields to SpineLine format
              const mappedData = mapChirotouchPatient(row);
              await processPatientImport(mappedData, clinicId, createdBy, result.duplicates);
              fileSuccessCount++;
              result.summary.successCount++;
            } catch (error) {
              fileErrorCount++;
              result.summary.errorCount++;
              result.errors.push({
                fileName: file.fileName,
                errorMessage: error.message,
                data: row,
                timestamp: new Date()
              });
            }
          }

          result.chirotouchData.patientsImported += fileSuccessCount;
          result.summary.totalProcessed += data.length;

          result.chirotouchData.foldersProcessed.push({
            folderName: '00_Tables/Patients',
            fileCount: 1,
            processedCount: fileSuccessCount,
            errorCount: fileErrorCount
          });

        } catch (error) {
          result.warnings.push({
            type: 'missing_file',
            message: `Failed to process patient file: ${file.fileName}`,
            fileName: file.fileName,
            timestamp: new Date()
          });
        }
      }
    }

    // Process appointments from 00_Tables if selected
    if (selectedDatasets.appointments !== false) {
      console.log('📅 Processing appointments...');
      const appointmentFiles = structure.folders.tables.filter(f =>
        f.fileName.toLowerCase().includes('appointment') && f.fileName.endsWith('.csv')
      );

      for (const file of appointmentFiles) {
        try {
          const data = await parseCSVFile(file.filePath);
          let fileSuccessCount = 0;
          let fileErrorCount = 0;

          for (const row of data) {
            try {
              const mappedData = mapChirotouchAppointment(row);
              await processAppointmentImport(mappedData, clinicId, createdBy);
              fileSuccessCount++;
              result.summary.successCount++;
            } catch (error) {
              fileErrorCount++;
              result.summary.errorCount++;
              result.errors.push({
                fileName: file.fileName,
                errorMessage: error.message,
                data: row,
                timestamp: new Date()
              });
            }
          }

          result.chirotouchData.appointmentsImported += fileSuccessCount;
          result.summary.totalProcessed += data.length;

        } catch (error) {
          result.warnings.push({
            type: 'missing_file',
            message: `Failed to process appointment file: ${file.fileName}`,
            fileName: file.fileName,
            timestamp: new Date()
          });
        }
      }
    }

    // Process ledger records from 01_LedgerHistory if selected
    if (selectedDatasets.ledger !== false) {
      console.log('💰 Processing ledger records...');
      for (const file of structure.folders.ledgerHistory) {
        if (file.fileName.endsWith('.csv')) {
          try {
            const data = await parseCSVFile(file.filePath);
            let fileSuccessCount = 0;
            let fileErrorCount = 0;

            for (const row of data) {
              try {
                const mappedData = mapChirotouchLedger(row);
                await processLedgerImport(mappedData, clinicId, createdBy);
                fileSuccessCount++;
                result.summary.successCount++;
              } catch (error) {
                fileErrorCount++;
                result.summary.errorCount++;
                result.errors.push({
                  fileName: file.fileName,
                  errorMessage: error.message,
                  data: row,
                  timestamp: new Date()
                });
              }
            }

            result.chirotouchData.ledgerRecordsImported += fileSuccessCount;
            result.summary.totalProcessed += data.length;

          } catch (error) {
            result.warnings.push({
              type: 'missing_file',
              message: `Failed to process ledger file: ${file.fileName}`,
              fileName: file.fileName,
              timestamp: new Date()
            });
          }
        }
      }
    }

    // Attach chart notes if selected
    if (selectedDatasets.chartNotes !== false) {
      console.log('📋 Attaching chart notes...');
      result.chirotouchData.chartNotesAttached = await attachChartNotes(
        structure.folders.chartNotes,
        clinicId,
        result.warnings
      );
    }

    // Attach scanned documents if selected
    if (selectedDatasets.scannedDocs !== false) {
      console.log('📄 Attaching scanned documents...');
      result.chirotouchData.scannedDocsAttached = await attachScannedDocs(
        structure.folders.scannedDocs,
        clinicId,
        result.warnings
      );
    }

    result.summary.duplicateCount = result.duplicates.length;

    console.log('✅ ChiroTouch import completed:', result.summary);
    return result;

  } catch (error) {
    console.error('❌ ChiroTouch import failed:', error);
    throw error;
  }
}

// Helper function to map ChiroTouch patient data to SpineLine format
function mapChirotouchPatient(row) {
  return {
    firstName: row['First Name'] || row['FirstName'] || row['first_name'] || '',
    lastName: row['Last Name'] || row['LastName'] || row['last_name'] || '',
    dateOfBirth: row['Date of Birth'] || row['DOB'] || row['date_of_birth'] || '',
    gender: row['Gender'] || row['Sex'] || '',
    phone: row['Phone'] || row['Phone Number'] || row['phone_number'] || '',
    email: row['Email'] || row['email'] || '',
    street: row['Address'] || row['Street'] || row['address'] || '',
    city: row['City'] || row['city'] || '',
    state: row['State'] || row['state'] || '',
    zipCode: row['Zip'] || row['Zip Code'] || row['zip_code'] || '',
    recordNumber: row['Patient ID'] || row['PatientID'] || row['Record Number'] || row['patient_id'] || '',
    notes: row['Notes'] || row['notes'] || ''
  };
}

// Helper function to map ChiroTouch appointment data to SpineLine format
function mapChirotouchAppointment(row) {
  return {
    appointmentDate: row['Appointment Date'] || row['Date'] || row['appointment_date'] || '',
    appointmentTime: row['Time'] || row['Appointment Time'] || row['appointment_time'] || '09:00',
    patientRecordNumber: row['Patient ID'] || row['PatientID'] || row['patient_id'] || '',
    visitType: row['Visit Type'] || row['Type'] || row['visit_type'] || 'Regular Visit',
    duration: row['Duration'] || row['duration'] || '30',
    providerName: row['Provider'] || row['Doctor'] || row['provider'] || '',
    notes: row['Notes'] || row['notes'] || ''
  };
}

// Helper function to map ChiroTouch ledger data to SpineLine format
function mapChirotouchLedger(row) {
  return {
    patientRecordNumber: row['Patient ID'] || row['PatientID'] || row['patient_id'] || '',
    transactionDate: row['Date'] || row['Transaction Date'] || row['transaction_date'] || '',
    transactionType: row['Type'] || row['Transaction Type'] || row['transaction_type'] || 'Payment',
    description: row['Description'] || row['description'] || '',
    amount: row['Amount'] || row['amount'] || '0',
    paymentMethod: row['Payment Method'] || row['Method'] || row['payment_method'] || '',
    notes: row['Notes'] || row['notes'] || ''
  };
}

// Helper function to attach chart notes to patient records
async function attachChartNotes(chartNoteFiles, clinicId, warnings) {
  let attachedCount = 0;

  for (const file of chartNoteFiles) {
    try {
      // Extract patient identifier from filename (common patterns)
      const fileName = path.basename(file.fileName);
      const patientId = extractPatientIdFromFilename(fileName);

      if (!patientId) {
        warnings.push({
          type: 'missing_patient',
          message: `Could not extract patient ID from chart note: ${fileName}`,
          fileName: fileName,
          timestamp: new Date()
        });
        continue;
      }

      // Find patient by record number or name
      const patient = await Patient.findOne({
        clinicId,
        $or: [
          { recordNumber: patientId },
          { firstName: { $regex: patientId, $options: 'i' } },
          { lastName: { $regex: patientId, $options: 'i' } }
        ]
      });

      if (!patient) {
        warnings.push({
          type: 'missing_patient',
          message: `Patient not found for chart note: ${fileName} (ID: ${patientId})`,
          fileName: fileName,
          affectedRecord: patientId,
          timestamp: new Date()
        });
        continue;
      }

      // Copy file to patient documents folder
      const documentsDir = path.join(__dirname, '../uploads/patient-documents');
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const newFileName = `${patient._id}_${Date.now()}_${fileName}`;
      const newFilePath = path.join(documentsDir, newFileName);

      fs.copyFileSync(file.filePath, newFilePath);

      // Add to patient's files array
      if (!patient.files) {
        patient.files = [];
      }

      patient.files.push({
        fileName: fileName,
        filePath: newFileName,
        fileType: path.extname(fileName).toLowerCase(),
        uploadedAt: new Date(),
        uploadedBy: 'ChiroTouch Import',
        category: 'Chart Notes',
        description: 'Imported from ChiroTouch export'
      });

      await patient.save();
      attachedCount++;

    } catch (error) {
      warnings.push({
        type: 'format_issue',
        message: `Failed to attach chart note: ${file.fileName} - ${error.message}`,
        fileName: file.fileName,
        timestamp: new Date()
      });
    }
  }

  return attachedCount;
}

// Helper function to attach scanned documents to patient records
async function attachScannedDocs(scannedDocFiles, clinicId, warnings) {
  let attachedCount = 0;

  for (const file of scannedDocFiles) {
    try {
      const fileName = path.basename(file.fileName);
      const patientId = extractPatientIdFromFilename(fileName);

      if (!patientId) {
        warnings.push({
          type: 'missing_patient',
          message: `Could not extract patient ID from scanned doc: ${fileName}`,
          fileName: fileName,
          timestamp: new Date()
        });
        continue;
      }

      const patient = await Patient.findOne({
        clinicId,
        $or: [
          { recordNumber: patientId },
          { firstName: { $regex: patientId, $options: 'i' } },
          { lastName: { $regex: patientId, $options: 'i' } }
        ]
      });

      if (!patient) {
        warnings.push({
          type: 'missing_patient',
          message: `Patient not found for scanned doc: ${fileName} (ID: ${patientId})`,
          fileName: fileName,
          affectedRecord: patientId,
          timestamp: new Date()
        });
        continue;
      }

      // Copy file to patient documents folder
      const documentsDir = path.join(__dirname, '../uploads/patient-documents');
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      const newFileName = `${patient._id}_${Date.now()}_${fileName}`;
      const newFilePath = path.join(documentsDir, newFileName);

      fs.copyFileSync(file.filePath, newFilePath);

      // Add to patient's files array
      if (!patient.files) {
        patient.files = [];
      }

      patient.files.push({
        fileName: fileName,
        filePath: newFileName,
        fileType: path.extname(fileName).toLowerCase(),
        uploadedAt: new Date(),
        uploadedBy: 'ChiroTouch Import',
        category: 'Scanned Documents',
        description: 'Imported from ChiroTouch export'
      });

      await patient.save();
      attachedCount++;

    } catch (error) {
      warnings.push({
        type: 'format_issue',
        message: `Failed to attach scanned doc: ${file.fileName} - ${error.message}`,
        fileName: file.fileName,
        timestamp: new Date()
      });
    }
  }

  return attachedCount;
}

// Helper function to extract patient ID from filename
function extractPatientIdFromFilename(fileName) {
  // Common patterns for patient identification in filenames
  const patterns = [
    /(\d+)/, // Any number sequence
    /([A-Z]+\d+)/, // Letters followed by numbers
    /(\d+[A-Z]+)/, // Numbers followed by letters
    /(P\d+)/i, // P followed by numbers
    /([A-Za-z]+_[A-Za-z]+)/, // FirstName_LastName pattern
    /([A-Za-z]+\s[A-Za-z]+)/ // FirstName LastName pattern
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

console.log('✅ ImportExport route module loaded successfully');

module.exports = router;
