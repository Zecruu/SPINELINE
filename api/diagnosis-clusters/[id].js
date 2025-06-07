// Individual Diagnosis Cluster API for Vercel
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
    console.log('MongoDB connected for diagnosis cluster operations');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Diagnosis Cluster Schema (same as main file)
const diagnosisClusterSchema = new mongoose.Schema({
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
    enum: ['Neck', 'Back', 'Wellness', 'Spine', 'Extremity', 'Acute', 'Chronic', 'Custom']
  }],
  codes: [{
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      required: true,
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
        'Endocrine',
        'Mental Health',
        'Injury/Trauma',
        'Symptoms/Signs',
        'Other'
      ],
      default: 'Musculoskeletal'
    },
    bodySystem: {
      type: String,
      enum: [
        'Spine',
        'Upper Extremity',
        'Lower Extremity',
        'Head/Neck',
        'Thorax',
        'Abdomen',
        'Pelvis',
        'Multiple Systems',
        'Other'
      ],
      default: 'Spine'
    },
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe', 'Unspecified'],
      default: 'Unspecified'
    },
    chronicity: {
      type: String,
      enum: ['Acute', 'Chronic', 'Subacute', 'Unspecified'],
      default: 'Unspecified'
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

const DiagnosisCluster = mongoose.models.DiagnosisCluster || mongoose.model('DiagnosisCluster', diagnosisClusterSchema);

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
      // Get single diagnosis cluster
      const cluster = await DiagnosisCluster.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Diagnosis cluster not found'
        });
      }

      res.json({
        success: true,
        cluster
      });

    } else if (req.method === 'PUT') {
      // Update diagnosis cluster
      const { name, description, tags, codes } = req.body;

      // Validate required fields
      if (!name || !codes || codes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least one code are required'
        });
      }

      // Check if another cluster with the same name exists (excluding current)
      const existingCluster = await DiagnosisCluster.findOne({
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
      const updatedCluster = await DiagnosisCluster.findOneAndUpdate(
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
          message: 'Diagnosis cluster not found'
        });
      }

      res.json({
        success: true,
        message: 'Diagnosis cluster updated successfully',
        cluster: updatedCluster
      });

    } else if (req.method === 'DELETE') {
      // Delete diagnosis cluster (soft delete)
      const cluster = await DiagnosisCluster.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!cluster) {
        return res.status(404).json({
          success: false,
          message: 'Diagnosis cluster not found'
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
      await DiagnosisCluster.findOneAndUpdate(
        { _id: id, clinicId },
        { 
          isActive: false,
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'Diagnosis cluster deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Diagnosis cluster endpoint error:', error);
    
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
