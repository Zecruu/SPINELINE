// Individual appointment endpoint for update/reschedule
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
  }
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

    if (req.method === 'PUT') {
      // Update/reschedule appointment
      const { id } = req.query;
      const clinicId = user.clinicId;
      const updatedBy = user.name || user.email;

      console.log(`🔄 Updating appointment ${id}`);

      // Get current appointment for validation
      const currentAppointment = await Appointment.findOne({ _id: id, clinicId });
      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Prepare update data
      const updateData = {
        ...req.body,
        updatedBy,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated
      delete updateData.clinicId;
      delete updateData.createdBy;
      delete updateData.createdAt;

      // Ensure appointmentDate is properly formatted
      if (updateData.appointmentDate) {
        updateData.appointmentDate = new Date(updateData.appointmentDate);
      }

      // Update appointment
      const updatedAppointment = await Appointment.findOneAndUpdate(
        { _id: id, clinicId },
        updateData,
        { new: true, runValidators: true }
      ).populate('patientId', 'firstName lastName recordNumber');

      console.log(`✅ Appointment ${id} updated successfully`);

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });

    } else if (req.method === 'GET') {
      // Get single appointment
      const { id } = req.query;
      const clinicId = user.clinicId;

      const appointment = await Appointment.findOne({ _id: id, clinicId })
        .populate('patientId', 'firstName lastName recordNumber email phone')
        .populate('assignedDoctor', 'firstName lastName');

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      res.json({
        success: true,
        appointment
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Appointment update error:', error);
    
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
