// Vercel API endpoint for diagnostic code search
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
    console.log('✅ MongoDB Connected for diagnostic code search');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// Diagnostic Code Schema
const diagnosticCodeSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Diagnostic code is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
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
      'Other'
    ],
    default: 'Other'
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
      'General',
      'Other'
    ],
    default: 'General'
  },
  commonlyUsed: {
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
diagnosticCodeSchema.index({ clinicId: 1, code: 1 }, { unique: true });
diagnosticCodeSchema.index({ clinicId: 1, category: 1, isActive: 1 });
diagnosticCodeSchema.index({ clinicId: 1, bodySystem: 1, isActive: 1 });
diagnosticCodeSchema.index({ clinicId: 1, commonlyUsed: 1, isActive: 1 });

// Text index for search functionality
diagnosticCodeSchema.index({
  code: 'text',
  description: 'text'
}, {
  weights: {
    code: 10,
    description: 5
  }
});

// Static search method
diagnosticCodeSchema.statics.searchCodes = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (options.category) {
    query.category = options.category;
  }

  if (options.bodySystem) {
    query.bodySystem = options.bodySystem;
  }

  if (options.commonlyUsed !== undefined) {
    query.commonlyUsed = options.commonlyUsed;
  }

  return this.find(query)
    .sort({ commonlyUsed: -1, usageCount: -1, code: 1 })
    .limit(options.limit || 50);
};

const DiagnosticCode = mongoose.models.DiagnosticCode || mongoose.model('DiagnosticCode', diagnosticCodeSchema);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    const { term } = req.query;
    const { category, bodySystem, commonlyUsed, limit = 20 } = req.query;
    const { clinicId } = user;

    if (!term || term.trim().length < 1) {
      return res.json({
        success: true,
        diagnosticCodes: []
      });
    }

    console.log(`🔍 Searching diagnostic codes for: "${term}" in clinic: ${clinicId}`);

    const options = {};
    if (category) options.category = category;
    if (bodySystem) options.bodySystem = bodySystem;
    if (commonlyUsed !== undefined) options.commonlyUsed = commonlyUsed === 'true';
    options.limit = parseInt(limit);

    const diagnosticCodes = await DiagnosticCode.searchCodes(
      clinicId,
      term.trim(),
      options
    );

    console.log(`📊 Found ${diagnosticCodes.length} diagnostic codes matching: "${term}"`);

    res.json({
      success: true,
      diagnosticCodes
    });

  } catch (error) {
    console.error('Search diagnostic codes error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error searching diagnostic codes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
