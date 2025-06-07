const mongoose = require('mongoose');

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
      required: [true, 'Code is required'],
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['CPT', 'HCPCS'],
      default: 'CPT'
    },
    unitRate: {
      type: Number,
      default: 0,
      min: 0
    },
    duration: {
      type: Number,
      default: 15,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
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

// Indexes for better performance
billingClusterSchema.index({ clinicId: 1, isActive: 1 });
billingClusterSchema.index({ clinicId: 1, name: 1 });
billingClusterSchema.index({ clinicId: 1, isFavorite: 1 });
billingClusterSchema.index({ clinicId: 1, usageCount: -1 });

// Static methods
billingClusterSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };
  
  if (options.category && options.category !== 'all') {
    query.tags = options.category;
  }
  
  return this.find(query).sort({ usageCount: -1, name: 1 });
};

billingClusterSchema.statics.getFavorites = function(clinicId) {
  return this.find({
    clinicId,
    isActive: true,
    isFavorite: true
  }).sort({ usageCount: -1, lastUsed: -1, name: 1 }).limit(10);
};

billingClusterSchema.statics.searchClusters = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'codes.code': { $regex: searchTerm, $options: 'i' } },
      { 'codes.description': { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (options.category && options.category !== 'all') {
    query.tags = options.category;
  }
  
  return this.find(query).sort({ usageCount: -1, name: 1 });
};

// Instance methods
billingClusterSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

billingClusterSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

// Pre-save middleware
billingClusterSchema.pre('save', function(next) {
  // Ensure codes are properly formatted
  if (this.codes && this.codes.length > 0) {
    this.codes.forEach(code => {
      if (code.code) {
        code.code = code.code.toUpperCase().trim();
      }
    });
  }
  next();
});

// Virtual for active codes count
billingClusterSchema.virtual('activeCodesCount').get(function() {
  return this.codes ? this.codes.filter(code => code.isActive).length : 0;
});

// Ensure virtual fields are serialized
billingClusterSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('BillingCluster', billingClusterSchema);
