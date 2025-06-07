import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Database connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Billing Cluster Schema
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
      required: [true, 'Code is required'],
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['CPT', 'HCPCS'],
      default: 'CPT'
    },
    unitRate: {
      type: Number,
      default: 0,
      min: 0
    },
    duration: {
      type: Number,
      default: 15,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    const { id } = req.query;
    const { clinicId, role } = user;

    // Only doctors can apply clusters
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Find the billing cluster
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

    // Update usage statistics
    await BillingCluster.findOneAndUpdate(
      { _id: id, clinicId },
      { 
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      }
    );

    // Return the codes from the cluster
    const codes = cluster.codes.filter(code => code.isActive).map(code => ({
      code: code.code,
      description: code.description,
      type: code.type,
      unitRate: code.unitRate,
      duration: code.duration,
      category: 'Billing',
      isPackage: false
    }));

    res.json({
      success: true,
      message: 'Billing cluster applied successfully',
      codes,
      clusterName: cluster.name
    });

  } catch (error) {
    console.error('Apply billing cluster error:', error);
    
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
