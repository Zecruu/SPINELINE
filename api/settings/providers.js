// Settings providers endpoint
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

// User Schema (for providers)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  profile: {
    npiNumber: { type: String },
    licenseNumber: { type: String },
    specialties: [{ type: String }],
    phone: { type: String },
    signature: { type: String }
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token and get user info
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    if (req.method === 'GET') {
      // Get all providers (doctors) for the clinic
      const providers = await User.find({
        clinicId: user.clinicId,
        role: 'doctor',
        isActive: true
      })
      .select('name email role profile isActive createdAt')
      .sort({ name: 1 })
      .lean();

      // Format providers for frontend (map fields to match frontend expectations)
      const formattedProviders = providers.map(provider => ({
        _id: provider._id,
        fullName: provider.name,
        npi: provider.profile?.npiNumber || '',
        specialization: provider.profile?.specialties?.[0] || '',
        licenseNumber: provider.profile?.licenseNumber || '',
        isActive: provider.isActive,
        email: provider.email,
        role: provider.role,
        createdAt: provider.createdAt
      }));

      res.json({
        success: true,
        providers: formattedProviders
      });

    } else if (req.method === 'POST') {
      // Create new provider (doctor)
      const {
        fullName,
        name,
        email,
        password,
        npi,
        npiNumber,
        licenseNumber,
        specialization,
        specialties,
        phone
      } = req.body;

      // Map frontend fields to database fields
      const providerName = fullName || name;
      const providerNpi = npi || npiNumber;
      const providerSpecialties = specialization ? [specialization] : (specialties || []);

      // Validate required fields
      if (!providerName || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Generate default password if not provided
      const defaultPassword = password || 'TempPass123!';

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      // Create provider
      const provider = new User({
        name: providerName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'doctor',
        clinicId: user.clinicId,
        isActive: true,
        profile: {
          npiNumber: providerNpi,
          licenseNumber,
          specialties: providerSpecialties,
          phone
        }
      });

      await provider.save();

      // Format response to match frontend expectations
      const formattedProvider = {
        _id: provider._id,
        fullName: provider.name,
        npi: provider.profile?.npiNumber || '',
        specialization: provider.profile?.specialties?.[0] || '',
        licenseNumber: provider.profile?.licenseNumber || '',
        isActive: provider.isActive,
        email: provider.email,
        role: provider.role
      };

      res.json({
        success: true,
        message: 'Provider created successfully',
        provider: formattedProvider
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Settings providers error:', error);
    
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
