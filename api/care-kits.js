// Vercel API endpoint for care kits
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

// Care Kit Schema
const careKitSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Care kit code is required'],
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Care kit name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Acute Care',
      'Chronic Care',
      'Rehabilitation',
      'Maintenance',
      'Preventive',
      'Post-Surgical',
      'Sports Medicine',
      'Pediatric',
      'Geriatric',
      'Other'
    ],
    default: 'Other'
  },
  treatmentType: {
    type: String,
    enum: [
      'Chiropractic',
      'Physical Therapy',
      'Massage Therapy',
      'Acupuncture',
      'Combined Therapy',
      'Evaluation Only',
      'Other'
    ],
    default: 'Chiropractic'
  },
  includedCodes: [{
    code: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    unitsPerSession: {
      type: Number,
      default: 1,
      min: 1
    },
    category: {
      type: String,
      default: 'Other'
    }
  }],
  totalSessions: {
    type: Number,
    required: [true, 'Total sessions is required'],
    min: [1, 'Total sessions must be at least 1']
  },
  validityDays: {
    type: Number,
    default: 90,
    min: [1, 'Validity days must be at least 1']
  },
  totalRate: {
    type: Number,
    required: [true, 'Total rate is required'],
    min: [0, 'Total rate cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date
  },
  createdBy: {
    type: String,
    required: true
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
careKitSchema.index({ clinicId: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, code: 1 }, { unique: true });
careKitSchema.index({ clinicId: 1, category: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, treatmentType: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });

// Text index for search functionality
careKitSchema.index({
  code: 'text',
  name: 'text',
  description: 'text'
}, {
  weights: {
    code: 10,
    name: 8,
    description: 5
  }
});

// Static methods
careKitSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  if (options.treatmentType && options.treatmentType !== 'all') {
    query.treatmentType = options.treatmentType;
  }

  if (options.isFavorite !== undefined) {
    query.isFavorite = options.isFavorite;
  }

  return this.find(query).sort({ name: 1 });
};

careKitSchema.statics.searchKits = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { code: { $regex: searchTerm, $options: 'i' } },
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  if (options.treatmentType && options.treatmentType !== 'all') {
    query.treatmentType = options.treatmentType;
  }

  if (options.isFavorite !== undefined) {
    query.isFavorite = options.isFavorite;
  }

  return this.find(query)
    .sort({ name: 1 })
    .limit(options.limit || 50);
};

const CareKit = mongoose.models.CareKit || mongoose.model('CareKit', careKitSchema);

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

    if (req.method === 'GET') {
      // Get all care kits for a clinic
      const { search, category, treatmentType, isFavorite, limit = 50 } = req.query;
      const { clinicId, role } = user;

      console.log(`🎯 Care kits request from ${role} for clinic: ${clinicId}`);

      let careKits;

      if (search && search.trim()) {
        // Search functionality
        careKits = await CareKit.searchKits(
          clinicId,
          search.trim(),
          {
            category,
            treatmentType,
            isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
            limit: parseInt(limit)
          }
        );
      } else {
        // Get all kits with filters
        const options = {};
        if (category) options.category = category;
        if (treatmentType) options.treatmentType = treatmentType;
        if (isFavorite !== undefined) options.isFavorite = isFavorite === 'true';

        careKits = await CareKit.findByClinic(clinicId, options)
          .limit(parseInt(limit));
      }

      console.log(`🎯 Found ${careKits.length} care kits for clinic: ${clinicId}`);

      res.json({
        success: true,
        kits: careKits
      });

    } else if (req.method === 'POST') {
      // Create a new care kit (admin/doctor only)
      const { clinicId, role, name } = user;

      // Only doctors and admins can create care kits
      if (role !== 'doctor' && role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create care kits'
        });
      }

      const careKitData = {
        ...req.body,
        clinicId,
        createdBy: name || 'Unknown'
      };

      const careKit = new CareKit(careKitData);
      await careKit.save();

      res.status(201).json({
        success: true,
        message: 'Care kit created successfully',
        kit: careKit
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Care kits API error:', error);
    
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
