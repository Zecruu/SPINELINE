// SOAP Templates API for Vercel
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
    console.log('✅ MongoDB connected for SOAP templates');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
};

// SOAP Template Schema
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

// Compound indexes for efficient queries
soapTemplateSchema.index({ clinicId: 1, isActive: 1 });
soapTemplateSchema.index({ clinicId: 1, templateName: 1 }, { unique: true });

// Text index for search functionality
soapTemplateSchema.index({
  templateName: 'text',
  description: 'text',
  subjective: 'text',
  objective: 'text',
  assessment: 'text',
  plan: 'text'
}, {
  weights: {
    templateName: 10,
    description: 5,
    subjective: 3,
    objective: 3,
    assessment: 3,
    plan: 3
  }
});

const SoapTemplate = mongoose.models.SoapTemplate || mongoose.model('SoapTemplate', soapTemplateSchema);

// Default SOAP templates
const defaultSoapTemplates = [
  {
    templateName: 'General Chiropractic Visit',
    description: 'Standard template for routine chiropractic visits',
    category: 'General',
    subjective: 'Patient reports {{chief_complaint}} with pain level of {{pain_scale}}/10. Symptoms have been present for {{duration}}. Pain is described as {{quality}} and is {{timing}}.',
    objective: 'Patient appears comfortable. Range of motion testing reveals restrictions in {{location}}. Palpation reveals tenderness and muscle tension in the {{location}} region.',
    assessment: 'Musculoskeletal dysfunction of the {{location}} with associated pain and restricted range of motion.',
    plan: 'Chiropractic manipulative treatment to {{location}}. Patient education on posture and ergonomics. Home exercises prescribed. Follow-up as needed.'
  },
  {
    templateName: 'New Patient Evaluation',
    description: 'Comprehensive template for new patient evaluations',
    category: 'Evaluation',
    subjective: 'New patient presents with {{chief_complaint}}. Pain level {{pain_scale}}/10. Onset: {{duration}} ago. Quality: {{quality}}. Aggravating factors: {{modifying_factors}}.',
    objective: 'Comprehensive examination performed. Orthopedic and neurological testing completed. Range of motion assessment shows {{location}} restrictions.',
    assessment: 'New patient with {{chief_complaint}}. Musculoskeletal dysfunction requiring chiropractic care.',
    plan: 'Initiate chiropractic treatment plan. Patient education provided. Home care instructions given. Schedule follow-up visits.'
  },
  {
    templateName: 'Follow-up Visit',
    description: 'Template for routine follow-up appointments',
    category: 'Follow-up',
    subjective: 'Patient returns for follow-up. Reports {{pain_scale}}/10 pain level (previous: [Previous Pain Level]). {{chief_complaint}} is {{timing}}.',
    objective: 'Patient shows {{timing}} improvement. Range of motion has {{timing}}. Palpation reveals {{timing}} muscle tension.',
    assessment: 'Patient responding {{timing}} to treatment. Continued musculoskeletal dysfunction of {{location}}.',
    plan: 'Continue current treatment plan. {{plan}}. Next visit scheduled.'
  }
];

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
      // Get all SOAP templates for a clinic
      const { category, search } = req.query;
      const { clinicId, role } = user;

      // Only doctors can access SOAP templates
      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      let query = { clinicId, isActive: true };

      let templates;
      
      if (search) {
        templates = await SoapTemplate.find({
          ...query,
          $text: { $search: search }
        }).sort({ score: { $meta: 'textScore' } });
      } else {
        if (category) {
          query.category = category;
        }
        templates = await SoapTemplate.find(query).sort({ templateName: 1 });
      }

      // If no templates exist, create default ones
      if (templates.length === 0 && !search) {
        console.log(`🚀 Creating default SOAP templates for clinic: ${clinicId}`);
        
        for (const defaultTemplate of defaultSoapTemplates) {
          const template = new SoapTemplate({
            ...defaultTemplate,
            clinicId,
            isDefault: true,
            createdBy: user.name || user.email
          });
          await template.save();
        }

        // Reload templates after creating defaults
        templates = await SoapTemplate.find(query).sort({ templateName: 1 });
      }

      res.json({
        success: true,
        templates
      });

    } else if (req.method === 'POST') {
      // Create new SOAP template
      const { clinicId, role, name } = user;

      if (role !== 'doctor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Doctor role required.'
        });
      }

      const { templateName, description, category, content } = req.body;

      // Validate required fields
      if (!templateName) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      // Check if template name already exists
      const existingTemplate = await SoapTemplate.findOne({
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

      // Create new template
      const newTemplate = new SoapTemplate({
        templateName,
        clinicId,
        description,
        category: category || 'General',
        subjective: content?.subjective || '',
        objective: content?.objective || '',
        assessment: content?.assessment || '',
        plan: content?.plan || '',
        createdBy: name || 'Unknown'
      });

      await newTemplate.save();

      res.status(201).json({
        success: true,
        message: 'SOAP template created successfully',
        template: newTemplate
      });

    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('SOAP templates endpoint error:', error);
    
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
