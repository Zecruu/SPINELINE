const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const yauzl = require('yauzl');

// Import models
const Patient = require('../../server/models/Patient');
const Appointment = require('../../server/models/Appointment');
const ImportHistory = require('../../server/models/ImportHistory');

// Database connection
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

// Verify JWT token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded;
};

// Helper function to parse CSV file
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Helper function to map ChiroTouch patient data
const mapChirotouchPatient = (row) => {
  return {
    firstName: row['First Name'] || row['FirstName'] || '',
    lastName: row['Last Name'] || row['LastName'] || '',
    email: row['Email'] || row['EmailAddress'] || '',
    phone: row['Phone'] || row['PhoneNumber'] || '',
    dateOfBirth: row['DOB'] || row['DateOfBirth'] || '',
    address: {
      street: row['Address'] || row['Street'] || '',
      city: row['City'] || '',
      state: row['State'] || '',
      zipCode: row['Zip'] || row['ZipCode'] || ''
    },
    insurance: {
      primary: {
        company: row['Insurance'] || row['InsuranceCompany'] || '',
        policyNumber: row['PolicyNumber'] || ''
      }
    }
  };
};

// Helper function to process patient import
const processPatientImport = async (patientData, clinicId, createdBy) => {
  // Check for existing patient
  const existingPatient = await Patient.findOne({
    clinicId,
    $or: [
      { email: patientData.email },
      {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        'personalInfo.dateOfBirth': patientData.dateOfBirth
      }
    ]
  });

  if (existingPatient) {
    throw new Error(`Patient already exists: ${patientData.firstName} ${patientData.lastName}`);
  }

  // Create new patient
  const patient = new Patient({
    clinicId,
    firstName: patientData.firstName,
    lastName: patientData.lastName,
    email: patientData.email,
    phone: patientData.phone,
    personalInfo: {
      dateOfBirth: patientData.dateOfBirth
    },
    address: patientData.address,
    insurance: patientData.insurance,
    createdBy,
    isActive: true
  });

  await patient.save();
  return patient;
};

// Main process function
const processChirotouchImport = async (structure, extractPath, clinicId, createdBy, selectedDatasets) => {
  const result = {
    summary: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      duplicateCount: 0
    },
    errors: [],
    duplicates: []
  };

  // Process patients if selected
  if (selectedDatasets.patients !== false) {
    console.log('Processing patients...');
    const patientFiles = structure.folders.tables.filter(f =>
      f.fileName.toLowerCase().includes('patient') && f.fileName.endsWith('.csv')
    );

    for (const file of patientFiles) {
      try {
        const data = await parseCSVFile(file.filePath);
        
        for (const row of data) {
          try {
            const mappedData = mapChirotouchPatient(row);
            await processPatientImport(mappedData, clinicId, createdBy);
            result.summary.successCount++;
          } catch (error) {
            result.summary.errorCount++;
            result.errors.push({
              fileName: file.fileName,
              errorMessage: error.message,
              data: row
            });
          }
        }
        
        result.summary.totalProcessed += data.length;
      } catch (error) {
        console.error('Error processing patient file:', error);
      }
    }
  }

  return result;
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    await connectDB();

    const { 
      type, 
      isChirotouch, 
      structure, 
      extractPath, 
      selectedDatasets,
      originalFileName,
      fileSize 
    } = req.body;

    console.log(`Processing import: type=${type}, clinic=${user.clinicId}`);

    // Create import history record
    const importHistory = new ImportHistory({
      clinicId: user.clinicId,
      importType: type,
      importSource: isChirotouch ? 'ChiroTouch Export' : 'Manual Upload',
      originalFileName: originalFileName || 'unknown',
      fileSize: fileSize || 0,
      fileType: isChirotouch ? 'zip' : 'csv',
      importedBy: user.name,
      importedByUserId: user.userId,
      status: 'processing',
      processingStarted: new Date()
    });

    let result;

    if (isChirotouch && type === 'chirotouch-full') {
      // Process ChiroTouch import
      result = await processChirotouchImport(
        structure, 
        extractPath, 
        user.clinicId, 
        user.name, 
        selectedDatasets
      );
    } else {
      // Handle other import types
      result = {
        summary: { totalProcessed: 0, successCount: 0, errorCount: 0 },
        errors: [],
        duplicates: []
      };
    }

    // Update import history
    importHistory.summary = result.summary;
    importHistory.errors = result.errors;
    importHistory.duplicates = result.duplicates;
    importHistory.status = 'completed';
    importHistory.processingCompleted = new Date();
    importHistory.processingDuration = Date.now() - importHistory.processingStarted.getTime();

    await importHistory.save();

    // Clean up extracted files
    if (extractPath && fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }

    res.json({
      success: true,
      message: 'Import completed successfully',
      result: result,
      importHistoryId: importHistory._id
    });

  } catch (error) {
    console.error('Import processing error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Import processing failed',
      error: error.message
    });
  }
}
