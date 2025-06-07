// Individual SOAP Template API for Vercel
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
    console.log('MongoDB connected for SOAP template operations');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// SOAP Template Schema (same as main file)
const soapTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },
  subjective: {
    type: String,
    trim: true,
    maxlength: [2000, 'Subjective content cannot exceed 2000 characters']
  },
  objective: {
    type: String,
    trim: true,
    maxlength: [2000, 'Objective content cannot exceed 2000 characters']
  },
  assessment: {
    type: String,
    trim: true,
    maxlength: [2000, 'Assessment content cannot exceed 2000 characters']
  },
  plan: {
    type: String,
    trim: true,
    maxlength: [2000, 'Plan content cannot exceed 2000 characters']
  },
  category: {
    type: String,
    trim: true,
    default: 'General',
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  lastUsed: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
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

const SoapTemplate = mongoose.models.SoapTemplate || mongoose.model('SoapTemplate', soapTemplateSchema);

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

    // Only doctors can access SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    if (req.method === 'GET') {
      // Get single SOAP template
      const template = await SoapTemplate.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'SOAP template not found'
        });
      }

      res.json({
        success: true,
        template
      });

    } else if (req.method === 'PUT') {
      // Update SOAP template
      const { templateName, description, category, content } = req.body;

      // Validate required fields
      if (!templateName) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      // Check if another template with the same name exists (excluding current)
      const existingTemplate = await SoapTemplate.findOne({
        _id: { $ne: id },
        clinicId,
        templateName,
        isActive: true
      });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'A template with this name already exists'
        });
      }

      // Update template
      const updatedTemplate = await SoapTemplate.findOneAndUpdate(
        { _id: id, clinicId, isActive: true },
        {
          templateName,
          description,
          category: category || 'General',
          subjective: content?.subjective || '',
          objective: content?.objective || '',
          assessment: content?.assessment || '',
          plan: content?.plan || '',
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedTemplate) {
        return res.status(404).json({
          success: false,
          message: 'SOAP template not found'
        });
      }

      res.json({
        success: true,
        message: 'SOAP template updated successfully',
        template: updatedTemplate
      });

    } else if (req.method === 'DELETE') {
      // Delete SOAP template (soft delete)
      const template = await SoapTemplate.findOne({ 
        _id: id, 
        clinicId, 
        isActive: true 
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'SOAP template not found'
        });
      }

      // Prevent deletion of default templates
      if (template.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete default templates. You can rename or edit them instead.'
        });
      }

      // Soft delete
      await SoapTemplate.findOneAndUpdate(
        { _id: id, clinicId },
        { 
          isActive: false,
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        }
      );

      res.json({
        success: true,
        message: 'SOAP template deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('SOAP template endpoint error:', error);
    
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
