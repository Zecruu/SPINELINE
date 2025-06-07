// Individual Alert Template API for Vercel
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

    const conn = await mongoose.connect(mongoUri, {
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

    isConnected = conn.connections[0].readyState === 1;
    console.log('✅ MongoDB connected for alert template operations');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
};

// Alert Template Schema (same as main file)
const alertTemplateSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
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
      'Patient Care',
      'Billing',
      'Insurance',
      'Scheduling',
      'Treatment',
      'Follow-up',
      'Administrative',
      'Emergency',
      'Custom',
      'Other'
    ],
    default: 'Custom'
  },
  alertType: {
    type: String,
    enum: ['Info', 'Warning', 'Critical', 'Success'],
    default: 'Info'
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  triggers: [{
    event: {
      type: String,
      required: true,
      enum: [
        'patient_checkin',
        'patient_checkout',
        'appointment_scheduled',
        'appointment_cancelled',
        'insurance_expired',
        'package_exhausted',
        'coverage_low',
        'payment_overdue',
        'custom'
      ]
    },
    condition: {
      type: String,
      trim: true
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

const AlertTemplate = mongoose.models.AlertTemplate || mongoose.model('AlertTemplate', alertTemplateSchema);

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
      // Get single alert template
      const template = await AlertTemplate.findOne({
        _id: id,
        clinicId,
        isActive: true
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Alert template not found'
        });
      }

      res.json({
        success: true,
        template
      });

    } else if (req.method === 'PUT') {
      // Update alert template
      const { 
        name, 
        description, 
        category, 
        alertType, 
        message, 
        priority, 
        triggers 
      } = req.body;

      // Validate required fields
      if (!name || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name and message are required'
        });
      }

      // Check if another template with the same name exists (excluding current)
      const existingTemplate = await AlertTemplate.findOne({
        _id: { $ne: id },
        clinicId,
        name,
        isActive: true
      });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'A template with this name already exists'
        });
      }

      // Update template
      const updatedTemplate = await AlertTemplate.findOneAndUpdate(
        { _id: id, clinicId, isActive: true },
        {
          name,
          description,
          category: category || 'Custom',
          alertType: alertType || 'Info',
          message,
          priority: priority || 'Medium',
          triggers: triggers || [],
          updatedBy: user.userId || user.name || 'Unknown',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Alert template not found'
        });
      }

      res.json({
        success: true,
        message: 'Alert template updated successfully',
        template: updatedTemplate
      });

    } else if (req.method === 'DELETE') {
      // Delete alert template (soft delete)
      const template = await AlertTemplate.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Alert template not found'
        });
      }

      // Soft delete
      await AlertTemplate.findOneAndUpdate(
        { _id: id, clinicId },
        { 
          isActive: false,
          updatedBy: user.userId || user.name || 'Unknown',
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'Alert template deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Alert Template API error:', error);
    
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
