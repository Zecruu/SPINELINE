// Reports summary endpoint
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
  isSignedOff: { type: Boolean, default: false }
}, { timestamps: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

// Patient Schema
const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
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
      provider
    } = req.query;

    // Build date query
    let dateQuery = {};
    if (startDate || endDate) {
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
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateQuery.appointmentDate = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    }

    // Build base query
    let query = {
      clinicId: user.clinicId,
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

    // Get appointments data
    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName')
      .populate('providerId', 'name')
      .lean();

    // Calculate summary statistics
    const summary = {
      // Appointment counts
      totalAppointments: appointments.length,
      scheduledAppointments: appointments.filter(apt => apt.status === 'scheduled').length,
      checkedInAppointments: appointments.filter(apt => apt.status === 'checked-in').length,
      completedAppointments: appointments.filter(apt => apt.status === 'checked-out').length,
      cancelledAppointments: appointments.filter(apt => apt.status === 'cancelled').length,
      noShowAppointments: appointments.filter(apt => apt.status === 'no-show').length,

      // Visit type breakdown
      visitTypes: {
        regular: appointments.filter(apt => apt.visitType === 'Regular').length,
        newPatient: appointments.filter(apt => apt.visitType === 'New Patient').length,
        reEvaluation: appointments.filter(apt => apt.visitType === 'Re-evaluation').length,
        followUp: appointments.filter(apt => apt.visitType === 'Follow-up').length
      },

      // Financial summary
      totalCharges: appointments.reduce((sum, apt) => {
        return sum + (apt.procedureCodes?.reduce((codeSum, code) => codeSum + (code.total || 0), 0) || 0);
      }, 0),

      // Compliance metrics
      signedOffAppointments: appointments.filter(apt => apt.isSignedOff).length,
      complianceRate: appointments.length > 0 ? 
        Math.round((appointments.filter(apt => apt.isSignedOff).length / appointments.length) * 100) : 0,

      // Unique patients
      uniquePatients: [...new Set(appointments.map(apt => apt.patientId?._id?.toString()))].length,

      // Provider breakdown
      providerStats: {}
    };

    // Calculate provider-specific stats
    const providerGroups = appointments.reduce((groups, apt) => {
      const providerId = apt.providerId?._id?.toString() || 'unassigned';
      const providerName = apt.providerId?.name || 'Unassigned';
      
      if (!groups[providerId]) {
        groups[providerId] = {
          name: providerName,
          appointments: [],
          totalCharges: 0,
          signedOff: 0
        };
      }
      
      groups[providerId].appointments.push(apt);
      groups[providerId].totalCharges += apt.procedureCodes?.reduce((sum, code) => sum + (code.total || 0), 0) || 0;
      if (apt.isSignedOff) groups[providerId].signedOff++;
      
      return groups;
    }, {});

    // Format provider stats
    Object.keys(providerGroups).forEach(providerId => {
      const stats = providerGroups[providerId];
      summary.providerStats[providerId] = {
        name: stats.name,
        totalAppointments: stats.appointments.length,
        completedAppointments: stats.appointments.filter(apt => apt.status === 'checked-out').length,
        totalCharges: stats.totalCharges,
        signedOffAppointments: stats.signedOff,
        complianceRate: stats.appointments.length > 0 ? 
          Math.round((stats.signedOff / stats.appointments.length) * 100) : 0
      };
    });

    // Daily breakdown for charts
    const dailyStats = {};
    appointments.forEach(apt => {
      const date = apt.appointmentDate.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          appointments: 0,
          completed: 0,
          charges: 0
        };
      }
      dailyStats[date].appointments++;
      if (apt.status === 'checked-out') dailyStats[date].completed++;
      dailyStats[date].charges += apt.procedureCodes?.reduce((sum, code) => sum + (code.total || 0), 0) || 0;
    });

    // Convert to array and sort by date
    const dailyBreakdown = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      summary,
      dailyBreakdown,
      filters: {
        startDate,
        endDate,
        provider
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reports summary error:', error);
    
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
