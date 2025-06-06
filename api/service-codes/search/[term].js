// Vercel API endpoint for service code search
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

// Service Code Schema (simplified for search)
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
    default: 'Other'
  },
  unitRate: {
    type: Number,
    required: [true, 'Unit rate is required'],
    min: [0, 'Unit rate cannot be negative']
  },
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
    totalSessions: Number,
    includedCodes: [{
      code: String,
      description: String,
      unitsPerSession: { type: Number, default: 1 }
    }],
    validityDays: { type: Number, default: 90 }
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Static search method
serviceCodeSchema.statics.searchCodes = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (options.isPackage !== undefined) {
    query.isPackage = options.isPackage;
  }

  return this.find(query)
    .sort({ code: 1 })
    .limit(options.limit || 50);
};

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Connect to database
    await connectDB();

    const { term } = req.query;
    const { isPackage, limit = 20 } = req.query;
    const { clinicId } = user;

    if (!term || term.trim().length < 1) {
      return res.json({
        success: true,
        serviceCodes: []
      });
    }

    const serviceCodes = await ServiceCode.searchCodes(
      clinicId,
      term.trim(),
      {
        isPackage: isPackage === 'true' ? true : isPackage === 'false' ? false : undefined,
        limit: parseInt(limit)
      }
    );

    res.json({
      success: true,
      serviceCodes
    });

  } catch (error) {
    console.error('Search service codes error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error searching service codes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
