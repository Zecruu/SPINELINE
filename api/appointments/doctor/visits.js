// Doctor Visits API for Vercel
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
    console.log('MongoDB connected for doctor visits');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Appointment Schema (simplified for visits)
const appointmentSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 30
  },
  visitType: {
    type: String,
    enum: ['New Patient', 'Follow-up', 'Re-evaluation', 'Consultation', 'Emergency'],
    default: 'Follow-up'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked-In', 'In Progress', 'Completed', 'Cancelled', 'No-Show', 'Checked-Out'],
    default: 'Scheduled'
  },
  notes: String,
  chiefComplaint: String,
  soapNotes: {
    subjective: String,
    objective: String,
    assessment: String,
    plan: String,
    painScale: Number,
    createdBy: String,
    createdAt: Date
  },
  procedureCodes: [{
    code: String,
    description: String,
    units: { type: Number, default: 1 },
    rate: Number,
    total: Number
  }],
  diagnosticCodes: [{
    code: String,
    description: String,
    category: String
  }],
  physicalExam: mongoose.Schema.Types.Mixed,
  doctorSignature: String,
  patientSignature: String,
  checkoutData: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true 
});

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// Patient Schema (simplified for population)
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  recordNumber: { type: String },
  email: { type: String },
  phone: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true }
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

    const { userId, clinicId, role } = user;

    // Only doctors can access their visits
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    console.log(`🔍 VERCEL DOCTOR VISITS: Getting visits for doctor: ${userId} in clinic: ${clinicId}`);

    // Use MongoDB native aggregation for better performance
    const db = mongoose.connection.db;

    // Get all appointments for this doctor with patient data
    const visits = await db.collection('appointments').aggregate([
      {
        $match: {
          clinicId: clinicId,
          // For now, get all clinic appointments since assignedDoctor might not be properly set
          // TODO: Filter by assignedDoctor once that field is properly populated
          // assignedDoctor: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedDoctor',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: { path: '$patient', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          patientName: { 
            $concat: [
              { $ifNull: ['$patient.firstName', 'Unknown'] },
              ' ',
              { $ifNull: ['$patient.lastName', 'Patient'] }
            ]
          },
          doctorName: { $ifNull: ['$doctor.name', 'Unknown Doctor'] }
        }
      },
      {
        $sort: { appointmentDate: -1, appointmentTime: -1 }
      },
      {
        $limit: 100 // Limit to last 100 visits for performance
      }
    ]).toArray();

    console.log(`🔍 VERCEL DOCTOR VISITS: Found ${visits.length} visits`);

    // Format visits for frontend
    const formattedVisits = visits.map(visit => ({
      _id: visit._id,
      appointmentDate: visit.appointmentDate,
      appointmentTime: visit.appointmentTime,
      visitType: visit.visitType || 'Follow-up',
      status: visit.status || 'Scheduled',
      duration: visit.duration || 30,
      notes: visit.notes || '',
      chiefComplaint: visit.chiefComplaint || '',
      soapNotes: visit.soapNotes || null,
      procedureCodes: visit.procedureCodes || [],
      diagnosticCodes: visit.diagnosticCodes || [],
      physicalExam: visit.physicalExam || null,
      doctorSignature: visit.doctorSignature || null,
      patientSignature: visit.patientSignature || null,
      checkoutData: visit.checkoutData || null,
      patient: visit.patient ? {
        _id: visit.patient._id,
        firstName: visit.patient.firstName,
        lastName: visit.patient.lastName,
        fullName: `${visit.patient.firstName} ${visit.patient.lastName}`,
        recordNumber: visit.patient.recordNumber,
        phone: visit.patient.phone,
        email: visit.patient.email,
        dateOfBirth: visit.patient.dateOfBirth,
        gender: visit.patient.gender
      } : null,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt
    }));

    res.json({
      success: true,
      visits: formattedVisits
    });

  } catch (error) {
    console.error('❌ VERCEL DOCTOR VISITS ERROR:', error);
    
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
