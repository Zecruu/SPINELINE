// Debug Patient Check API for Vercel
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0';

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('🔍 Connecting to MongoDB for patient debug...');

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
    console.log('✅ MongoDB Connected Successfully for patient debug!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed for patient debug:', error.message);
    isConnected = false;
    throw error;
  }
};

// Verify token and get user info
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  return decoded;
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    const { patientId } = req.query;
    const { clinicId } = user;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    console.log(`🔍 DEBUG PATIENT CHECK: Looking for patient ${patientId} in clinic ${clinicId}`);

    // Check if patient exists in any clinic
    const db = mongoose.connection.db;
    
    // Find patient by ID regardless of clinic
    const allPatients = await db.collection('patients').find({ 
      _id: new mongoose.Types.ObjectId(patientId) 
    }).toArray();

    // Find patient in specific clinic
    const clinicPatient = await db.collection('patients').findOne({ 
      _id: new mongoose.Types.ObjectId(patientId),
      clinicId: clinicId
    });

    // Find all patients in this clinic
    const allClinicPatients = await db.collection('patients').find({ 
      clinicId: clinicId 
    }).limit(10).toArray();

    const debugInfo = {
      searchedPatientId: patientId,
      userClinicId: clinicId,
      patientExistsAnywhere: allPatients.length > 0,
      patientInUserClinic: !!clinicPatient,
      allPatientsFound: allPatients.map(p => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        clinicId: p.clinicId,
        isActive: p.isActive
      })),
      clinicPatient: clinicPatient ? {
        _id: clinicPatient._id,
        firstName: clinicPatient.firstName,
        lastName: clinicPatient.lastName,
        clinicId: clinicPatient.clinicId,
        isActive: clinicPatient.isActive,
        recordNumber: clinicPatient.recordNumber,
        phone: clinicPatient.phone,
        email: clinicPatient.email,
        dateOfBirth: clinicPatient.dateOfBirth,
        gender: clinicPatient.gender
      } : null,
      sampleClinicPatients: allClinicPatients.map(p => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        recordNumber: p.recordNumber
      }))
    };

    console.log(`🔍 DEBUG RESULTS:`, debugInfo);

    res.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ DEBUG PATIENT CHECK ERROR:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
