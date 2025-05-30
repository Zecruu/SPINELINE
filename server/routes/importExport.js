const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const ServiceCode = require('../models/ServiceCode');
const Checkout = require('../models/Checkout');
const User = require('../models/User');

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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
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
        headers = ['code', 'description', 'category'];
        sampleData = [{
          code: 'M54.5',
          description: 'Low back pain',
          category: 'Musculoskeletal'
        }];
        filename = 'icd-codes-import-template';
        break;
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

// Upload and process import file
router.post('/upload', verifyToken, upload.single('importFile'), async (req, res) => {
  try {
    const { type } = req.body;
    const { clinicId, userId } = req.user;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(`📤 Processing import file: ${req.file.originalname}, type: ${type}`);

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    let data = [];

    // Parse file based on extension
    if (fileExtension === '.csv') {
      // Parse CSV synchronously
      return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', () => {
            // Clean up uploaded file
            fs.unlinkSync(filePath);

            // Return preview data (first 10 rows)
            const preview = results.slice(0, 10);
            const columns = results.length > 0 ? Object.keys(results[0]) : [];

            res.json({
              success: true,
              totalRows: results.length,
              preview: preview,
              columns: columns,
              uploadId: req.file.filename,
              data: results // Store full data for processing
            });
            resolve();
          })
          .on('error', (error) => {
            fs.unlinkSync(filePath);
            reject(error);
          });
      });
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Parse Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Return preview data (first 10 rows)
      const preview = data.slice(0, 10);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      res.json({
        success: true,
        totalRows: data.length,
        preview: preview,
        columns: columns,
        uploadId: req.file.filename,
        data: data // Store full data for processing
      });
    }

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to process uploaded file' });
  }
});

// Process import data
router.post('/process', verifyToken, async (req, res) => {
  try {
    const { type, data, columnMapping } = req.body;
    const { clinicId, userId, name: userName } = req.user;

    console.log(`🔄 Processing import: type=${type}, records=${data.length}, clinic=${clinicId}`);

    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    let duplicates = [];

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

module.exports = router;
