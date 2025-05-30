const mongoose = require('mongoose');

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
    required: [true, 'ICD-10 code is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Diagnostic description is required'],
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
      'Multiple Systems',
      'Other'
    ],
    default: 'Other'
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
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUsed: {
    type: Date
  },
  // Additional metadata
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
  // Related codes for cross-referencing
  relatedCodes: [{
    code: String,
    description: String,
    relationship: {
      type: String,
      enum: ['Parent', 'Child', 'Related', 'Alternative']
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
diagnosticCodeSchema.index({ clinicId: 1, isActive: 1 });
diagnosticCodeSchema.index({ clinicId: 1, code: 1 }, { unique: true });
diagnosticCodeSchema.index({ clinicId: 1, commonlyUsed: 1, isActive: 1 });
diagnosticCodeSchema.index({ clinicId: 1, category: 1, isActive: 1 });
diagnosticCodeSchema.index({ clinicId: 1, bodySystem: 1, isActive: 1 });

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

// Virtual for display name
diagnosticCodeSchema.virtual('displayName').get(function() {
  return `${this.code} - ${this.description}`;
});

// Virtual for full description with category
diagnosticCodeSchema.virtual('fullDescription').get(function() {
  return `${this.code} - ${this.description} (${this.category})`;
});

// Pre-save middleware
diagnosticCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure code is uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  
  next();
});

// Static methods
diagnosticCodeSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.bodySystem) {
    query.bodySystem = options.bodySystem;
  }
  
  if (options.commonlyUsed !== undefined) {
    query.commonlyUsed = options.commonlyUsed;
  }
  
  return this.find(query).sort({ commonlyUsed: -1, usageCount: -1, code: 1 });
};

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
    .limit(options.limit || 20);
};

diagnosticCodeSchema.statics.getCommonCodes = function(clinicId, limit = 10) {
  return this.find({ 
    clinicId, 
    isActive: true, 
    commonlyUsed: true 
  })
  .sort({ usageCount: -1, code: 1 })
  .limit(limit);
};

diagnosticCodeSchema.statics.getByCategory = function(clinicId, category) {
  return this.find({ 
    clinicId, 
    isActive: true, 
    category 
  })
  .sort({ commonlyUsed: -1, usageCount: -1, code: 1 });
};

// Instance methods
diagnosticCodeSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

diagnosticCodeSchema.methods.markAsCommon = function() {
  this.commonlyUsed = true;
  return this.save();
};

diagnosticCodeSchema.methods.addRelatedCode = function(relatedCode) {
  if (!this.relatedCodes.find(rc => rc.code === relatedCode.code)) {
    this.relatedCodes.push(relatedCode);
    return this.save();
  }
  return Promise.resolve(this);
};

// Ensure virtuals are included in JSON output
diagnosticCodeSchema.set('toJSON', { virtuals: true });
diagnosticCodeSchema.set('toObject', { virtuals: true });

const DiagnosticCode = mongoose.model('DiagnosticCode', diagnosticCodeSchema);

module.exports = DiagnosticCode;
