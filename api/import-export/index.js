import mongoose from 'mongoose';

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
      family: 4
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// JWT verification
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, process.env.JWT_SECRET || 'spineline-secret');
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    await connectDB();

    const { url, method } = req;

    // Test endpoint
    if (url === '/api/import-export' && method === 'GET') {
      return res.json({
        message: 'Import/Export API working',
        version: '9.0.0',
        timestamp: new Date().toISOString(),
        user: {
          clinicId: user.clinicId,
          role: user.role
        }
      });
    }

    // Export templates endpoint
    if (url.includes('/api/import-export') && method === 'GET' && req.query.template) {
      const { template } = req.query;
      
      let headers = [];
      let sampleData = [];
      let filename = '';

      switch (template) {
        case 'patients':
          headers = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'state', 'zipCode'];
          sampleData = [{
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@email.com',
            phone: '555-0123',
            dateOfBirth: '1985-06-15',
            address: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345'
          }];
          filename = 'patient-import-template';
          break;
        case 'appointments':
          headers = ['patientRecordNumber', 'appointmentDate', 'appointmentTime', 'visitType', 'providerName', 'status'];
          sampleData = [{
            patientRecordNumber: 'P001',
            appointmentDate: '2025-01-15',
            appointmentTime: '10:00 AM',
            visitType: 'Regular Visit',
            providerName: 'Dr. Smith',
            status: 'Scheduled'
          }];
          filename = 'appointment-import-template';
          break;
        case 'service-codes':
          headers = ['code', 'description', 'rate', 'category', 'isActive'];
          sampleData = [{
            code: '98941',
            description: 'Chiropractic manipulative treatment',
            rate: '75.00',
            category: 'Treatment',
            isActive: 'true'
          }];
          filename = 'service-codes-import-template';
          break;
        case 'diagnostic-codes':
          headers = ['code', 'description', 'category', 'isActive'];
          sampleData = [{
            code: 'M54.5',
            description: 'Low back pain',
            category: 'Musculoskeletal',
            isActive: 'true'
          }];
          filename = 'diagnostic-codes-import-template';
          break;
        case 'chirotouch-full':
          // Return a guide instead of CSV
          const guideContent = `ChiroTouch Export Structure Guide

Required ZIP file structure:
/00_Tables/
  - Patients.csv (patient demographics)
  - Appointments.csv (appointment data)
  - Providers.csv (doctor information)

/01_LedgerHistory/
  - LedgerHistory.csv (billing records)
  - Payments.csv (payment records)

/02_ScannedDocs/
  - Patient documents and images
  - Organized by patient ID folders

/03_ChartNotes/
  - SOAP notes and clinical documentation
  - PDF files with patient visit notes

Instructions:
1. Export your data from ChiroTouch using their export function
2. Ensure the ZIP file contains the above folder structure
3. Upload the entire ZIP file using the drag-and-drop area
4. The system will automatically detect and process all data types

Supported file types in ZIP:
- CSV files for patient and appointment data
- PDF files for documents and chart notes`;

          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Disposition', 'attachment; filename="chirotouch-export-guide.txt"');
          return res.send(guideContent);
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid template type'
          });
      }

      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...sampleData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvContent);
    }

    // Default response
    return res.status(404).json({
      message: 'Import/Export endpoint not found',
      url: url,
      method: method
    });

  } catch (error) {
    console.error('Import/Export API Error:', error);

    if (error.message === 'No token provided') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
}

export default handler;
