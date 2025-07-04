const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const yauzl = require('yauzl');
const { verifyToken } = require('../middleware/auth');

console.log('✅ ImportExport route loading...');

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Import/Export API working',
    version: '8.0.0',
    timestamp: new Date().toISOString()
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
    fileSize: 500 * 1024 * 1024, // 500MB limit for ChiroTouch exports
    fieldSize: 500 * 1024 * 1024,
    fields: 10,
    files: 1
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

  // Check for ChiroTouch folder patterns (more flexible matching)
  const folderPatterns = {
    tables: /^(00_Tables|Tables)\//i,
    ledgerHistory: /^(01_LedgerHistory|LedgerHistory|Ledger)\//i,
    statements: /^(01_Statements|Statements)\//i,
    scannedDocs: /^(02_ScannedDocs|ScannedDocs|Scanned)\//i,
    chartNotes: /^(03_ChartNotes|ChartNotes|Chart|Notes)\//i
  };

  console.log(`🔍 Analyzing ${extractedFiles.length} extracted files for ChiroTouch structure...`);

  extractedFiles.forEach(file => {
    console.log(`📄 File: ${file.fileName} (${file.size} bytes)`);

    Object.entries(folderPatterns).forEach(([key, pattern]) => {
      if (pattern.test(file.fileName)) {
        structure.folders[key].push(file);
        console.log(`  ✅ Matched ${key} pattern: ${file.fileName}`);
      }
    });
  });

  // Log detection results with details
  console.log('\n📊 ChiroTouch structure detection results:');
  Object.entries(structure.folders).forEach(([key, files]) => {
    console.log(`  📁 ${key}: ${files.length} files`);
    if (files.length > 0 && files.length <= 5) {
      files.forEach(f => console.log(`    - ${path.basename(f.fileName)}`));
    } else if (files.length > 5) {
      files.slice(0, 3).forEach(f => console.log(`    - ${path.basename(f.fileName)}`));
      console.log(`    ... and ${files.length - 3} more files`);
    }
  });

  // If no chart notes found in expected folder, look for PDFs that might be chart notes
  if (structure.folders.chartNotes.length === 0) {
    console.log('🔍 No files found in standard ChartNotes folder, searching for chart note PDFs...');

    const potentialChartNotes = extractedFiles.filter(file => {
      const fileName = file.fileName.toLowerCase();
      const ext = path.extname(fileName);

      // Look for PDFs that might be chart notes based on naming patterns
      return ext === '.pdf' && (
        fileName.includes('chart') ||
        fileName.includes('note') ||
        fileName.includes('soap') ||
        fileName.includes('visit') ||
        fileName.includes('progress') ||
        // ChiroTouch sometimes names files with patient info
        /patient.*\d+.*\.pdf$/i.test(fileName) ||
        // Or just any PDF in a notes-like folder
        /notes?|chart/i.test(path.dirname(fileName))
      );
    });

    if (potentialChartNotes.length > 0) {
      console.log(`📋 Found ${potentialChartNotes.length} potential chart note files outside standard folder`);
      structure.folders.chartNotes.push(...potentialChartNotes);
    }
  }

  // Determine if this is a valid ChiroTouch export
  structure.isChirotouch = structure.folders.tables.length > 0 ||
                          structure.folders.ledgerHistory.length > 0 ||
                          structure.folders.chartNotes.length > 0;

  console.log(`\n🏥 ChiroTouch export detected: ${structure.isChirotouch}`);

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

    // Count chart notes - ChiroTouch exports have one PDF per patient with all notes
    const chartNoteFiles = structure.folders.chartNotes.filter(f => {
      const fileName = f.fileName.toLowerCase();
      const ext = path.extname(fileName);
      // ChiroTouch chart notes are typically PDFs in 03_ChartNotes folder
      // Each PDF contains all chart notes for one patient chronologically
      return ext === '.pdf' || ext === '.txt' || ext === '.doc' || ext === '.docx' || ext === '.rtf';
    });

    console.log(`📋 Found ${chartNoteFiles.length} chart note files in ChiroTouch export`);
    chartNoteFiles.forEach(f => {
      console.log(`  - ${path.basename(f.fileName)} (${f.size} bytes)`);
    });

    preview.chartNotes.count = chartNoteFiles.length;
    preview.chartNotes.files = chartNoteFiles.slice(0, 10).map(f => ({
      fileName: path.basename(f.fileName),
      size: f.size,
      type: path.extname(f.fileName).toLowerCase(),
      description: 'Patient chart notes archive'
    }));
    preview.summary.totalChartNotes = chartNoteFiles.length;

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

