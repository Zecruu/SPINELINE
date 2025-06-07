// Individual Billing Cluster API for Vercel
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log('MongoDB connected for billing cluster operations');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Billing Cluster Schema (same as main file)
const billingClusterSchema = new mongoose.Schema({
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
    trim: true,
    maxlength: [100, 'Cluster name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    enum: ['Neck', 'Back', 'Wellness', 'Spine', 'Extremity', 'Modality', 'Evaluation', 'Custom']
  }],
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
      enum: ['CPT', 'HCPCS'],
      required: true
    },
    unitRate: {
      type: Number,
      min: 0
    },
    duration: {
      type: Number,
      min: 1,
      default: 15
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
  }
}, { 
  timestamps: true 
});

const BillingCluster = mongoose.models.BillingCluster || mongoose.model('BillingCluster', billingClusterSchema);

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
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
    const { clinicId, role } = user;

    // Only doctors can access clusters
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    if (req.method === 'GET') {
      // Get single billing cluster
      const cluster = await BillingCluster.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Billing cluster not found'
        });
      }

      res.json({
        success: true,
        cluster
      });

    } else if (req.method === 'PUT') {
      // Update billing cluster
      const { name, description, tags, codes } = req.body;

      // Validate required fields
      if (!name || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one code are required'
        });
      }

      // Check if another cluster with the same name exists (excluding current)
      const existingCluster = await BillingCluster.findOne({
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
      const updatedCluster = await BillingCluster.findOneAndUpdate(
        { _id: id, clinicId, isActive: true },
        {
          name,
          description,
          tags: tags || [],
          codes,
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedCluster) {
        return res.status(404).json({
          success: false,
          message: 'Billing cluster not found'
        });
      }

      res.json({
        success: true,
        message: 'Billing cluster updated successfully',
        cluster: updatedCluster
      });

    } else if (req.method === 'DELETE') {
      // Delete billing cluster (soft delete)
      const cluster = await BillingCluster.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Billing cluster not found'
        });
      }

      // Prevent deletion of default clusters
      if (cluster.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default clusters. You can rename or edit them instead.'
        });
      }

      // Soft delete
      await BillingCluster.findOneAndUpdate(
        { _id: id, clinicId },
        { 
          isActive: false,
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'Billing cluster deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Billing cluster endpoint error:', error);
    
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
