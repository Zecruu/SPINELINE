import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
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

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  clinicId: { type: String, required: true, unique: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

// Verify admin token
const verifyAdminToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

  if (decoded.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return decoded;
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify admin token
    verifyAdminToken(req);

    // Connect to database
    await connectDB();

    const { userId } = req.query;

    if (req.method === 'GET') {
      // Get single user
      const user = await User.findById(userId).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get clinic info
      const clinic = await Clinic.findOne({ clinicId: user.clinicId });

      res.json({
        success: true,
        user: {
          ...user.toObject(),
          clinicName: clinic?.clinicName || 'Unknown Clinic'
        }
      });

    } else if (req.method === 'PUT') {
      // Update user
      const { name, email, password, role, clinicId } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent editing admin users
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot edit admin users'
        });
      }

      // Check if email is being changed and if it already exists
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: userId }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Verify clinic exists if clinicId is being changed
      if (clinicId && clinicId !== user.clinicId) {
        const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
        if (!clinic) {
          return res.status(400).json({
            success: false,
            message: 'Clinic not found'
          });
        }
      }

      // Build update object
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email.toLowerCase();
      if (role) updateData.role = role;
      if (clinicId) updateData.clinicId = clinicId.toUpperCase();

      // Hash new password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');

      // Get clinic info for response
      const clinic = await Clinic.findOne({ clinicId: updatedUser.clinicId });

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          ...updatedUser.toObject(),
          clinicName: clinic?.clinicName || 'Unknown Clinic'
        }
      });

    } else if (req.method === 'DELETE') {
      // Delete user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent deletion of admin users
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete admin users'
        });
      }

      await User.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: `User ${user.name} deleted successfully`
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('User management error:', error);

    if (error.message === 'No token provided' || error.message === 'Admin access required' || error.name === 'JsonWebTokenError') {
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
