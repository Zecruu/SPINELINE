// Vercel API endpoint for service codes
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

// Service Code Schema
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

// Text index for search functionality
serviceCodeSchema.index({
  code: 'text',
  description: 'text'
}, {
  weights: {
    code: 10,
    description: 5
  }
});

// Static methods
serviceCodeSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (options.isPackage !== undefined) {
    query.isPackage = options.isPackage;
  }

  return this.find(query).sort({ code: 1 });
};

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

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, user);
      case 'POST':
        return await handlePost(req, res, user);
      case 'PUT':
        return await handlePut(req, res, user);
      case 'DELETE':
        return await handleDelete(req, res, user);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('Service codes API error:', error);

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

// Handle GET requests
async function handleGet(req, res, user) {
  const { search, isPackage, limit = 50 } = req.query;
  const { clinicId, role } = user;

  console.log(`📋 Service codes request from ${role} for clinic: ${clinicId}`);

  let query = { clinicId, isActive: true };

  // Filter by package type if specified
  if (isPackage !== undefined) {
    query.isPackage = isPackage === 'true';
  }

  let serviceCodes;

  if (search && search.trim()) {
    // Search functionality
    serviceCodes = await ServiceCode.searchCodes(
      clinicId,
      search.trim(),
      {
        isPackage: isPackage === 'true' ? true : isPackage === 'false' ? false : undefined,
        limit: parseInt(limit)
      }
    );
  } else {
    // Get all codes
    serviceCodes = await ServiceCode.find(query)
      .sort({ code: 1 })
      .limit(parseInt(limit));
  }

  console.log(`📋 Found ${serviceCodes.length} service codes for clinic: ${clinicId}`);

  return res.json({
    success: true,
    serviceCodes
  });
}

// Handle POST requests
async function handlePost(req, res, user) {
  const { clinicId, role } = user;

  // Only doctors and admins can create service codes
  if (role !== 'doctor' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create service codes'
    });
  }

  const serviceCodeData = {
    ...req.body,
    clinicId
  };

  const serviceCode = new ServiceCode(serviceCodeData);
  await serviceCode.save();

  return res.status(201).json({
    success: true,
    message: 'Service code created successfully',
    serviceCode
  });
}

// Handle PUT requests
async function handlePut(req, res, user) {
  const { clinicId, role } = user;

  // Extract ID from query parameter (Vercel passes it as query.id for dynamic routes)
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Service code ID is required'
    });
  }

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

  return res.json({
    success: true,
    message: 'Service code updated successfully',
    serviceCode
  });
}

// Handle DELETE requests
async function handleDelete(req, res, user) {
  const { clinicId, role } = user;

  // Extract ID from query parameter (Vercel passes it as query.id for dynamic routes)
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Service code ID is required'
    });
  }

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

  return res.json({
    success: true,
    message: 'Service code deleted successfully'
  });
}
