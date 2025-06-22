import { connectDB } from '../../server/config/db.js';
import { verifyToken } from '../../server/middleware/auth.js';
import multer from 'multer';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../server/uploads/imports');
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

// Helper function to extract zip file
const extractZipFile = (zipPath, extractPath) => {
  return new Promise((resolve, reject) => {
    const extractedFiles = [];
    
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      
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

// Middleware wrapper for multer
const uploadMiddleware = upload.single('importFile');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    // Verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Handle file upload
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const { type } = req.body;
    const { clinicId, userId } = user;

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
      const results = await parseCSVFile(filePath);
      
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Return preview data (first 10 rows)
      const preview = results.slice(0, 10);
      const columns = results.length > 0 ? Object.keys(results[0]) : [];

      return res.json({
        success: true,
        totalRows: results.length,
        preview: preview,
        columns: columns,
        uploadId: req.file.filename,
        data: results // Store full data for processing
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

      return res.json({
        success: true,
        totalRows: data.length,
        preview: preview,
        columns: columns,
        uploadId: req.file.filename,
        data: data // Store full data for processing
      });
      
    } else if (fileExtension === '.zip') {
      // Handle ChiroTouch ZIP export
      console.log('🗜️ Processing ChiroTouch ZIP export...');
      
      const extractPath = path.join(path.dirname(filePath), `extracted_${Date.now()}`);
      fs.mkdirSync(extractPath, { recursive: true });
      
      try {
        const extractedFiles = await extractZipFile(filePath, extractPath);
        const structure = detectChirotouchStructure(extractedFiles);
        
        if (!structure.isChirotouch) {
          // Clean up
          fs.unlinkSync(filePath);
          fs.rmSync(extractPath, { recursive: true, force: true });
          return res.status(400).json({ 
            message: 'Invalid ChiroTouch export structure. Expected folders: 00_Tables, 01_LedgerHistory, etc.' 
          });
        }
        
        // Process and preview the data
        const preview = await processChirotouchPreview(structure, extractPath);
        
        return res.json({
          success: true,
          isChirotouch: true,
          structure: structure,
          preview: preview,
          uploadId: req.file.filename,
          extractPath: extractPath // Store for later processing
        });
        
      } catch (error) {
        // Clean up on error
        fs.unlinkSync(filePath);
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
        }
        throw error;
      }
    }

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to process uploaded file' });
  }
}
