// Audit records endpoint
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

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

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
      date,
      startDate, 
      endDate, 
      provider,
      page = 1,
      limit = 100
    } = req.query;

    // Build date query
    let dateQuery = {};
    if (date) {
      // Single date
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      dateQuery = {
        appointmentDate: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      };
    } else if (startDate || endDate) {
      // Date range
      dateQuery.appointmentDate = {};
      if (startDate) {
        dateQuery.appointmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.appointmentDate.$lte = end;
      }
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateQuery.appointmentDate = { $gte: thirtyDaysAgo };
    }

    // Build query
    let query = {
      clinicId: user.clinicId,
      status: { $in: ['checked-out', 'cancelled', 'no-show'] }, // Only completed appointments
      ...dateQuery
    };

    // Provider filter
    if (provider && provider !== 'all') {
      query.providerId = provider;
    }

    // If user is a doctor, filter by their assignments
    if (user.role === 'doctor') {
      query.providerId = user.userId;
    }

    // Get audit records (completed appointments)
    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone dateOfBirth')
      .populate('providerId', 'name')
      .populate('signedOffBy', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Appointment.countDocuments(query);

    // Format audit records
    const auditRecords = appointments.map(appointment => ({
      id: appointment._id,
      recordId: appointment._id.toString().slice(-8).toUpperCase(),
      patientId: appointment.patientId._id,
      patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
      patientEmail: appointment.patientId.email,
      patientPhone: appointment.patientId.phone,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      visitType: appointment.visitType,
      status: appointment.status,
      provider: appointment.providerId?.name || 'Unassigned',
      providerId: appointment.providerId?._id,
      
      // Clinical data
      soapNotes: appointment.soapNotes,
      procedureCodes: appointment.procedureCodes || [],
      diagnosticCodes: appointment.diagnosticCodes || [],
      
      // Billing summary
      totalCharges: appointment.procedureCodes?.reduce((sum, code) => sum + (code.total || 0), 0) || 0,
      
      // Compliance
      isSignedOff: appointment.isSignedOff,
      signedOffBy: appointment.signedOffBy?.name,
      signedOffAt: appointment.signedOffAt,
      
      // Audit trail
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      
      // Compliance flags
      hasSOAP: !!(appointment.soapNotes?.subjective || appointment.soapNotes?.objective || 
                  appointment.soapNotes?.assessment || appointment.soapNotes?.plan),
      hasProcedureCodes: (appointment.procedureCodes?.length || 0) > 0,
      hasDiagnosticCodes: (appointment.diagnosticCodes?.length || 0) > 0,
      isCompliant: appointment.isSignedOff && 
                   !!(appointment.soapNotes?.subjective || appointment.soapNotes?.objective || 
                      appointment.soapNotes?.assessment || appointment.soapNotes?.plan)
    }));

    // Calculate summary statistics
    const summary = {
      totalRecords: total,
      compliantRecords: auditRecords.filter(r => r.isCompliant).length,
      signedRecords: auditRecords.filter(r => r.isSignedOff).length,
      recordsWithSOAP: auditRecords.filter(r => r.hasSOAP).length,
      recordsWithProcedures: auditRecords.filter(r => r.hasProcedureCodes).length,
      recordsWithDiagnoses: auditRecords.filter(r => r.hasDiagnosticCodes).length,
      totalCharges: auditRecords.reduce((sum, r) => sum + r.totalCharges, 0),
      complianceRate: total > 0 ? Math.round((auditRecords.filter(r => r.isCompliant).length / auditRecords.length) * 100) : 0
    };

    res.json({
      success: true,
      records: auditRecords,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        date,
        startDate,
        endDate,
        provider
      }
    });

  } catch (error) {
    console.error('Audit records error:', error);
    
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
