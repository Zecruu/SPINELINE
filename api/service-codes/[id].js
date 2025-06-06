// Vercel API endpoint for individual service code operations
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

// Service Code Schema (same as main file)
const serviceCodeSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Service code is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Evaluation',
      'Therapeutic Procedures',
      'Physical Medicine Modalities',
      'Manual Therapy',
      'Exercise',
      'Chiropractic Manipulation',
      'Office Visits',
      'Radiology',
      'Acupuncture',
      'Work Conditioning',
      'Other'
    ],
    default: 'Other'
  },
  unitRate: {
    type: Number,
    required: [true, 'Unit rate is required'],
    min: [0, 'Unit rate cannot be negative']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours (480 minutes)'],
    default: 15
  },
  insuranceCoverage: [{
    type: String,
    enum: [
      'Medicare',
      'Medicaid',
      'Most Private Insurance',
      'Some Private Insurance',
      'Puerto Rico Health Insurance',
      'Workers Compensation',
      'Limited Coverage',
      'Some Medicare Plans',
      'Many Private Insurance'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPackage: {
    type: Boolean,
    default: false,
    index: true
  },
  packageDetails: {
    totalSessions: {
      type: Number,
      min: [1, 'Total sessions must be at least 1']
    },
    includedCodes: [{
      code: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      unitsPerSession: {
        type: Number,
        default: 1,
        min: 1
      }
    }],
    validityDays: {
      type: Number,
      default: 90,
      min: 1
    }
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
serviceCodeSchema.index({ clinicId: 1, isActive: 1 });
serviceCodeSchema.index({ clinicId: 1, code: 1 }, { unique: true });
serviceCodeSchema.index({ clinicId: 1, isPackage: 1, isActive: 1 });

const ServiceCode = mongoose.models.ServiceCode || mongoose.model('ServiceCode', serviceCodeSchema);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service code ID is required'
      });
    }

    if (req.method === 'GET') {
      // Get a specific service code
      const { clinicId } = user;

      const serviceCode = await ServiceCode.findOne({
        _id: id,
        clinicId,
        isActive: true
      });

      if (!serviceCode) {
        return res.status(404).json({
          success: false,
          message: 'Service code not found'
        });
      }

      res.json({
        success: true,
        serviceCode
      });

    } else if (req.method === 'PUT') {
      // Update a service code (admin/doctor only)
      const { clinicId, role } = user;

      // Only doctors and admins can update service codes
      if (role !== 'doctor' && role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update service codes'
        });
      }

      const serviceCode = await ServiceCode.findOneAndUpdate(
        { _id: id, clinicId },
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!serviceCode) {
        return res.status(404).json({
          success: false,
          message: 'Service code not found'
        });
      }

      res.json({
        success: true,
        message: 'Service code updated successfully',
        serviceCode
      });

    } else if (req.method === 'DELETE') {
      // Delete a service code (soft delete - admin/doctor only)
      const { clinicId, role } = user;

      // Only doctors and admins can delete service codes
      if (role !== 'doctor' && role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete service codes'
        });
      }

      const serviceCode = await ServiceCode.findOneAndUpdate(
        { _id: id, clinicId },
        { isActive: false, updatedAt: Date.now() },
        { new: true }
      );

      if (!serviceCode) {
        return res.status(404).json({
          success: false,
          message: 'Service code not found'
        });
      }

      res.json({
        success: true,
        message: 'Service code deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Service code API error:', error);
    
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
