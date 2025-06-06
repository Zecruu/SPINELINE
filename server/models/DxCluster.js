const mongoose = require('mongoose');

// Individual ICD-10 code within a cluster
const clusterCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'ICD-10 code is required'],
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Code description is required'],
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
  isActive: {
    type: Boolean,
    default: true
  }
});

// Main Dx Cluster schema
const dxClusterSchema = new mongoose.Schema({
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
  codes: [clusterCodeSchema],
  
  // Customization & Favorites
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
  isHidden: {
    type: Boolean,
    default: false,
    index: true
  },
  customName: {
    type: String,
    trim: true,
    maxlength: [100, 'Custom name cannot exceed 100 characters']
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
  
  // Metadata
  createdBy: {
    type: String,
    required: [true, 'Creator is required']
  },
  updatedBy: {
    type: String
  },
  originalClusterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DxCluster'
  },
  isCloned: {
    type: Boolean,
    default: false
  },
  
  // Categories for organization
  category: {
    type: String,
    enum: [
      'Spine Conditions',
      'Joint Disorders',
      'Muscle Injuries',
      'Neurological',
      'Pain Syndromes',
      'Post-Surgical',
      'Chronic Conditions',
      'Acute Injuries',
      'Custom',
      'Other'
    ],
    default: 'Custom'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// Compound indexes for efficient queries
dxClusterSchema.index({ clinicId: 1, isActive: 1 });
dxClusterSchema.index({ clinicId: 1, name: 1 }, { unique: true });
dxClusterSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });
dxClusterSchema.index({ clinicId: 1, category: 1, isActive: 1 });
dxClusterSchema.index({ clinicId: 1, isDefault: 1, isActive: 1 });

// Text index for search functionality
dxClusterSchema.index({
  name: 'text',
  description: 'text',
  'codes.code': 'text',
  'codes.description': 'text'
}, {
  weights: {
    name: 10,
    'codes.code': 8,
    description: 5,
    'codes.description': 3
  }
});

// Virtual for display name (uses custom name if available)
dxClusterSchema.virtual('displayName').get(function() {
  return this.customName || this.name;
});

// Virtual for code count
dxClusterSchema.virtual('codeCount').get(function() {
  return this.codes.filter(code => code.isActive).length;
});

// Pre-save middleware
dxClusterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validate that cluster has at least one active code
  const activeCodes = this.codes.filter(code => code.isActive);
  if (activeCodes.length === 0) {
    return next(new Error('Dx Cluster must have at least one active ICD-10 code'));
  }
  
  next();
});

// Static methods
dxClusterSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.isFavorite !== undefined) {
    query.isFavorite = options.isFavorite;
  }
  
  if (options.isDefault !== undefined) {
    query.isDefault = options.isDefault;
  }
  
  if (!options.includeHidden) {
    query.isHidden = { $ne: true };
  }
  
  return this.find(query)
    .sort({ isFavorite: -1, usageCount: -1, name: 1 });
};

dxClusterSchema.statics.searchClusters = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    isHidden: { $ne: true },
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'codes.code': { $regex: searchTerm, $options: 'i' } },
      { 'codes.description': { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query)
    .sort({ isFavorite: -1, usageCount: -1, name: 1 })
    .limit(options.limit || 20);
};

dxClusterSchema.statics.getFavorites = function(clinicId) {
  return this.find({ 
    clinicId, 
    isActive: true, 
    isFavorite: true,
    isHidden: { $ne: true }
  })
  .sort({ usageCount: -1, name: 1 });
};

// Instance methods
dxClusterSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

dxClusterSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

dxClusterSchema.methods.clone = function(newName, userId) {
  const clonedCluster = new this.constructor({
    clinicId: this.clinicId,
    name: newName,
    description: this.description,
    codes: this.codes.map(code => ({
      code: code.code,
      description: code.description,
      category: code.category,
      isActive: code.isActive
    })),
    category: this.category,
    createdBy: userId,
    originalClusterId: this._id,
    isCloned: true,
    isDefault: false
  });
  
  return clonedCluster.save();
};

dxClusterSchema.methods.addCode = function(codeData) {
  // Check if code already exists
  const existingCode = this.codes.find(c => c.code === codeData.code);
  if (existingCode) {
    existingCode.isActive = true;
    existingCode.description = codeData.description;
    existingCode.category = codeData.category;
  } else {
    this.codes.push(codeData);
  }
  return this.save();
};

dxClusterSchema.methods.removeCode = function(codeToRemove) {
  this.codes = this.codes.filter(code => code.code !== codeToRemove);
  return this.save();
};

// Ensure virtuals are included in JSON output
dxClusterSchema.set('toJSON', { virtuals: true });
dxClusterSchema.set('toObject', { virtuals: true });

const DxCluster = mongoose.model('DxCluster', dxClusterSchema);

module.exports = DxCluster;
