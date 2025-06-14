const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { verifyToken } = require('../middleware/auth');
const Patient = require('../models/Patient');

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
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Simple Import API working', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Upload and preview file
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📤 File upload received:', req.file?.originalname);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let data = [];

    // Parse file based on extension
    if (fileExtension === '.csv') {
      data = await parseCSV(filePath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      data = await parseExcel(filePath);
    } else if (fileExtension === '.zip') {
      data = await parseChiroTouchZip(filePath);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Return preview (first 5 rows)
    const preview = data.slice(0, 5);
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    // Check if this is a ChiroTouch import
    const isChirotouch = fileExtension === '.zip';

    if (isChirotouch) {
      // Format response for ChiroTouch imports
      res.json({
        success: true,
        isChirotouch: true,
        totalRows: data.length,
        data: data, // Full data for ChiroTouch
        preview: {
          summary: {
            totalPatients: data.length,
            totalAppointments: 0,
            totalLedgerRecords: 0
          },
          patients: preview
        },
        structure: {
          patients: { found: true, count: data.length },
          appointments: { found: false, count: 0 },
          ledger: { found: false, count: 0 }
        },
        columns: columns,
        message: `ChiroTouch export processed: ${data.length} patients found`
      });
    } else {
      // Format response for regular CSV/Excel imports
      res.json({
        success: true,
        isChirotouch: false,
        totalRows: data.length,
        data: data,
        preview: preview,
        columns: columns,
        message: `Successfully parsed ${data.length} rows`
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to process file',
      error: error.message 
    });
  }
});

// Import patients
router.post('/import-patients', verifyToken, async (req, res) => {
  try {
    const { data, columnMapping } = req.body;
    const { clinicId, name: userName } = req.user;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    let successCount = 0;
    let errorCount = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Map columns to patient fields
        const patientData = {
          clinicId,
          firstName: row[columnMapping.firstName] || '',
          lastName: row[columnMapping.lastName] || '',
          phone: row[columnMapping.phone] || '',
          email: row[columnMapping.email] || '',
          status: 'Active',
          createdBy: userName,
          imported: true,
          importedAt: new Date()
        };

        // Add optional fields if mapped
        if (columnMapping.dateOfBirth && row[columnMapping.dateOfBirth]) {
          patientData.dateOfBirth = new Date(row[columnMapping.dateOfBirth]);
        }
        if (columnMapping.gender && row[columnMapping.gender]) {
          patientData.gender = row[columnMapping.gender];
        }
        if (columnMapping.recordNumber && row[columnMapping.recordNumber]) {
          patientData.recordNumber = row[columnMapping.recordNumber];
        }

        // Create patient
        const patient = new Patient(patientData);
        await patient.save();
        successCount++;

      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          error: error.message,
          data: row
        });
      }
    }

    res.json({
      success: true,
      summary: {
        totalProcessed: data.length,
        successCount,
        errorCount
      },
      errors: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Failed to import patients',
      error: error.message 
    });
  }
});

// Helper function to parse CSV
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to parse Excel
function parseExcel(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to parse ChiroTouch ZIP
function parseChiroTouchZip(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();

      // Look for patient data in 00_Tables folder
      const patientEntry = zipEntries.find(entry =>
        entry.entryName.includes('00_Tables') &&
        entry.entryName.toLowerCase().includes('patient')
      );

      if (patientEntry) {
        // Extract and parse patient CSV
        const csvContent = patientEntry.getData().toString('utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }

        resolve(data);
      } else {
        reject(new Error('No patient data found in ChiroTouch export'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = router;
