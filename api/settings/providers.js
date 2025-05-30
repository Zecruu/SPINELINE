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

      // Format providers for frontend
      const formattedProviders = providers.map(provider => ({
        id: provider._id,
        name: provider.name,
        email: provider.email,
        role: provider.role,
        npiNumber: provider.profile?.npiNumber || '',
        licenseNumber: provider.profile?.licenseNumber || '',
        specialties: provider.profile?.specialties || [],
        phone: provider.profile?.phone || '',
        isActive: provider.isActive,
        createdAt: provider.createdAt
      }));

      res.json({
        success: true,
        providers: formattedProviders
      });

    } else if (req.method === 'POST') {
      // Create new provider (doctor)
      const {
        name,
        email,
        password,
        npiNumber,
        licenseNumber,
        specialties,
        phone
      } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
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

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create provider
      const provider = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'doctor',
        clinicId: user.clinicId,
        isActive: true,
        profile: {
          npiNumber,
          licenseNumber,
          specialties: specialties || [],
          phone
        }
      });

      await provider.save();

      res.json({
        success: true,
        message: 'Provider created successfully',
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email,
          role: provider.role,
          npiNumber: provider.profile.npiNumber,
          licenseNumber: provider.profile.licenseNumber,
          specialties: provider.profile.specialties,
          phone: provider.profile.phone,
          isActive: provider.isActive
        }
      });

    } else if (req.method === 'PUT') {
      // Update provider
      const { providerId } = req.query;
      const updateData = req.body;

      if (!providerId) {
        return res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
      }

      // Build update object
      const update = {
        name: updateData.name,
        email: updateData.email,
        'profile.npiNumber': updateData.npiNumber,
        'profile.licenseNumber': updateData.licenseNumber,
        'profile.specialties': updateData.specialties,
        'profile.phone': updateData.phone
      };

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

      res.json({
        success: true,
        message: 'Provider updated successfully',
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email,
          role: provider.role,
          npiNumber: provider.profile?.npiNumber || '',
          licenseNumber: provider.profile?.licenseNumber || '',
          specialties: provider.profile?.specialties || [],
          phone: provider.profile?.phone || '',
          isActive: provider.isActive
        }
      });

    } else if (req.method === 'DELETE') {
      // Deactivate provider
      const { providerId } = req.query;

      if (!providerId) {
        return res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
      }

      // Deactivate provider
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
        message: 'Provider deactivated successfully'
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