// File upload endpoint with proper handling
router.post('/upload', upload.single('importFile'), async (req, res) => {
  try {
    console.log('📤 File upload endpoint hit');
    console.log('File:', req.file ? req.file.originalname : 'No file');
    console.log('Type:', req.body.type);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { type } = req.body;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Handle ZIP files (ChiroTouch exports)
    if (fileExtension === '.zip') {
      console.log('🗜️ Processing ZIP file...');

      const extractPath = path.join(path.dirname(filePath), `extracted_${Date.now()}`);
      fs.mkdirSync(extractPath, { recursive: true });

      try {
        console.log('🗜️ Extracting ZIP file for analysis...');

        // Extract the ZIP file to analyze its contents
        const extractedFiles = await extractZipFile(filePath, extractPath);
        console.log(`📁 Extracted ${extractedFiles.length} files`);

        // Detect ChiroTouch structure
        const structure = detectChirotouchStructure(extractedFiles);
        console.log('📊 Structure detection complete');

        // Generate preview data
        const preview = await processChirotouchPreview(structure, extractPath);
        console.log('📋 Preview generation complete');

        return res.json({
          success: true,
          isChirotouch: structure.isChirotouch,
          message: `ChiroTouch export analyzed successfully. Found ${preview.summary.totalPatients} patients, ${preview.summary.totalAppointments} appointments, ${preview.summary.totalChartNotes} chart notes.`,
          uploadId: req.file.filename,
          originalFileName: req.file.originalname,
          fileSize: req.file.size,
          extractPath: extractPath,
          structure: structure,
          preview: preview
        });
      } catch (error) {
        console.error('ZIP processing error:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to process ZIP file: ' + error.message
        });
      }
    }

    // Handle CSV/Excel files
    return res.json({
      success: true,
      isChirotouch: false,
      message: 'File uploaded successfully',
      uploadId: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      totalRows: 0, // Will be populated when we parse the file
      preview: [],
      columns: []
    });

  } catch (error) {
    console.error('Upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
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

// Process ChiroTouch import data (server-side only)
router.post('/process-chirotouch', verifyToken, async (req, res) => {
  try {
    const { type, data, columnMapping, isChirotouch, structure, extractPath, selectedDatasets } = req.body;
    const { clinicId, userId, name: userName } = req.user;

    console.log(`🔄 Processing ChiroTouch import: type=${type}, clinic=${clinicId}`);

    // Only handle ChiroTouch imports on this endpoint
    if (!isChirotouch || type !== 'chirotouch-full') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint only handles ChiroTouch full imports'
      });
    }

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
      console.log('🚀 Starting ChiroTouch import processing...');
      console.log('📊 Memory usage before import:', process.memoryUsage());

      // Set a longer timeout for large imports
      req.setTimeout(15 * 60 * 1000); // 15 minutes

      // Add response timeout handling
      res.setTimeout(15 * 60 * 1000, () => {
        console.error('❌ Response timeout after 15 minutes');
        if (!res.headersSent) {
          res.status(504).json({
            success: false,
            message: 'Import processing timeout - dataset too large. Please split your data into smaller files.',
            timeout: true
          });
        }
      });

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

  } catch (error) {
    console.error('❌ ChiroTouch import processing error:', error);
    res.status(500).json({
      success: false,
      message: 'ChiroTouch import failed: ' + error.message,
      error: error.message
    });
  }
});

