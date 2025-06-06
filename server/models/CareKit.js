const mongoose = require('mongoose');

// Individual CPT code within a care kit
const kitServiceSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'CPT code is required'],
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true
  },
  unitCount: {
    type: Number,
    default: 1,
    min: [1, 'Unit count must be at least 1'],
    max: [20, 'Unit count cannot exceed 20']
  },
  unitRate: {
    type: Number,
    required: [true, 'Unit rate is required'],
    min: [0, 'Unit rate cannot be negative']
  },
  category: {
    type: String,
    enum: [
      'Evaluation',
      'Therapeutic Procedures',
      'Physical Medicine Modalities',
      'Manual Therapy',
      'Exercise',
      'Chiropractic Manipulation',
      'Office Visits',
      'Radiology',
      'Acupuncture',
      'Work Conditioning',
      'Other'
    ],
    default: 'Other'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Main Care Kit schema
const careKitSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Care kit name is required'],
    trim: true,
    maxlength: [100, 'Care kit name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  services: [kitServiceSchema],
  
  // Pricing and totals
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
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
  originalKitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareKit'
  },
  isCloned: {
    type: Boolean,
    default: false
  },
  
  // Categories for organization
  category: {
    type: String,
    enum: [
      'Initial Evaluation',
      'Follow-up Treatment',
      'Maintenance Care',
      'Acute Care Package',
      'Chronic Care Package',
      'Post-Surgical',
      'Sports Injury',
      'Wellness Package',
      'Custom',
      'Other'
    ],
    default: 'Custom'
  },
  
  // Treatment type
  treatmentType: {
    type: String,
    enum: [
      'Chiropractic',
      'Physical Therapy',
      'Massage Therapy',
      'Acupuncture',
      'Combined Therapy',
      'Evaluation Only',
      'Other'
    ],
    default: 'Chiropractic'
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
careKitSchema.index({ clinicId: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, name: 1 }, { unique: true });
careKitSchema.index({ clinicId: 1, isFavorite: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, category: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, treatmentType: 1, isActive: 1 });
careKitSchema.index({ clinicId: 1, isDefault: 1, isActive: 1 });

// Text index for search functionality
careKitSchema.index({
  name: 'text',
  description: 'text',
  'services.code': 'text',
  'services.description': 'text'
}, {
  weights: {
    name: 10,
    'services.code': 8,
    description: 5,
    'services.description': 3
  }
});

// Virtual for display name (uses custom name if available)
careKitSchema.virtual('displayName').get(function() {
  return this.customName || this.name;
});

// Virtual for service count
careKitSchema.virtual('serviceCount').get(function() {
  return this.services.filter(service => service.isActive).length;
});

// Virtual for final amount after discount
careKitSchema.virtual('finalAmount').get(function() {
  return this.totalAmount - this.discountAmount;
});

// Pre-save middleware
careKitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total amount from active services
  this.totalAmount = this.services
    .filter(service => service.isActive)
    .reduce((total, service) => total + (service.unitCount * service.unitRate), 0);
  
  // Calculate discount amount if percentage is set
  if (this.discountPercentage > 0) {
    this.discountAmount = (this.totalAmount * this.discountPercentage) / 100;
  }
  
  // Validate that kit has at least one active service
  const activeServices = this.services.filter(service => service.isActive);
  if (activeServices.length === 0) {
    return next(new Error('Care Kit must have at least one active service'));
  }
  
  next();
});

// Static methods
careKitSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.treatmentType) {
    query.treatmentType = options.treatmentType;
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

careKitSchema.statics.searchKits = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    isHidden: { $ne: true },
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'services.code': { $regex: searchTerm, $options: 'i' } },
      { 'services.description': { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.treatmentType) {
    query.treatmentType = options.treatmentType;
  }
  
  return this.find(query)
    .sort({ isFavorite: -1, usageCount: -1, name: 1 })
    .limit(options.limit || 20);
};

careKitSchema.statics.getFavorites = function(clinicId) {
  return this.find({ 
    clinicId, 
    isActive: true, 
    isFavorite: true,
    isHidden: { $ne: true }
  })
  .sort({ usageCount: -1, name: 1 });
};

// Instance methods
careKitSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

careKitSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};

careKitSchema.methods.clone = function(newName, userId) {
  const clonedKit = new this.constructor({
    clinicId: this.clinicId,
    name: newName,
    description: this.description,
    services: this.services.map(service => ({
      code: service.code,
      description: service.description,
      unitCount: service.unitCount,
      unitRate: service.unitRate,
      category: service.category,
      isActive: service.isActive
    })),
    category: this.category,
    treatmentType: this.treatmentType,
    discountPercentage: this.discountPercentage,
    createdBy: userId,
    originalKitId: this._id,
    isCloned: true,
    isDefault: false
  });
  
  return clonedKit.save();
};

careKitSchema.methods.addService = function(serviceData) {
  // Check if service already exists
  const existingService = this.services.find(s => s.code === serviceData.code);
  if (existingService) {
    existingService.isActive = true;
    existingService.description = serviceData.description;
    existingService.unitCount = serviceData.unitCount;
    existingService.unitRate = serviceData.unitRate;
    existingService.category = serviceData.category;
  } else {
    this.services.push(serviceData);
  }
  return this.save();
};

careKitSchema.methods.removeService = function(codeToRemove) {
  this.services = this.services.filter(service => service.code !== codeToRemove);
  return this.save();
};

// Ensure virtuals are included in JSON output
careKitSchema.set('toJSON', { virtuals: true });
careKitSchema.set('toObject', { virtuals: true });

const CareKit = mongoose.model('CareKit', careKitSchema);

module.exports = CareKit;
