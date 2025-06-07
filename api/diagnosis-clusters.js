// Diagnosis Clusters API for Vercel
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
    console.log('MongoDB connected for diagnosis clusters');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Diagnosis Cluster Schema
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

// Compound indexes for efficient queries
diagnosisClusterSchema.index({ clinicId: 1, isActive: 1 });
diagnosisClusterSchema.index({ clinicId: 1, name: 1 }, { unique: true });
diagnosisClusterSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });

// Text index for search functionality
diagnosisClusterSchema.index({
  name: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    description: 5
  }
});

const DiagnosisCluster = mongoose.models.DiagnosisCluster || mongoose.model('DiagnosisCluster', diagnosisClusterSchema);

// Default diagnosis clusters
const defaultDiagnosisClusters = [
  {
    name: 'Cervical Dysfunction',
    description: 'Cervical subluxation & neck pain',
    tags: ['Neck', 'Spine'],
    codes: [
      { 
        code: 'M99.01', 
        description: 'Segmental and somatic dysfunction of cervical region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M54.2', 
        description: 'Cervicalgia', 
        category: 'Musculoskeletal',
        bodySystem: 'Head/Neck',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      }
    ]
  },
  {
    name: 'Thoracic Strain',
    description: 'Mid back pain and dysfunction',
    tags: ['Back', 'Spine'],
    codes: [
      { 
        code: 'M99.02', 
        description: 'Segmental and somatic dysfunction of thoracic region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M54.6', 
        description: 'Pain in thoracic spine', 
        category: 'Musculoskeletal',
        bodySystem: 'Thorax',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      }
    ]
  },
  {
    name: 'Lumbosacral Dysfunction',
    description: 'Low back subluxation & sciatica',
    tags: ['Back', 'Spine'],
    codes: [
      { 
        code: 'M99.03', 
        description: 'Segmental and somatic dysfunction of lumbar region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M54.5', 
        description: 'Low back pain', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      }
    ]
  },
  {
    name: 'Full Spine',
    description: 'Global spinal analysis and dysfunction',
    tags: ['Spine', 'Back', 'Neck'],
    codes: [
      { 
        code: 'M99.01', 
        description: 'Segmental and somatic dysfunction of cervical region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M99.02', 
        description: 'Segmental and somatic dysfunction of thoracic region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M99.03', 
        description: 'Segmental and somatic dysfunction of lumbar region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      },
      { 
        code: 'M99.04', 
        description: 'Segmental and somatic dysfunction of sacral region', 
        category: 'Musculoskeletal',
        bodySystem: 'Spine',
        severity: 'Unspecified',
        chronicity: 'Unspecified'
      }
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
      // Get all diagnosis clusters for a clinic
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
        clusters = await DiagnosisCluster.find({
          ...query,
          $text: { $search: search }
        }).sort({ score: { $meta: 'textScore' } });
      } else {
        clusters = await DiagnosisCluster.find(query).sort({ name: 1 });
      }

      // If no clusters exist, create default ones
      if (clusters.length === 0 && !search) {
        console.log(`🚀 Creating default diagnosis clusters for clinic: ${clinicId}`);
        
        for (const defaultCluster of defaultDiagnosisClusters) {
          const cluster = new DiagnosisCluster({
            ...defaultCluster,
            clinicId,
            isDefault: true,
            createdBy: user.name || user.email
          });
          await cluster.save();
        }

        // Reload clusters after creating defaults
        clusters = await DiagnosisCluster.find(query).sort({ name: 1 });
      }

      res.json({
        success: true,
        clusters
      });

    } else if (req.method === 'POST') {
      // Create new diagnosis cluster
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
      const existingCluster = await DiagnosisCluster.findOne({
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
      const newCluster = new DiagnosisCluster({
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
        message: 'Diagnosis cluster created successfully',
        cluster: newCluster
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Diagnosis clusters endpoint error:', error);
    
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
