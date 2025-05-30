// Clinic validation endpoint for Vercel
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
  clinicName: {
    type: String,
    required: true,
    trim: true
  },
  clinicId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

export default async function handler(req, res) {
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

    // Connect to database
    await connectDB();

    console.log(`Fetching clinic info for ID: ${clinicId}`);
    
    const clinic = await Clinic.findOne({
      clinicId: clinicId.toUpperCase(),
      isActive: true
    }).select('clinicName isActive clinicId').lean();

    if (!clinic) {
      console.log(`Clinic not found or inactive: ${clinicId}`);
      return res.status(404).json({
        success: false,
        message: 'Clinic not found or inactive'
      });
    }

    console.log(`Found clinic: ${clinic.clinicName} (${clinic.clinicId})`);
    
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
    console.error('Get clinic info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting clinic info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