// Process import data (regular CSV/Excel imports)
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

// Helper function to process provider import
async function processProviderImport(data, clinicId, createdBy) {
  // Check for duplicates by NPI or email
  const existing = await User.findOne({
    clinicId,
    role: 'doctor',
    $or: [
      { npiNumber: data.npiNumber },
      { name: data.fullName },
      { email: data.email }
    ]
  });

  if (existing) {
    console.log(`⚠️ Provider already exists: ${data.fullName} (${data.npiNumber})`);
    return; // Skip duplicate
  }

  // Generate a temporary password for imported providers
  const bcrypt = require('bcrypt');
  const tempPassword = 'ChiroTouch2024!'; // Default password for imported providers
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Create provider record using User model
  const providerData = {
    name: data.fullName,
    email: data.email || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@${clinicId.toLowerCase()}.temp`,
    passwordHash: hashedPassword,
    role: 'doctor',
    clinicId,
    isActive: true,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    npiNumber: data.npiNumber,
    licenseNumber: data.licenseNumber,
    specialty: data.specialty,
    // Store ChiroTouch identifiers for cross-referencing
    chirotouchProviderId: data.chirotouchProviderId,
    chirotouchDoctorId: data.chirotouchDoctorId,
    imported: true,
    importSource: 'ChiroTouch Import',
    importedAt: new Date()
  };

  const provider = new User(providerData);
  await provider.save();
  console.log(`✅ Provider imported: ${data.fullName} (${data.npiNumber})`);
}

// Helper function to process insurance import
async function processInsuranceImport(data, clinicId, createdBy) {
  // Find patient using enhanced matching
  const patient = await Patient.findOne({
    clinicId,
    $or: [
      { recordNumber: data.patientRecordNumber },
      { chirotouchAccountNo: data.patientRecordNumber },
      { chirotouchPatientId: data.patientRecordNumber },
      { chirotouchClientId: data.patientRecordNumber }
    ]
  });

  if (!patient) {
    throw new Error(`Patient not found for insurance: ${data.patientRecordNumber}`);
  }

  // Create insurance record
  const insuranceData = {
    provider: data.insuranceProvider,
    policyNumber: data.policyNumber,
    groupNumber: data.groupNumber,
    subscriberName: data.subscriberName,
    relationship: data.relationship,
    copay: parseFloat(data.copay) || 0,
    deductible: parseFloat(data.deductible) || 0,
    effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
    terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
    isPrimary: data.isPrimary === 'true' || data.isPrimary === true,
    importedFrom: 'ChiroTouch',
    importedAt: new Date()
  };

  // Add to patient's insurance array
  if (!patient.insurances) {
    patient.insurances = [];
  }

  patient.insurances.push(insuranceData);
  await patient.save();

  console.log(`✅ Insurance imported for patient: ${patient.fullName}`);
}

// Helper function to process diagnosis import
async function processDiagnosisImport(data, clinicId, createdBy) {
  // Check for duplicate diagnosis codes
  const existing = await DiagnosticCode.findOne({
    clinicId,
    code: data.code
  });

  if (existing) {
    console.log(`⚠️ Diagnosis code already exists: ${data.code}`);
    return; // Skip duplicate
  }

  // Create diagnosis code record
  const diagnosisData = {
    code: data.code,
    description: data.description,
    category: data.category,
    isActive: data.isActive === 'true' || data.isActive === true,
    clinicId,
    createdBy,
    imported: true,
    importSource: 'ChiroTouch Import',
    importedAt: new Date()
  };

  const diagnosis = new DiagnosticCode(diagnosisData);
  await diagnosis.save();
  console.log(`✅ Diagnosis code imported: ${data.code} - ${data.description}`);
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
  // Enhanced patient matching with AccountNo and ChiroTouch identifiers
  const patient = await Patient.findOne({
    clinicId,
    $or: [
      { recordNumber: data.patientRecordNumber },
      { chirotouchAccountNo: data.patientRecordNumber },
      { chirotouchPatientId: data.patientRecordNumber },
      { chirotouchClientId: data.patientRecordNumber }
    ]
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
    console.log('🔍 Starting ChiroTouch data processing...');
    console.log('📋 Selected datasets:', selectedDatasets);
    console.log('💾 Initial memory usage:', {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });

    // Process all 00_Tables data systematically (relational data first)
    console.log('📂 Processing 00_Tables relational data...');

    // Step 1: Process patients first (required for all other associations)
    if (selectedDatasets.patients !== false) {
      console.log('👥 Processing patients...');
      const patientFiles = structure.folders.tables.filter(f =>
        (f.fileName.toLowerCase().includes('patient') ||
         f.fileName.toLowerCase().includes('client') ||
         f.fileName.toLowerCase().includes('account')) &&
        f.fileName.endsWith('.csv')
      );

      console.log(`📄 Found ${patientFiles.length} patient files:`, patientFiles.map(f => f.fileName));

      for (const file of patientFiles) {
        try {
          const data = await parseCSVFile(file.filePath);
          let fileSuccessCount = 0;
          let fileErrorCount = 0;

          console.log(`📊 File ${file.fileName} contains ${data.length} patient records`);

          // Safety limit for very large datasets - start with test mode
          const MAX_PATIENTS_PER_IMPORT = 100; // Start with 100 patients for testing
          if (data.length > MAX_PATIENTS_PER_IMPORT) {
            console.log(`⚠️ Large dataset detected (${data.length} patients). Processing first ${MAX_PATIENTS_PER_IMPORT} patients.`);
            result.warnings.push({
              type: 'large_dataset',
              message: `Dataset contains ${data.length} patients. Only processing first ${MAX_PATIENTS_PER_IMPORT} patients to prevent server overload. Please split your data into smaller files for complete import.`,
              fileName: file.fileName,
              timestamp: new Date()
            });
            data.splice(MAX_PATIENTS_PER_IMPORT); // Trim to safe size
          }

          // Monitor memory usage
          const memBefore = process.memoryUsage();
          console.log(`💾 Memory before processing ${file.fileName}:`, {
            rss: Math.round(memBefore.rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memBefore.heapUsed / 1024 / 1024) + 'MB'
          });

          // Process data in smaller batches to avoid memory issues
          const BATCH_SIZE = 50; // Process 50 patients at a time for stability
          console.log(`📊 Processing ${data.length} patients in batches of ${BATCH_SIZE}...`);

          for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(data.length/BATCH_SIZE)} (${batch.length} patients)`);

            for (const row of batch) {
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

            // Memory cleanup and delay between batches
            if (i + BATCH_SIZE < data.length) {
              // Force garbage collection if available
              if (global.gc) {
                global.gc();
              }

              // Monitor memory usage and circuit breaker
              const memAfterBatch = process.memoryUsage();
              const memUsedMB = Math.round(memAfterBatch.heapUsed / 1024 / 1024);
              console.log(`💾 Memory after batch ${Math.floor(i/BATCH_SIZE) + 1}:`, {
                rss: Math.round(memAfterBatch.rss / 1024 / 1024) + 'MB',
                heapUsed: memUsedMB + 'MB'
              });

              // Circuit breaker: Stop if memory usage gets too high
              if (memUsedMB > 1500) { // Stop if heap usage exceeds 1.5GB
                console.log(`🚨 Memory limit reached (${memUsedMB}MB). Stopping import to prevent crash.`);
                result.warnings.push({
                  type: 'memory_limit',
                  message: `Import stopped due to high memory usage (${memUsedMB}MB). ${fileSuccessCount} patients imported successfully. Please split your data into smaller files.`,
                  fileName: file.fileName,
                  timestamp: new Date()
                });
                break; // Stop processing this file
              }

              // Longer delay between batches for stability
              await new Promise(resolve => setTimeout(resolve, 500));
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

    // Step 2: Process providers/doctors from 00_Tables
    console.log('👨‍⚕️ Processing providers/doctors...');
    const providerFiles = structure.folders.tables.filter(f =>
      (f.fileName.toLowerCase().includes('provider') ||
       f.fileName.toLowerCase().includes('doctor') ||
       f.fileName.toLowerCase().includes('physician') ||
       f.fileName.toLowerCase().includes('staff')) &&
      f.fileName.endsWith('.csv')
    );

    for (const file of providerFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        console.log(`👨‍⚕️ Processing ${data.length} providers from ${file.fileName}`);

        for (const row of data) {
          try {
            const mappedData = mapChirotouchProvider(row);
            await processProviderImport(mappedData, clinicId, createdBy);
            result.summary.successCount++;
          } catch (error) {
            result.summary.errorCount++;
            result.errors.push({
              fileName: file.fileName,
              errorMessage: error.message,
              data: row,
              timestamp: new Date()
            });
          }
        }

        result.chirotouchData.foldersProcessed.push({
          folderName: '00_Tables/Providers',
          fileCount: 1,
          processedCount: data.length
        });

      } catch (error) {
        result.warnings.push({
          type: 'missing_file',
          message: `Failed to process provider file: ${file.fileName}`,
          fileName: file.fileName,
          timestamp: new Date()
        });
      }
    }

    // Step 3: Process insurance data from 00_Tables
    console.log('🏥 Processing insurance data...');
    const insuranceFiles = structure.folders.tables.filter(f =>
      (f.fileName.toLowerCase().includes('insurance') ||
       f.fileName.toLowerCase().includes('coverage') ||
       f.fileName.toLowerCase().includes('payer')) &&
      f.fileName.endsWith('.csv')
    );

    for (const file of insuranceFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        console.log(`🏥 Processing ${data.length} insurance records from ${file.fileName}`);

        for (const row of data) {
          try {
            const mappedData = mapChirotouchInsurance(row);
            await processInsuranceImport(mappedData, clinicId, createdBy);
            result.summary.successCount++;
          } catch (error) {
            result.summary.errorCount++;
            result.errors.push({
              fileName: file.fileName,
              errorMessage: error.message,
              data: row,
              timestamp: new Date()
            });
          }
        }

      } catch (error) {
        result.warnings.push({
          type: 'missing_file',
          message: `Failed to process insurance file: ${file.fileName}`,
          fileName: file.fileName,
          timestamp: new Date()
        });
      }
    }

    // Step 4: Process diagnosis codes from 00_Tables
    console.log('🔬 Processing diagnosis codes...');
    const diagnosisFiles = structure.folders.tables.filter(f =>
      (f.fileName.toLowerCase().includes('diagnosis') ||
       f.fileName.toLowerCase().includes('icd') ||
       f.fileName.toLowerCase().includes('condition')) &&
      f.fileName.endsWith('.csv')
    );

    for (const file of diagnosisFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        console.log(`🔬 Processing ${data.length} diagnosis codes from ${file.fileName}`);

        for (const row of data) {
          try {
            const mappedData = mapChirotouchDiagnosis(row);
            await processDiagnosisImport(mappedData, clinicId, createdBy);
            result.summary.successCount++;
          } catch (error) {
            result.summary.errorCount++;
            result.errors.push({
              fileName: file.fileName,
              errorMessage: error.message,
              data: row,
              timestamp: new Date()
            });
          }
        }

      } catch (error) {
        result.warnings.push({
          type: 'missing_file',
          message: `Failed to process diagnosis file: ${file.fileName}`,
          fileName: file.fileName,
          timestamp: new Date()
        });
      }
    }

    // Step 5: Process appointments from 00_Tables if selected
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
    // Enhanced patient ID mapping with AccountNo support for consistent cross-referencing
    recordNumber: row['Patient ID'] || row['PatientID'] || row['Record Number'] || row['patient_id'] ||
                  row['AccountNo'] || row['Account No'] || row['account_no'] ||
                  row['ID'] || row['ClientID'] || row['client_id'] || '',
    notes: row['Notes'] || row['notes'] || '',
    // Store original ChiroTouch identifiers for cross-referencing
    chirotouchAccountNo: row['AccountNo'] || row['Account No'] || row['account_no'] || '',
    chirotouchPatientId: row['Patient ID'] || row['PatientID'] || row['patient_id'] || '',
    chirotouchClientId: row['ClientID'] || row['client_id'] || ''
  };
}

