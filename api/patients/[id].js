// Individual patient endpoint for Vercel
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log('MongoDB connected for patient endpoint');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Patient Schema
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  recordNumber: { type: String },
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
  alerts: [{
    type: { type: String, enum: ['warning', 'info', 'urgent'] },
    message: { type: String },
    isVisible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
  }],
  files: [{
    fileName: { type: String },
    filePath: { type: String },
    fileType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }
  }],
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  doctorNotes: { type: String }
}, { timestamps: true });

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

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

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get single patient
      console.log(`🩺 VERCEL PATIENT ENDPOINT: Loading patient ${id} for clinic ${user.clinicId}`);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid patient ID format'
        });
      }

      const patient = await Patient.findOne({ 
        _id: id, 
        clinicId: user.clinicId 
      });

      if (!patient) {
        console.log(`❌ Patient ${id} not found in clinic ${user.clinicId}`);
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      console.log(`✅ Patient found: ${patient.firstName} ${patient.lastName}`);
      console.log(`  - DOB: ${patient.dateOfBirth}`);
      console.log(`  - Gender: ${patient.gender}`);
      console.log(`  - Phone: ${patient.phone}`);
      console.log(`  - Email: ${patient.email}`);

      // Add computed fields
      const patientData = {
        ...patient.toObject(),
        fullName: patient.fullName,
        age: patient.age
      };

      res.json({
        success: true,
        patient: patientData
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Patient endpoint error:', error);
    
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
