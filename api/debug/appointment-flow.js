// Debug Appointment Flow API for Vercel
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
    console.log('MongoDB connected for debug appointment flow');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  clinicId: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  visitType: { type: String, default: 'Regular Visit' },
  status: { type: String, default: 'Scheduled' },
  notes: String,
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// Patient Schema
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

    const { appointmentId } = req.query;
    const { clinicId } = user;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    console.log(`🔍 DEBUG APPOINTMENT FLOW: Loading appointment ${appointmentId} for clinic ${clinicId}`);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    // Get appointment with patient data
    const appointment = await Appointment.findOne({ 
      _id: appointmentId, 
      clinicId 
    }).populate('patientId');

    console.log(`🔍 Appointment found:`, !!appointment);
    console.log(`🔍 Patient populated:`, !!appointment?.patientId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Get patient separately to compare
    let separatePatient = null;
    if (appointment.patientId) {
      const patientId = typeof appointment.patientId === 'object' ? appointment.patientId._id : appointment.patientId;
      separatePatient = await Patient.findOne({ _id: patientId, clinicId });
    }

    const debugInfo = {
      appointmentId,
      clinicId,
      appointmentFound: !!appointment,
      patientPopulated: !!appointment?.patientId,
      separatePatientFound: !!separatePatient,
      appointment: {
        _id: appointment._id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        visitType: appointment.visitType,
        status: appointment.status,
        patientId: appointment.patientId,
        rawPatientId: appointment.patientId?._id || appointment.patientId
      },
      populatedPatient: appointment.patientId ? {
        _id: appointment.patientId._id,
        firstName: appointment.patientId.firstName,
        lastName: appointment.patientId.lastName,
        recordNumber: appointment.patientId.recordNumber,
        phone: appointment.patientId.phone,
        email: appointment.patientId.email,
        dateOfBirth: appointment.patientId.dateOfBirth,
        gender: appointment.patientId.gender
      } : null,
      separatePatient: separatePatient ? {
        _id: separatePatient._id,
        firstName: separatePatient.firstName,
        lastName: separatePatient.lastName,
        recordNumber: separatePatient.recordNumber,
        phone: separatePatient.phone,
        email: separatePatient.email,
        dateOfBirth: separatePatient.dateOfBirth,
        gender: separatePatient.gender
      } : null
    };

    console.log(`🔍 DEBUG INFO:`, debugInfo);

    res.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ DEBUG APPOINTMENT FLOW ERROR:', error);
    
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
