const mongoose = require('mongoose');

const soapTemplateSchema = new mongoose.Schema({
  // Template identification
  templateName: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },

  // Clinic association
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },

  // Template content
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

  // Remove default pain scale - doctors should assess each visit individually
  // defaultPain field removed to encourage proper pain assessment

  // Template metadata
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

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },

  lastUsed: {
    type: Date
  },

  // Template status
  isActive: {
    type: Boolean,
    default: true
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  // Audit fields
  createdBy: {
    type: String,
    required: [true, 'Creator is required'],
    trim: true
  },

  updatedBy: {
    type: String,
    trim: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'soaptemplates'
});

// Indexes for performance
soapTemplateSchema.index({ clinicId: 1, isActive: 1 });
soapTemplateSchema.index({ clinicId: 1, templateName: 1 }, { unique: true });
soapTemplateSchema.index({ clinicId: 1, category: 1 });
soapTemplateSchema.index({ clinicId: 1, usageCount: -1 });

// Static method to get templates for a clinic
soapTemplateSchema.statics.getTemplatesForClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (options.category) {
    query.category = options.category;
  }

  let sortBy = { usageCount: -1, templateName: 1 }; // Most used first
  if (options.sortBy === 'name') {
    sortBy = { templateName: 1 };
  } else if (options.sortBy === 'recent') {
    sortBy = { updatedAt: -1 };
  }

  return this.find(query)
    .sort(sortBy)
    .limit(options.limit || 50);
};

// Static method to search templates
soapTemplateSchema.statics.searchTemplates = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { templateName: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  return this.find(query)
    .sort({ usageCount: -1, templateName: 1 })
    .limit(options.limit || 20);
};

// Instance method to increment usage
soapTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Instance method to apply macros
soapTemplateSchema.methods.applyMacros = function(macroValues = {}) {
  const template = this.toObject();

  // Default macro values - no default pain scale
  const defaultMacros = {
    patient_name: macroValues.patient_name || '[Patient Name]',
    pain_scale: macroValues.pain_scale || '[Pain Scale]', // No default - requires doctor assessment
    visit_type: macroValues.visit_type || 'Regular Visit',
    today: new Date().toLocaleDateString(),
    doctor_name: macroValues.doctor_name || '[Doctor Name]',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    chief_complaint: macroValues.chief_complaint || '[Chief Complaint]',
    duration: macroValues.duration || '[Duration]',
    location: macroValues.location || '[Location]',
    quality: macroValues.quality || '[Quality]',
    severity: macroValues.severity || '[Severity]',
    timing: macroValues.timing || '[Timing]',
    context: macroValues.context || '[Context]',
    modifying_factors: macroValues.modifying_factors || '[Modifying Factors]',
    associated_symptoms: macroValues.associated_symptoms || '[Associated Symptoms]'
  };

  // Merge with provided values
  const allMacros = { ...defaultMacros, ...macroValues };

  // Replace macros in each field
  const fields = ['subjective', 'objective', 'assessment', 'plan'];
  fields.forEach(field => {
    if (template[field]) {
      Object.keys(allMacros).forEach(macro => {
        const regex = new RegExp(`{{${macro}}}`, 'g');
        template[field] = template[field].replace(regex, allMacros[macro]);
      });
    }
  });

  return {
    subjective: template.subjective || '',
    objective: template.objective || '',
    assessment: template.assessment || '',
    plan: template.plan || '',
    painScale: null // No default pain scale - requires fresh assessment
  };
};

// Pre-save middleware
soapTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SoapTemplate', soapTemplateSchema);
