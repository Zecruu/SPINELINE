import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

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
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { clinicId } = decoded;

    await connectDB();

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Parse the date and create date range
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Use MongoDB native aggregation through mongoose connection
    const db = mongoose.connection.db;

    // Get appointments for the specified date
    const appointments = await db.collection('appointments').aggregate([
      {
        $match: {
          clinicId,
          appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
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
          patientName: { $ifNull: ['$patient.name', 'Unknown Patient'] },
          doctorName: { $ifNull: ['$doctor.name', 'Unknown Doctor'] },
          visitType: { $ifNull: ['$visitType', 'Regular Visit'] },
          status: { $ifNull: ['$status', 'Scheduled'] }
        }
      },
      {
        $sort: { appointmentTime: 1 }
      }
    ]).toArray();

    // Ensure all appointments have required fields
    const safeAppointments = appointments.map(appointment => ({
      _id: appointment._id,
      patientId: appointment.patientId,
      patientName: appointment.patientName || 'Unknown Patient',
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      visitType: appointment.visitType || 'Regular Visit',
      status: appointment.status || 'Scheduled',
      assignedDoctor: appointment.assignedDoctor,
      doctorName: appointment.doctorName || 'Unknown Doctor',
      clinicId: appointment.clinicId,
      patient: appointment.patient || { name: 'Unknown Patient' },
      doctor: appointment.doctor || { name: 'Unknown Doctor' }
    }));

    res.json({
      success: true,
      appointments: safeAppointments,
      count: safeAppointments.length,
      date: date
    });

  } catch (error) {
    console.error('Date appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load appointments for date',
      appointments: [], // Provide empty array as fallback
      count: 0
    });
  }
}
