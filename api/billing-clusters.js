// Billing Clusters API for Vercel
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
    console.log('MongoDB connected for billing clusters');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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

// Compound indexes for efficient queries
billingClusterSchema.index({ clinicId: 1, isActive: 1 });
billingClusterSchema.index({ clinicId: 1, name: 1 }, { unique: true });
billingClusterSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });

// Text index for search functionality
billingClusterSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  }
});

const BillingCluster = mongoose.models.BillingCluster || mongoose.model('BillingCluster', billingClusterSchema);

// Default billing clusters
const defaultBillingClusters = [
  {
    name: 'Spinal Basic',
    description: 'Simple spinal adjustment with traction',
    tags: ['Spine', 'Back'],
    codes: [
      { code: '98940', description: 'Chiropractic manipulative treatment; spinal, 1-2 regions', type: 'CPT', unitRate: 85, duration: 15 },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', unitRate: 35, duration: 15 }
    ]
  },
  {
    name: 'Spinal Intermediate',
    description: 'Moderate complexity with decompression',
    tags: ['Spine', 'Back'],
    codes: [
      { code: '98941', description: 'Chiropractic manipulative treatment; spinal, 3-4 regions', type: 'CPT', unitRate: 95, duration: 20 },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', unitRate: 35, duration: 15 }
    ]
  },
  {
    name: 'Spinal Complex',
    description: 'Full spinal treatment with EMS',
    tags: ['Spine', 'Back', 'Modality'],
    codes: [
      { code: '98942', description: 'Chiropractic manipulative treatment; spinal, 5 regions', type: 'CPT', unitRate: 105, duration: 25 },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', unitRate: 35, duration: 15 },
      { code: 'G0283', description: 'Electrical stimulation (unattended), to one or more areas for indication(s) other than wound care', type: 'HCPCS', unitRate: 25, duration: 15 }
    ]
  },
  {
    name: 'E&M Baseline',
    description: 'New patient evaluation with basic treatment',
    tags: ['Evaluation', 'Spine'],
    codes: [
      { code: '99203', description: 'Office or other outpatient visit for the evaluation and management of a new patient', type: 'CPT', unitRate: 150, duration: 30 },
      { code: '98940', description: 'Chiropractic manipulative treatment; spinal, 1-2 regions', type: 'CPT', unitRate: 85, duration: 15 }
    ]
  }
];

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
      // Get all billing clusters for a clinic
      const { category, favorites, search } = req.query;
      const { clinicId, role } = user;

      // Only doctors can access clusters
      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      let query = { clinicId, isActive: true };

      // Apply filters
      if (favorites === 'true') {
        query.isFavorite = true;
      }

      let clusters;
      
      if (search) {
        clusters = await BillingCluster.find({
          ...query,
          $text: { $search: search }
        }).sort({ score: { $meta: 'textScore' } });
      } else {
        clusters = await BillingCluster.find(query).sort({ name: 1 });
      }

      // If no clusters exist, create default ones
      if (clusters.length === 0 && !search) {
        console.log(`🚀 Creating default billing clusters for clinic: ${clinicId}`);
        
        for (const defaultCluster of defaultBillingClusters) {
          const cluster = new BillingCluster({
            ...defaultCluster,
            clinicId,
            isDefault: true,
            createdBy: user.name || user.email
          });
          await cluster.save();
        }

        // Reload clusters after creating defaults
        clusters = await BillingCluster.find(query).sort({ name: 1 });
      }

      res.json({
        success: true,
        clusters
      });

    } else if (req.method === 'POST') {
      // Create new billing cluster
      const { clinicId, role, name } = user;

      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      const { name: clusterName, description, tags, codes } = req.body;

      // Validate required fields
      if (!clusterName || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one code are required'
        });
      }

      // Check if cluster name already exists
      const existingCluster = await BillingCluster.findOne({
        clinicId,
        name: clusterName,
        isActive: true
      });

      if (existingCluster) {
        return res.status(400).json({
          success: false,
          message: 'A cluster with this name already exists'
        });
      }

      // Create new cluster
      const newCluster = new BillingCluster({
        clinicId,
        name: clusterName,
        description,
        tags: tags || [],
        codes,
        createdBy: name || 'Unknown'
      });

      await newCluster.save();

      res.status(201).json({
        success: true,
        message: 'Billing cluster created successfully',
        cluster: newCluster
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Billing clusters endpoint error:', error);
    
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
