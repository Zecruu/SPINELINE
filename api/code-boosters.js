// Vercel API endpoint for code boosters (unified procedure and diagnostic bundles)
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

// Code Booster Schema
const codeBoosterSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Booster name is required'],
    trim: true,
    maxlength: [100, 'Booster name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: [
      'Neck',
      'Headache', 
      'Back Pain',
      'Shoulder',
      'Hip',
      'Knee',
      'Ankle',
      'Wrist',
      'Elbow',
      'Spine',
      'General',
      'Custom',
      'Other'
    ],
    default: 'General'
  },
  codes: [{
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
    type: {
      type: String,
      enum: ['CPT', 'ICD-10', 'HCPCS'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
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
    required: [true, 'Creator is required']
  },
  updatedBy: {
    type: String
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
codeBoosterSchema.index({ clinicId: 1, isActive: 1 });
codeBoosterSchema.index({ clinicId: 1, name: 1 }, { unique: true });
codeBoosterSchema.index({ clinicId: 1, category: 1, isActive: 1 });
codeBoosterSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });

// Text index for search functionality
codeBoosterSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  }
});

// Static methods
codeBoosterSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  if (options.isFavorite !== undefined) {
    query.isFavorite = options.isFavorite;
  }

  return this.find(query).sort({ name: 1 });
};

codeBoosterSchema.statics.getFavorites = function(clinicId) {
  return this.find({
    clinicId,
    isActive: true,
    isFavorite: true
  }).sort({ name: 1 });
};

codeBoosterSchema.statics.searchBoosters = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  return this.find(query).sort({ name: 1 });
};

// Instance methods
codeBoosterSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  this.updatedAt = Date.now();
  return this.save();
};

codeBoosterSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = Date.now();
  this.updatedAt = Date.now();
  return this.save();
};

const CodeBooster = mongoose.models.CodeBooster || mongoose.model('CodeBooster', codeBoosterSchema);

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

// Default boosters to create for new clinics
const defaultBoosters = [
  {
    name: 'ChiroClassic',
    description: 'Standard chiropractic adjustment with electrical stimulation',
    category: 'Spine',
    codes: [
      { code: '98941', description: 'Chiropractic manipulative treatment; spinal, 3-4 regions', type: 'CPT' },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT' }
    ]
  },
  {
    name: 'QuickSpine Relief',
    description: 'Quick spinal adjustment with modality',
    category: 'Spine',
    codes: [
      { code: '98940', description: 'Chiropractic manipulative treatment; spinal, 1-2 regions', type: 'CPT' },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT' }
    ]
  },
  {
    name: 'Advanced Full Spine',
    description: 'Comprehensive spinal treatment with modalities',
    category: 'Spine',
    codes: [
      { code: '98942', description: 'Chiropractic manipulative treatment; spinal, 5 regions', type: 'CPT' },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT' }
    ]
  }
];

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
      // Get all code boosters for a clinic
      const { category, favorites, search } = req.query;
      const { clinicId, role } = user;

      // Only doctors can access boosters
      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      let boosters;
      
      if (search) {
        boosters = await CodeBooster.searchBoosters(clinicId, search, { category });
      } else if (favorites === 'true') {
        boosters = await CodeBooster.getFavorites(clinicId);
      } else {
        boosters = await CodeBooster.findByClinic(clinicId, { category });
      }

      // If no boosters exist, create default ones
      if (boosters.length === 0 && !search && !category) {
        console.log(`🚀 Creating default boosters for clinic: ${clinicId}`);
        
        for (const defaultBooster of defaultBoosters) {
          const booster = new CodeBooster({
            ...defaultBooster,
            clinicId,
            isDefault: true,
            createdBy: user.name || user.email
          });
          await booster.save();
        }

        // Reload boosters after creating defaults
        boosters = await CodeBooster.findByClinic(clinicId);
      }

      res.json({
        success: true,
        boosters
      });

    } else if (req.method === 'POST') {
      // Create new code booster
      const { clinicId, role, name } = user;

      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      const { name: boosterName, description, category, codes } = req.body;

      // Validate required fields
      if (!boosterName || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one code are required'
        });
      }

      // Check if booster name already exists
      const existingBooster = await CodeBooster.findOne({
        clinicId,
        name: boosterName,
        isActive: true
      });

      if (existingBooster) {
        return res.status(400).json({
          success: false,
          message: 'A booster with this name already exists'
        });
      }

      // Create new booster
      const newBooster = new CodeBooster({
        clinicId,
        name: boosterName,
        description,
        category: category || 'General',
        codes,
        createdBy: name || 'Unknown'
      });

      await newBooster.save();

      res.status(201).json({
        success: true,
        message: 'Code booster created successfully',
        booster: newBooster
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Code boosters API error:', error);
    
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
