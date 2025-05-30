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

    const { patientId } = req.query;
    const { startDate, endDate } = req.query;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    // Use MongoDB native aggregation through mongoose connection
    const db = mongoose.connection.db;

    // Verify patient belongs to clinic
    const patient = await db.collection('patients').findOne({
      _id: new mongoose.Types.ObjectId(patientId),
      clinicId
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build date filter
    let dateFilter = { clinicId };
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // Get appointments with checkout data
    const appointments = await db.collection('appointments').aggregate([
      {
        $match: {
          ...dateFilter,
          patientId: new mongoose.Types.ObjectId(patientId)
        }
      },
      {
        $lookup: {
          from: 'checkouts',
          localField: '_id',
          foreignField: 'appointmentId',
          as: 'checkout'
        }
      },
      {
        $sort: { appointmentDate: -1 }
      }
    ]).toArray();

    // Build ledger transactions
    const transactions = [];

    appointments.forEach(appointment => {
      const checkout = appointment.checkout && appointment.checkout.length > 0 ? appointment.checkout[0] : null;
      
      if (checkout && checkout.serviceCodes && checkout.serviceCodes.length > 0) {
        // Create transaction for each service code
        checkout.serviceCodes.forEach(code => {
          const charge = (code.rate || 0) * (code.units || 1);
          const paid = checkout.payments ? 
            checkout.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) / checkout.serviceCodes.length : 0;
          
          transactions.push({
            date: appointment.appointmentDate,
            serviceCode: code.code || 'N/A',
            description: code.description || 'Service',
            charge: charge,
            paid: Math.round(paid * 100) / 100,
            paymentMethod: checkout.payments && checkout.payments.length > 0 ? 
              checkout.payments[0].method : 'None',
            balance: Math.max(0, charge - paid)
          });
        });
      } else {
        // Create general visit entry if no service codes
        const charge = appointment.totalAmount || 0;
        const paid = checkout ? 
          (checkout.payments ? checkout.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) : 0) : 0;
        
        transactions.push({
          date: appointment.appointmentDate,
          serviceCode: 'VISIT',
          description: 'General Visit',
          charge: charge,
          paid: paid,
          paymentMethod: checkout && checkout.payments && checkout.payments.length > 0 ? 
            checkout.payments[0].method : 'None',
          balance: Math.max(0, charge - paid)
        });
      }
    });

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Patient ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load patient ledger',
      data: [] // Provide empty array as fallback
    });
  }
}
