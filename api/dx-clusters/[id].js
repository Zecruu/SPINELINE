// Individual Dx Cluster API for Vercel
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
    console.log('✅ MongoDB Connected for Dx Cluster operations');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// DX Cluster Schema (same as main file)
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

const DxCluster = mongoose.models.DxCluster || mongoose.model('DxCluster', dxClusterSchema);

// Verify token and get user info
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

    const { id } = req.query;
    const { clinicId } = user;

    if (req.method === 'GET') {
      // Get single Dx Cluster
      const cluster = await DxCluster.findOne({
        _id: id,
        clinicId,
        isActive: true
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Dx Cluster not found'
        });
      }

      res.json({
        success: true,
        cluster
      });

    } else if (req.method === 'PUT') {
      // Update Dx Cluster
      const { name, description, codes, category } = req.body;

      // Validate required fields
      if (!name || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one code are required'
        });
      }

      // Check if another cluster with the same name exists (excluding current)
      const existingCluster = await DxCluster.findOne({
        _id: { $ne: id },
        clinicId,
        name,
        isActive: true
      });

      if (existingCluster) {
        return res.status(400).json({
          success: false,
          message: 'A cluster with this name already exists'
        });
      }

      // Update cluster
      const updatedCluster = await DxCluster.findOneAndUpdate(
        { _id: id, clinicId, isActive: true },
        {
          name,
          description,
          codes,
          category: category || 'Custom',
          updatedBy: user.userId || user.name || 'Unknown',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedCluster) {
        return res.status(404).json({
          success: false,
          message: 'Dx Cluster not found'
        });
      }

      res.json({
        success: true,
        message: 'Dx Cluster updated successfully',
        cluster: updatedCluster
      });

    } else if (req.method === 'DELETE') {
      // Delete Dx Cluster (soft delete)
      const cluster = await DxCluster.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Dx Cluster not found'
        });
      }

      // Soft delete
      await DxCluster.findOneAndUpdate(
        { _id: id, clinicId },
        { 
          isActive: false,
          updatedBy: user.userId || user.name || 'Unknown',
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'Dx Cluster deleted successfully'
      });

    } else if (req.method === 'POST' && req.query.action === 'apply') {
      // Apply cluster (increment usage)
      const cluster = await DxCluster.findOne({
        _id: id,
        clinicId,
        isActive: true
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Dx Cluster not found'
        });
      }

      // Increment usage count
      cluster.usageCount += 1;
      cluster.lastUsed = new Date();
      cluster.updatedAt = new Date();
      await cluster.save();

      res.json({
        success: true,
        message: 'Dx Cluster applied successfully',
        codes: cluster.codes.filter(code => code.isActive)
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Dx Cluster API error:', error);
    
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
