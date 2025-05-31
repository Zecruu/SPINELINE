// Appointment status update endpoint
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
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required']
  },
  duration: {
    type: Number,
    default: 30
  },
  visitType: {
    type: String,
    required: [true, 'Visit type is required'],
    enum: [
      'New Patient',
      'Re-evaluation', 
      'Regular Visit',
      'Initial Consultation',
      'Follow-Up',
      'Treatment',
      'Maintenance',
      'Emergency',
      'Consultation',
      'Other'
    ],
    default: 'Regular Visit'
  },
  colorTag: {
    type: String,
    enum: ['green', 'yellow', 'blue', 'white', 'red'],
    default: 'green'
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked-In', 'In Treatment', 'Checked-Out', 'In Progress', 'Completed', 'No-Show', 'Cancelled'],
    default: 'Scheduled'
  },
  cancellationReason: {
    type: String
  },
  rescheduleReason: {
    type: String
  },
  actionTaken: {
    type: String
  },
  notifyPatient: {
    type: Boolean,
    default: false
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: String,
    required: [true, 'Creator is required']
  },
  updatedBy: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token and get user info
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    if (req.method === 'PATCH') {
      // Update appointment status
      const { id } = req.query;
      const { status, cancellationReason, rescheduleReason, actionTaken, notifyPatient } = req.body;
      const clinicId = user.clinicId;
      const updatedBy = user.name || user.email;

      console.log(`🔄 Updating appointment ${id} status to: ${status}`);

      const validStatuses = ['Scheduled', 'Checked-In', 'In Progress', 'Completed', 'No-Show', 'Cancelled', 'Checked-Out', 'In Treatment'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      // Find appointment
      const appointment = await Appointment.findOne({ _id: id, clinicId });
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Prepare update data
      const updateData = {
        status,
        updatedBy,
        updatedAt: new Date()
      };

      // Add optional fields if provided
      if (cancellationReason) updateData.cancellationReason = cancellationReason;
      if (rescheduleReason) updateData.rescheduleReason = rescheduleReason;
      if (actionTaken) updateData.actionTaken = actionTaken;
      if (notifyPatient !== undefined) updateData.notifyPatient = notifyPatient;

      // Update appointment
      const updatedAppointment = await Appointment.findOneAndUpdate(
        { _id: id, clinicId },
        updateData,
        { new: true, runValidators: true }
      );

      console.log(`✅ Appointment ${id} status updated to: ${status}`);

      res.json({
        success: true,
        message: 'Appointment status updated successfully',
        appointment: updatedAppointment
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Appointment status update error:', error);
    
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
