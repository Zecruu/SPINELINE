// Ledger patients endpoint
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
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  insurance: {
    provider: { type: String },
    policyNumber: { type: String },
    groupNumber: { type: String },
    copay: { type: Number }
  }
}, { timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

// Appointment Schema for billing data
const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  clinicId: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'checked-in', 'checked-out', 'cancelled', 'no-show'], default: 'scheduled' },
  procedureCodes: [{
    code: { type: String },
    description: { type: String },
    units: { type: Number, default: 1 },
    rate: { type: Number },
    total: { type: Number }
  }]
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

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
      search = '',
      status = 'all',
      page = 1,
      limit = 50
    } = req.query;

    // Build patient query
    let patientQuery = {
      clinicId: user.clinicId
    };

    // Status filter
    if (status === 'active') {
      patientQuery.isActive = true;
    } else if (status === 'inactive') {
      patientQuery.isActive = false;
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      patientQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Get patients with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const patients = await Patient.find(patientQuery)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Patient.countDocuments(patientQuery);

    // Get billing data for each patient
    const patientsWithBilling = await Promise.all(
      patients.map(async (patient) => {
        // Get completed appointments for billing calculations
        const appointments = await Appointment.find({
          patientId: patient._id,
          clinicId: user.clinicId,
          status: 'checked-out'
        }).lean();

        // Calculate billing totals
        const totalCharges = appointments.reduce((sum, apt) => {
          return sum + (apt.procedureCodes?.reduce((codeSum, code) => codeSum + (code.total || 0), 0) || 0);
        }, 0);

        const totalVisits = appointments.length;
        const lastVisit = appointments.length > 0 ? 
          appointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))[0].appointmentDate : null;

        // Calculate outstanding balance (simplified - in real system would include payments)
        const outstandingBalance = totalCharges; // Assuming no payments for now

        return {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          isActive: patient.isActive,
          
          // Insurance info
          insurance: patient.insurance || {},
          
          // Billing summary
          billing: {
            totalCharges,
            outstandingBalance,
            totalVisits,
            lastVisit,
            averageVisitCharge: totalVisits > 0 ? Math.round(totalCharges / totalVisits * 100) / 100 : 0
          },
          
          // Account status
          accountStatus: outstandingBalance > 0 ? 'Outstanding' : 'Current',
          
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      totalPatients: total,
      activePatients: patientsWithBilling.filter(p => p.isActive).length,
      totalOutstanding: patientsWithBilling.reduce((sum, p) => sum + p.billing.outstandingBalance, 0),
      totalCharges: patientsWithBilling.reduce((sum, p) => sum + p.billing.totalCharges, 0),
      averageBalance: patientsWithBilling.length > 0 ? 
        Math.round(patientsWithBilling.reduce((sum, p) => sum + p.billing.outstandingBalance, 0) / patientsWithBilling.length * 100) / 100 : 0,
      patientsWithBalance: patientsWithBilling.filter(p => p.billing.outstandingBalance > 0).length
    };

    res.json({
      success: true,
      patients: patientsWithBilling,
      summary,
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

  } catch (error) {
    console.error('Ledger patients error:', error);
    
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