// Helper function to map ChiroTouch provider data to SpineLine format
function mapChirotouchProvider(row) {
  return {
    firstName: row['First Name'] || row['FirstName'] || row['first_name'] || '',
    lastName: row['Last Name'] || row['LastName'] || row['last_name'] || '',
    fullName: row['Provider Name'] || row['Doctor Name'] || row['Name'] ||
              `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
    npiNumber: row['NPI'] || row['NPI Number'] || row['npi_number'] || '',
    licenseNumber: row['License'] || row['License Number'] || row['license_number'] || '',
    specialty: row['Specialty'] || row['specialty'] || 'Chiropractic',
    phone: row['Phone'] || row['phone'] || '',
    email: row['Email'] || row['email'] || '',
    // ChiroTouch provider identifiers for cross-referencing
    chirotouchProviderId: row['Provider ID'] || row['ProviderID'] || row['provider_id'] || '',
    chirotouchDoctorId: row['Doctor ID'] || row['DoctorID'] || row['doctor_id'] || ''
  };
}

// Helper function to map ChiroTouch insurance data to SpineLine format
function mapChirotouchInsurance(row) {
  return {
    patientRecordNumber: row['Patient ID'] || row['PatientID'] || row['patient_id'] ||
                        row['AccountNo'] || row['Account No'] || row['account_no'] || '',
    insuranceProvider: row['Insurance Provider'] || row['Provider'] || row['Payer'] || '',
    policyNumber: row['Policy Number'] || row['Policy'] || row['policy_number'] || '',
    groupNumber: row['Group Number'] || row['Group'] || row['group_number'] || '',
    subscriberName: row['Subscriber Name'] || row['Subscriber'] || row['subscriber_name'] || '',
    relationship: row['Relationship'] || row['relationship'] || 'Self',
    copay: row['Copay'] || row['copay'] || '0',
    deductible: row['Deductible'] || row['deductible'] || '0',
    effectiveDate: row['Effective Date'] || row['Start Date'] || row['effective_date'] || '',
    terminationDate: row['Termination Date'] || row['End Date'] || row['termination_date'] || '',
    isPrimary: row['Primary'] || row['is_primary'] || 'true'
  };
}

// Helper function to map ChiroTouch diagnosis data to SpineLine format
function mapChirotouchDiagnosis(row) {
  return {
    code: row['ICD Code'] || row['Code'] || row['Diagnosis Code'] || row['icd_code'] || '',
    description: row['Description'] || row['Diagnosis'] || row['description'] || '',
    category: row['Category'] || row['Type'] || row['category'] || 'General',
    isActive: row['Active'] || row['is_active'] || 'true'
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
    // Enhanced patient ID mapping with AccountNo support for consistent cross-referencing
    patientRecordNumber: row['Patient ID'] || row['PatientID'] || row['patient_id'] ||
                        row['AccountNo'] || row['Account No'] || row['account_no'] ||
                        row['ClientID'] || row['client_id'] || '',
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

      // Enhanced patient matching with AccountNo and ChiroTouch identifiers
      const patient = await Patient.findOne({
        clinicId,
        $or: [
          { recordNumber: patientId },
          { chirotouchAccountNo: patientId },
          { chirotouchPatientId: patientId },
          { chirotouchClientId: patientId },
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

      // Parse SOAP data from chart note content (if it's a text-based file)
      let soapParsed = false;
      const fileExt = path.extname(fileName).toLowerCase();

      if (fileExt === '.txt' || fileExt === '.rtf') {
        try {
          const content = fs.readFileSync(file.filePath, 'utf8');
          const soapData = parseSOAPFromChartNote(content, fileName);

          // Create historical SOAP record if we extracted meaningful data
          if (soapData.subjective || soapData.objective || soapData.assessment || soapData.plan) {
            soapParsed = await createHistoricalSOAP(patient, soapData, fileName);
          }
        } catch (error) {
          console.error(`Error parsing SOAP from ${fileName}:`, error);
        }
      }

      // Add to patient's files array
      if (!patient.files) {
        patient.files = [];
      }

      patient.files.push({
        fileName: fileName,
        filePath: newFileName,
        fileType: fileExt,
        uploadedAt: new Date(),
        uploadedBy: 'ChiroTouch Import',
        category: 'Chart Notes',
        description: soapParsed ?
          'Imported from ChiroTouch export - SOAP data extracted' :
          'Imported from ChiroTouch export',
        soapParsed: soapParsed
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

// Helper function to parse SOAP data from chart note content
function parseSOAPFromChartNote(content, fileName) {
  const soapData = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    visitDate: null,
    provider: '',
    painScale: null
  };

  try {
    // Extract visit date from filename (common ChiroTouch pattern)
    const dateMatch = fileName.match(/(\d{2}_\d{2}_\d{4})/);
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/_/g, '/');
      soapData.visitDate = new Date(dateStr);
    }

    // Extract provider name from filename
    const providerMatch = fileName.match(/([A-Z][a-z]+_[A-Z][a-z]+)/);
    if (providerMatch) {
      soapData.provider = providerMatch[1].replace(/_/g, ' ');
    }

    // Parse SOAP sections from content (case-insensitive)
    const soapSections = {
      subjective: /(?:subjective|chief complaint|cc|s:)(.*?)(?=objective|assessment|plan|$)/is,
      objective: /(?:objective|examination|exam|o:)(.*?)(?=assessment|plan|$)/is,
      assessment: /(?:assessment|diagnosis|impression|a:)(.*?)(?=plan|$)/is,
      plan: /(?:plan|treatment|p:)(.*?)$/is
    };

    Object.entries(soapSections).forEach(([section, regex]) => {
      const match = content.match(regex);
      if (match && match[1]) {
        soapData[section] = match[1].trim();
      }
    });

    // Extract pain scale (0-10)
    const painMatch = content.match(/pain.*?(\d{1,2})\/10|(\d{1,2})\/10.*?pain/i);
    if (painMatch) {
      const painValue = parseInt(painMatch[1] || painMatch[2]);
      if (painValue >= 0 && painValue <= 10) {
        soapData.painScale = painValue;
      }
    }

  } catch (error) {
    console.error(`Error parsing SOAP from ${fileName}:`, error);
  }

  return soapData;
}

// Helper function to create historical SOAP record from chart note
async function createHistoricalSOAP(patient, soapData, fileName) {
  try {
    // Create a historical SOAP note entry
    const historicalSOAP = {
      visitDate: soapData.visitDate || new Date(),
      provider: soapData.provider || 'ChiroTouch Import',
      subjective: soapData.subjective,
      objective: soapData.objective,
      assessment: soapData.assessment,
      plan: soapData.plan,
      painScale: soapData.painScale,
      source: 'ChiroTouch Chart Note',
      originalFileName: fileName,
      importedAt: new Date()
    };

    // Add to patient's historical SOAP notes
    if (!patient.historicalSOAP) {
      patient.historicalSOAP = [];
    }

    patient.historicalSOAP.push(historicalSOAP);
    await patient.save();

    console.log(`📝 Created historical SOAP record for ${patient.fullName} from ${fileName}`);
    return true;

  } catch (error) {
    console.error(`Error creating historical SOAP for ${fileName}:`, error);
    return false;
  }
}

console.log('✅ ImportExport route loaded successfully');

// Export the router and helper functions
module.exports = router;
module.exports.processChirotouchFullImport = processChirotouchFullImport;
