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

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      const clinics = await Clinic.find({})
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        clinics
      });
    }

    if (req.method === 'POST') {
      const { clinicName, clinicId } = req.body;

      if (!clinicName || !clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic name and ID are required'
        });
      }

      const existingClinic = await Clinic.findOne({
        clinicId: clinicId.toUpperCase()
      });

      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID already exists'
        });
      }

      const newClinic = new Clinic({
        clinicName,
        clinicId: clinicId.toUpperCase(),
        isActive: true
      });

      await newClinic.save();

      return res.json({
        success: true,
        message: 'Clinic created successfully',
        clinic: newClinic
      });
    }

    if (req.method === 'DELETE') {
      const { clinicId } = req.body;

      if (!clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID is required'
        });
      }

      await Clinic.deleteOne({ clinicId: clinicId.toUpperCase() });
      await User.deleteMany({ clinicId: clinicId.toUpperCase() });

      return res.json({
        success: true,
        message: 'Clinic and associated users deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Clinics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
