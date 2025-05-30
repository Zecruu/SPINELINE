import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
      const users = await User.find({}, { password: 0 })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        users
      });
    }

    if (req.method === 'POST') {
      const { name, email, password, role, clinicId } = req.body;

      if (!name || !email || !password || !role || !clinicId) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        clinicId: clinicId.toUpperCase()
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists in this clinic'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        clinicId: clinicId.toUpperCase(),
        isActive: true
      });

      await newUser.save();

      return res.json({
        success: true,
        message: 'User created successfully',
        user: { ...newUser.toObject(), password: undefined }
      });
    }

    if (req.method === 'DELETE') {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      await User.findByIdAndDelete(userId);

      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
