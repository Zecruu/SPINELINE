// Admin clinics management endpoint
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

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  clinicId: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

// User Schema for counting users per clinic
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Verify admin token
const verifyAdmin = (req) => {
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

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify admin access
    verifyAdmin(req);
    
    // Connect to database
    await connectDB();

    if (req.method === 'GET') {
      // Get all clinics with user counts
      const clinics = await Clinic.find().lean();
      
      // Get user counts for each clinic
      const clinicsWithCounts = await Promise.all(
        clinics.map(async (clinic) => {
          const userCount = await User.countDocuments({ 
            clinicId: clinic.clinicId,
            isActive: true 
          });
          
          return {
            id: clinic._id,
            clinicId: clinic.clinicId,
            clinicName: clinic.clinicName,
            isActive: clinic.isActive,
            userCount,
            createdAt: clinic.createdAt,
            updatedAt: clinic.updatedAt
          };
        })
      );

      res.json({
        success: true,
        clinics: clinicsWithCounts
      });

    } else if (req.method === 'POST') {
      // Create new clinic
      const { clinicName, clinicId } = req.body;

      // Validate input
      if (!clinicName || !clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic name and ID are required'
        });
      }

      // Check if clinic already exists
      const existingClinic = await Clinic.findOne({ 
        clinicId: clinicId.toUpperCase() 
      });
      
      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: 'Clinic with this ID already exists'
        });
      }

      // Create clinic
      const clinic = new Clinic({
        clinicName: clinicName.trim(),
        clinicId: clinicId.toUpperCase().trim(),
        isActive: true
      });

      await clinic.save();

      res.json({
        success: true,
        message: 'Clinic created successfully',
        clinic: {
          id: clinic._id,
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName,
          isActive: clinic.isActive,
          userCount: 0
        }
      });

    } else if (req.method === 'PUT') {
      // Update clinic
      const { clinicId } = req.query;
      const { clinicName, isActive } = req.body;
      
      if (!clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID is required'
        });
      }

      const clinic = await Clinic.findOneAndUpdate(
        { clinicId: clinicId.toUpperCase() },
        { 
          ...(clinicName && { clinicName: clinicName.trim() }),
          ...(typeof isActive === 'boolean' && { isActive })
        },
        { new: true }
      );

      if (!clinic) {
        return res.status(404).json({
          success: false,
          message: 'Clinic not found'
        });
      }

      res.json({
        success: true,
        message: 'Clinic updated successfully',
        clinic: {
          id: clinic._id,
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName,
          isActive: clinic.isActive
        }
      });

    } else if (req.method === 'DELETE') {
      // Delete clinic
      const { clinicId } = req.query;
      
      if (!clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID is required'
        });
      }

      // Check if clinic has users
      const userCount = await User.countDocuments({ 
        clinicId: clinicId.toUpperCase() 
      });
      
      if (userCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete clinic. It has ${userCount} users. Please delete all users first.`
        });
      }

      const clinic = await Clinic.findOneAndDelete({ 
        clinicId: clinicId.toUpperCase() 
      });
      
      if (!clinic) {
        return res.status(404).json({
          success: false,
          message: 'Clinic not found'
        });
      }

      res.json({
        success: true,
        message: 'Clinic deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Admin clinics error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Admin access required') {
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
