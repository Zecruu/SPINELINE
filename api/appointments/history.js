// Appointment history endpoint
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

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  clinicId: { type: String, required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  duration: { type: Number, default: 30 },
  visitType: { type: String, enum: ['Regular', 'New Patient', 'Re-evaluation', 'Follow-up'], default: 'Regular' },
  status: { type: String, enum: ['scheduled', 'checked-in', 'checked-out', 'cancelled', 'no-show'], default: 'scheduled' },
  notes: { type: String },
  soapNotes: {
    subjective: { type: String },
    objective: { type: String },
    assessment: { type: String },
    plan: { type: String },
    painScale: { type: Number, min: 0, max: 10 }
  },
  procedureCodes: [{
    code: { type: String },
    description: { type: String },
    units: { type: Number, default: 1 },
    rate: { type: Number },
    total: { type: Number }
  }],
  diagnosticCodes: [{
    code: { type: String },
    description: { type: String }
  }],
  isSignedOff: { type: Boolean, default: false },
  signedOffBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signedOffAt: { type: Date }
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// Patient Schema
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  dateOfBirth: { type: Date },
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

module.exports = async function handler(req, res) {
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
    // Verify token and get user info
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    // Get query parameters
    const { 
      startDate, 
      endDate, 
      patientName, 
      status, 
      provider,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    let query = {
      clinicId: user.clinicId
    };

    // Date range filter
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) {
        query.appointmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.appointmentDate.$lte = end;
      }
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Provider filter
    if (provider && provider !== 'all') {
      query.providerId = provider;
    }

    // If user is a doctor, filter by their assignments
    if (user.role === 'doctor') {
      query.providerId = user.userId;
    }

    // Get appointments with patient details
    let appointmentsQuery = Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone dateOfBirth')
      .populate('providerId', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    // Patient name filter (after populate)
    const appointments = await appointmentsQuery.lean();
    
    let filteredAppointments = appointments;
    if (patientName) {
      const searchTerm = patientName.toLowerCase();
      filteredAppointments = appointments.filter(appointment => {
        const fullName = `${appointment.patientId.firstName} ${appointment.patientId.lastName}`.toLowerCase();
        return fullName.includes(searchTerm);
      });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAppointments = filteredAppointments.slice(skip, skip + parseInt(limit));

    // Format appointments for frontend
    const formattedAppointments = paginatedAppointments.map(appointment => ({
      id: appointment._id,
      patientId: appointment.patientId._id,
      patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
      patientEmail: appointment.patientId.email,
      patientPhone: appointment.patientId.phone,
      patientDOB: appointment.patientId.dateOfBirth,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      visitType: appointment.visitType,
      status: appointment.status,
      provider: appointment.providerId?.name || 'Unassigned',
      providerId: appointment.providerId?._id,
      notes: appointment.notes,
      soapNotes: appointment.soapNotes,
      procedureCodes: appointment.procedureCodes || [],
      diagnosticCodes: appointment.diagnosticCodes || [],
      isSignedOff: appointment.isSignedOff,
      signedOffBy: appointment.signedOffBy,
      signedOffAt: appointment.signedOffAt,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    }));

    res.json({
      success: true,
      appointments: formattedAppointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAppointments.length,
        pages: Math.ceil(filteredAppointments.length / parseInt(limit))
      },
      filters: {
        startDate,
        endDate,
        patientName,
        status,
        provider
      }
    });

  } catch (error) {
    console.error('Appointment history error:', error);
    
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
