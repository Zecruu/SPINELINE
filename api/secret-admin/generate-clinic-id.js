import mongoose from 'mongoose';

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
    await connectDB();

    const { clinicName } = req.query;

    if (!clinicName) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name is required'
      });
    }

    // Generate ID from clinic name
    let baseId = clinicName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    if (baseId.length < 3) {
      baseId = baseId.padEnd(3, '0');
    }

    // Check if base ID exists and find available variant
    let suggestedId = baseId;
    let counter = 1;

    while (await Clinic.findOne({ clinicId: suggestedId })) {
      if (counter < 10) {
        suggestedId = baseId + counter;
      } else if (counter < 100) {
        suggestedId = baseId.substring(0, 5) + counter;
      } else {
        suggestedId = baseId.substring(0, 4) + counter;
      }
      counter++;

      // Prevent infinite loop
      if (counter > 999) {
        suggestedId = baseId + Math.floor(Math.random() * 9999);
        break;
      }
    }

    res.json({
      success: true,
      suggestedId,
      baseId
    });

  } catch (error) {
    console.error('Generate clinic ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate clinic ID'
    });
  }
}
