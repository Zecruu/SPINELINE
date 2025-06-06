// Vercel API endpoint for dx clusters
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

// DX Cluster Schema
const dxClusterSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Cluster name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  customName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Musculoskeletal',
      'Nervous System',
      'Respiratory',
      'Cardiovascular',
      'Digestive',
      'Genitourinary',
      'Skin',
      'Endocrine',
      'Mental Health',
      'Injury',
      'Custom',
      'Other'
    ],
    default: 'Custom'
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
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isHidden: {
    type: Boolean,
    default: false,
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
dxClusterSchema.index({ clinicId: 1, isActive: 1 });
dxClusterSchema.index({ clinicId: 1, name: 1 }, { unique: true });
dxClusterSchema.index({ clinicId: 1, category: 1, isActive: 1 });
dxClusterSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });

// Text index for search functionality
dxClusterSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  }
});

// Static methods
dxClusterSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (!options.includeHidden) {
    query.isHidden = { $ne: true };
  }

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  return this.find(query).sort({ name: 1 });
};

dxClusterSchema.statics.getFavorites = function(clinicId) {
  return this.find({
    clinicId,
    isActive: true,
    isFavorite: true,
    isHidden: { $ne: true }
  }).sort({ name: 1 });
};

dxClusterSchema.statics.searchClusters = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (!options.includeHidden) {
    query.isHidden = { $ne: true };
  }

  if (options.category && options.category !== 'all') {
    query.category = options.category;
  }

  return this.find(query).sort({ name: 1 });
};

// Instance methods
dxClusterSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  this.updatedAt = Date.now();
  return this.save();
};

dxClusterSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = Date.now();
  this.updatedAt = Date.now();
  return this.save();
};

dxClusterSchema.methods.clone = async function(newName, userId) {
  const clonedData = {
    clinicId: this.clinicId,
    name: newName,
    description: this.description,
    category: this.category,
    codes: this.codes.map(code => ({
      code: code.code,
      description: code.description,
      isActive: code.isActive
    })),
    createdBy: userId
  };

  const clonedCluster = new this.constructor(clonedData);
  return await clonedCluster.save();
};

const DxCluster = mongoose.models.DxCluster || mongoose.model('DxCluster', dxClusterSchema);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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
      // Get all Dx Clusters for a clinic
      const { category, favorites, search, includeHidden } = req.query;
      const { clinicId } = user;

      let clusters;
      
      if (search) {
        clusters = await DxCluster.searchClusters(clinicId, search, {
          category,
          includeHidden: includeHidden === 'true'
        });
      } else if (favorites === 'true') {
        clusters = await DxCluster.getFavorites(clinicId);
      } else {
        clusters = await DxCluster.findByClinic(clinicId, {
          category,
          includeHidden: includeHidden === 'true'
        });
      }

      res.json({
        success: true,
        clusters
      });

    } else if (req.method === 'POST') {
      // Create new Dx Cluster
      const { clinicId, userId } = user;
      const { name, description, codes, category } = req.body;

      // Validate required fields
      if (!name || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one ICD-10 code are required'
        });
      }

      // Check if cluster name already exists
      const existingCluster = await DxCluster.findOne({
        clinicId,
        name,
        isActive: true
      });

      if (existingCluster) {
        return res.status(400).json({
          success: false,
          message: 'A Dx Cluster with this name already exists'
        });
      }

      // Create new cluster
      const newCluster = new DxCluster({
        clinicId,
        name,
        description,
        codes,
        category: category || 'Custom',
        createdBy: userId || 'Unknown'
      });

      await newCluster.save();

      res.status(201).json({
        success: true,
        message: 'Dx Cluster created successfully',
        cluster: newCluster
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Dx Clusters API error:', error);
    
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
