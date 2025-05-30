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

    // Get date parameter (defaults to today)
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    
    // Set date range for the day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Use MongoDB native aggregation through mongoose connection
    const db = mongoose.connection.db;

    // Get clinic info
    const clinic = await db.collection('clinics').findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Get appointments for the date with patient and checkout data
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
        $sort: { appointmentTime: 1 }
      }
    ]).toArray();

    // Get checkout records for the date
    const checkouts = await db.collection('checkouts').aggregate([
      {
        $match: {
          clinicId,
          checkoutDate: {
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

    // Calculate financial metrics
    let totalRevenue = 0;
    let totalPayments = 0;
    let totalOutstanding = 0;
    const serviceCodeStats = {};
    const paymentMethodStats = {};

    checkouts.forEach(checkout => {
      // Service codes revenue
      if (checkout.serviceCodes) {
        checkout.serviceCodes.forEach(code => {
          const revenue = (code.rate || 0) * (code.units || 1);
          totalRevenue += revenue;
          
          if (!serviceCodeStats[code.code]) {
            serviceCodeStats[code.code] = {
              code: code.code,
              description: code.description || '',
              count: 0,
              revenue: 0
            };
          }
          serviceCodeStats[code.code].count += code.units || 1;
          serviceCodeStats[code.code].revenue += revenue;
        });
      }

      // Payment tracking
      if (checkout.payments) {
        checkout.payments.forEach(payment => {
          totalPayments += payment.amount || 0;
          
          const method = payment.method || 'Unknown';
          if (!paymentMethodStats[method]) {
            paymentMethodStats[method] = { method, amount: 0, count: 0 };
          }
          paymentMethodStats[method].amount += payment.amount || 0;
          paymentMethodStats[method].count += 1;
        });
      }

      // Outstanding balance
      totalOutstanding += checkout.outstandingBalance || 0;
    });

    // Calculate patient metrics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'Checked-Out').length;
    const noShowAppointments = appointments.filter(apt => apt.status === 'No-Show').length;
    const newPatients = appointments.filter(apt => apt.visitType === 'New Patient').length;
    const returningPatients = totalAppointments - newPatients;

    // Provider performance
    const providerStats = {};
    appointments.forEach(apt => {
      const doctorName = apt.doctor?.name || 'Unassigned';
      if (!providerStats[doctorName]) {
        providerStats[doctorName] = {
          name: doctorName,
          appointments: 0,
          completed: 0,
          revenue: 0
        };
      }
      providerStats[doctorName].appointments += 1;
      if (apt.status === 'Checked-Out') {
        providerStats[doctorName].completed += 1;
      }
    });

    // Add revenue to provider stats from checkouts
    checkouts.forEach(checkout => {
      const appointment = appointments.find(apt => apt._id.toString() === checkout.appointmentId?.toString());
      if (appointment && appointment.doctor) {
        const doctorName = appointment.doctor.name;
        if (providerStats[doctorName]) {
          const checkoutRevenue = (checkout.serviceCodes || []).reduce((sum, code) => 
            sum + ((code.rate || 0) * (code.units || 1)), 0);
          providerStats[doctorName].revenue += checkoutRevenue;
        }
      }
    });

    // Format data for response
    const topServiceCodes = Object.values(serviceCodeStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const paymentMethods = Object.values(paymentMethodStats)
      .sort((a, b) => b.amount - a.amount);

    const providers = Object.values(providerStats)
      .sort((a, b) => b.revenue - a.revenue);

    const productionData = {
      clinic: {
        name: clinic.clinicName,
        id: clinic.clinicId
      },
      date: reportDate.toLocaleDateString(),
      financial: {
        totalRevenue: totalRevenue.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        totalOutstanding: totalOutstanding.toFixed(2),
        collectionRate: totalRevenue > 0 ? ((totalPayments / totalRevenue) * 100).toFixed(1) : '0.0'
      },
      patients: {
        totalAppointments,
        completedAppointments,
        noShowAppointments,
        newPatients,
        returningPatients,
        completionRate: totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : '0.0'
      },
      serviceCodes: topServiceCodes,
      paymentMethods,
      providers
    };

    res.json({
      success: true,
      productionData
    });

  } catch (error) {
    console.error('Production report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate production report'
    });
  }
}
