// Settings users endpoint
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

// User Schema
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
      // Get all users for the clinic
      const users = await User.find({
        clinicId: user.clinicId,
        isActive: true
      })
      .select('name email role profile isActive lastLogin createdAt')
      .sort({ name: 1 })
      .lean();

      // Format users for frontend
      const formattedUsers = users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        npiNumber: u.profile?.npiNumber || '',
        licenseNumber: u.profile?.licenseNumber || '',
        specialties: u.profile?.specialties || [],
        phone: u.profile?.phone || '',
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt
      }));

      res.json({
        success: true,
        users: formattedUsers
      });

    } else if (req.method === 'POST') {
      // Create new user
      const {
        name,
        email,
        password,
        role,
        npiNumber,
        licenseNumber,
        specialties,
        phone
      } = req.body;

      // Validate required fields
      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, password, and role are required'
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

      // Create user
      const newUser = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        clinicId: user.clinicId,
        isActive: true,
        profile: {
          npiNumber,
          licenseNumber,
          specialties: specialties || [],
          phone
        }
      });

      await newUser.save();

      res.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          npiNumber: newUser.profile.npiNumber,
          licenseNumber: newUser.profile.licenseNumber,
          specialties: newUser.profile.specialties,
          phone: newUser.profile.phone,
          isActive: newUser.isActive
        }
      });

    } else if (req.method === 'PUT') {
      // Update user
      const { userId } = req.query;
      const updateData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Build update object
      const update = {
        name: updateData.name,
        email: updateData.email,
        role: updateData.role,
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

      // Update password if provided
      if (updateData.password) {
        const bcrypt = require('bcrypt');
        update.password = await bcrypt.hash(updateData.password, 12);
      }

      // Update user
      const updatedUser = await User.findOneAndUpdate(
        { 
          _id: userId, 
          clinicId: user.clinicId
        },
        update,
        { new: true }
      ).select('name email role profile isActive');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          npiNumber: updatedUser.profile?.npiNumber || '',
          licenseNumber: updatedUser.profile?.licenseNumber || '',
          specialties: updatedUser.profile?.specialties || [],
          phone: updatedUser.profile?.phone || '',
          isActive: updatedUser.isActive
        }
      });

    } else if (req.method === 'DELETE') {
      // Deactivate user
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Prevent self-deletion
      if (userId === user.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }

      // Deactivate user
      const deactivatedUser = await User.findOneAndUpdate(
        { 
          _id: userId, 
          clinicId: user.clinicId
        },
        { isActive: false },
        { new: true }
      );

      if (!deactivatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Settings users error:', error);
    
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
