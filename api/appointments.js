// Appointments endpoint
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
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  duration: {
    type: Number,
    default: 30,
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [240, 'Maximum appointment duration is 4 hours']
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

// User Schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary'], required: true },
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

    if (req.method === 'POST') {
      // Create new appointment
      const clinicId = user.clinicId;
      const createdBy = user.name || user.email;

      console.log('📅 Creating appointment with data:', req.body);

      // Validate patient exists and belongs to clinic
      const patient = await Patient.findOne({
        _id: req.body.patientId,
        clinicId
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Get clinic doctors to assign appointment
      const clinicDoctors = await User.find({
        clinicId,
        role: 'doctor',
        isActive: true
      });

      // Auto-assign to first available doctor if not specified
      let assignedDoctor = req.body.assignedDoctor;
      if (!assignedDoctor && clinicDoctors.length > 0) {
        assignedDoctor = clinicDoctors[0]._id;
        console.log(`🏥 Auto-assigning appointment to doctor: ${clinicDoctors[0].firstName} ${clinicDoctors[0].lastName}`);
      }

      // Create appointment data
      const appointmentData = {
        ...req.body,
        clinicId,
        createdBy,
        assignedDoctor,
        status: 'Scheduled'
      };

      // Ensure appointmentDate is properly formatted
      if (appointmentData.appointmentDate) {
        appointmentData.appointmentDate = new Date(appointmentData.appointmentDate);
      }

      const appointment = new Appointment(appointmentData);
      await appointment.save();

      console.log(`✅ Appointment created: ${patient.firstName} ${patient.lastName} - Date: ${appointment.appointmentDate} Time: ${appointment.appointmentTime}`);

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        appointment: {
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          visitType: appointment.visitType,
          status: appointment.status
        }
      });

    } else if (req.method === 'PATCH') {
      // Handle appointment status updates and other patches
      const { appointmentId } = req.query;

      if (!appointmentId) {
        return res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
      }

      const clinicId = user.clinicId;
      const updatedBy = user.name || user.email;

      // Find appointment
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        clinicId
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Update appointment with provided data
      const updateData = {
        ...req.body,
        updatedBy,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated
      delete updateData.clinicId;
      delete updateData.createdBy;
      delete updateData.createdAt;

      const updatedAppointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, clinicId },
        updateData,
        { new: true, runValidators: true }
      );

      console.log(`✅ Appointment ${appointmentId} updated:`, updateData);

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });

    } else if (req.method === 'PUT') {
      // Handle appointment reschedule/update
      const { appointmentId } = req.query;

      if (!appointmentId) {
        return res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
      }

      const clinicId = user.clinicId;
      const updatedBy = user.name || user.email;

      // Get current appointment for history tracking
      const currentAppointment = await Appointment.findOne({
        _id: appointmentId,
        clinicId
      });

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

      // Ensure appointmentDate is properly formatted
      if (updateData.appointmentDate) {
        updateData.appointmentDate = new Date(updateData.appointmentDate);
      }

      const updatedAppointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, clinicId },
        updateData,
        { new: true, runValidators: true }
      );

      console.log(`✅ Appointment ${appointmentId} rescheduled/updated`);

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Appointments error:', error);

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
