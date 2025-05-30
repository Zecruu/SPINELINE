// Clinic validation endpoint
const mongoose = require('mongoose');

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

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  clinicId: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

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
    const { clinicId } = req.query;

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID is required'
      });
    }

    await connectDB();

    const clinic = await Clinic.findOne({
      clinicId: clinicId.toUpperCase(),
      isActive: true
    }).select('clinicName isActive clinicId').lean();

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found or inactive'
      });
    }

    res.json({
      success: true,
      clinic: {
        id: clinic._id,
        clinicId: clinic.clinicId,
        name: clinic.clinicName,
        isActive: clinic.isActive
      }
    });

  } catch (error) {
    console.error('Clinic validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
