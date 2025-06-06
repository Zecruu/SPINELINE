// Vercel API endpoint for individual provider operations
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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    const { id: providerId } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }

    if (req.method === 'GET') {
      // Get specific provider
      const provider = await User.findOne({
        _id: providerId,
        clinicId: user.clinicId,
        role: 'doctor',
        isActive: true
      })
      .select('name email role profile isActive createdAt')
      .lean();

      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'Provider not found'
        });
      }

      // Format provider for frontend (map fields to match frontend expectations)
      const formattedProvider = {
        _id: provider._id,
        fullName: provider.name,
        npi: provider.profile?.npiNumber || '',
        specialization: provider.profile?.specialties?.[0] || '',
        licenseNumber: provider.profile?.licenseNumber || '',
        isActive: provider.isActive,
        email: provider.email,
        role: provider.role,
        createdAt: provider.createdAt
      };

      res.json({
        success: true,
        provider: formattedProvider
      });

    } else if (req.method === 'PUT') {
      // Update provider
      const updateData = req.body;

      // Map frontend fields to database fields
      const update = {};
      if (updateData.fullName !== undefined) update.name = updateData.fullName;
      if (updateData.email !== undefined) update.email = updateData.email;
      if (updateData.npi !== undefined) update['profile.npiNumber'] = updateData.npi;
      if (updateData.licenseNumber !== undefined) update['profile.licenseNumber'] = updateData.licenseNumber;
      if (updateData.specialization !== undefined) {
        update['profile.specialties'] = updateData.specialization ? [updateData.specialization] : [];
      }
      if (updateData.isActive !== undefined) update.isActive = updateData.isActive;

      // Remove undefined values
      Object.keys(update).forEach(key => {
        if (update[key] === undefined) {
          delete update[key];
        }
      });

      // Update provider
      const provider = await User.findOneAndUpdate(
        { 
          _id: providerId, 
          clinicId: user.clinicId,
          role: 'doctor'
        },
        update,
        { new: true }
      ).select('name email role profile isActive');

      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'Provider not found'
        });
      }

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
        message: 'Provider updated successfully',
        provider: formattedProvider
      });

    } else if (req.method === 'DELETE') {
      // Deactivate provider (soft delete)
      const provider = await User.findOneAndUpdate(
        { 
          _id: providerId, 
          clinicId: user.clinicId,
          role: 'doctor'
        },
        { isActive: false },
        { new: true }
      );

      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'Provider not found'
        });
      }

      res.json({
        success: true,
        message: 'Provider deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Provider API error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
