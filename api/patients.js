// Patients endpoint
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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

// Patient Schema
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'USA' }
  },
  emergencyContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String }
  },
  insurance: {
    provider: { type: String },
    policyNumber: { type: String },
    groupNumber: { type: String },
    copay: { type: Number }
  },
  medicalHistory: {
    allergies: [{ type: String }],
    medications: [{ type: String }],
    conditions: [{ type: String }],
    surgeries: [{ type: String }]
  },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String }
}, { timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

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

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token and get user info
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    if (req.method === 'GET') {
      // Get query parameters
      const { 
        search = '', 
        status = 'all',
        page = 1,
        limit = 50
      } = req.query;

      // Build query
      let query = {
        clinicId: user.clinicId
      };

      // Status filter
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      // Search filter
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }

      // Get patients with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const patients = await Patient.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get total count for pagination
      const total = await Patient.countDocuments(query);

      // Format patients for frontend
      const formattedPatients = patients.map(patient => ({
        id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        insurance: patient.insurance,
        medicalHistory: patient.medicalHistory,
        isActive: patient.isActive,
        notes: patient.notes,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }));

      res.json({
        success: true,
        patients: formattedPatients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          search,
          status
        }
      });

    } else if (req.method === 'POST') {
      // Create new patient
      const patientData = req.body;
      
      // Add clinic ID
      patientData.clinicId = user.clinicId;

      // Validate required fields
      if (!patientData.firstName || !patientData.lastName) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      // Check for duplicate email if provided
      if (patientData.email) {
        const existingPatient = await Patient.findOne({
          email: patientData.email.toLowerCase(),
          clinicId: user.clinicId
        });

        if (existingPatient) {
          return res.status(400).json({
            success: false,
            message: 'A patient with this email already exists'
          });
        }
      }

      // Create patient
      const patient = new Patient(patientData);
      await patient.save();

      res.json({
        success: true,
        message: 'Patient created successfully',
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          isActive: patient.isActive
        }
      });

    } else if (req.method === 'PUT') {
      // Update patient
      const { patientId } = req.query;
      const updateData = req.body;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
      }

      // Find and update patient
      const patient = await Patient.findOneAndUpdate(
        { 
          _id: patientId, 
          clinicId: user.clinicId 
        },
        updateData,
        { new: true }
      );

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      res.json({
        success: true,
        message: 'Patient updated successfully',
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          isActive: patient.isActive
        }
      });

    } else if (req.method === 'DELETE') {
      // Delete patient (soft delete)
      const { patientId } = req.query;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required'
        });
      }

      // Soft delete by setting isActive to false
      const patient = await Patient.findOneAndUpdate(
        { 
          _id: patientId, 
          clinicId: user.clinicId 
        },
        { isActive: false },
        { new: true }
      );

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      res.json({
        success: true,
        message: 'Patient deactivated successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Patients error:', error);
    
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
