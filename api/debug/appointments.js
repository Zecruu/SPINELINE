// Debug Appointments API for Vercel
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
    console.log('MongoDB connected for debug appointments');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

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

    const { clinicId } = user;

    // Use MongoDB native aggregation
    const db = mongoose.connection.db;

    console.log(`🔍 DEBUG: Getting all appointments for clinic: ${clinicId}`);

    // Get ALL appointments for this clinic (not just today)
    const allAppointments = await db.collection('appointments').aggregate([
      {
        $match: {
          clinicId: clinicId
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
        $unwind: { path: '$patient', preserveNullAndEmptyArrays: true }
      },
      {
        $sort: { appointmentDate: -1 }
      }
    ]).toArray();

    console.log(`🔍 DEBUG: Found ${allAppointments.length} total appointments`);

    // Get today's date info
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`📅 Today: ${todayString}`);
    console.log(`📅 Start of day: ${startOfDay.toISOString()}`);
    console.log(`📅 End of day: ${endOfDay.toISOString()}`);

    // Analyze each appointment
    const debugInfo = allAppointments.map(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const aptDateString = aptDate.toISOString().split('T')[0];
      const isToday = aptDateString === todayString;
      
      return {
        _id: apt._id,
        patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown',
        appointmentDate: apt.appointmentDate,
        appointmentDateString: aptDateString,
        appointmentTime: apt.appointmentTime,
        status: apt.status,
        isToday: isToday,
        timezoneOffset: aptDate.getTimezoneOffset(),
        rawDate: apt.appointmentDate
      };
    });

    // Count today's appointments
    const todaysAppointments = debugInfo.filter(apt => apt.isToday);

    console.log(`📊 Today's appointments: ${todaysAppointments.length}`);
    todaysAppointments.forEach(apt => {
      console.log(`  - ${apt.patientName}: ${apt.appointmentDateString} at ${apt.appointmentTime} (${apt.status})`);
    });

    // Test the actual query that's failing
    const todayQuery = await db.collection('appointments').aggregate([
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
        $unwind: { path: '$patient', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();

    console.log(`🔍 Query result: ${todayQuery.length} appointments found with date range query`);

    res.json({
      success: true,
      debug: {
        clinicId,
        today: todayString,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        totalAppointments: allAppointments.length,
        todaysAppointments: todaysAppointments.length,
        queryResult: todayQuery.length,
        appointments: debugInfo,
        todayQueryResults: todayQuery.map(apt => ({
          _id: apt._id,
          patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown',
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          status: apt.status
        }))
      }
    });

  } catch (error) {
    console.error('❌ DEBUG APPOINTMENTS ERROR:', error);
    
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
