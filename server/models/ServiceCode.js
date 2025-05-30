const mongoose = require('mongoose');

const serviceCodeSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Service code is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true
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
  unitRate: {
    type: Number,
    required: [true, 'Unit rate is required'],
    min: [0, 'Unit rate cannot be negative']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours (480 minutes)'],
    default: 15 // Default 15 minutes
  },

  // Insurance Coverage Information
  insuranceCoverage: [{
    type: String,
    enum: [
      'Medicare',
      'Medicaid',
      'Most Private Insurance',
      'Some Private Insurance',
      'Puerto Rico Health Insurance',
      'Workers Compensation',
      'Limited Coverage',
      'Some Medicare Plans',
      'Many Private Insurance'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPackage: {
    type: Boolean,
    default: false,
    index: true
  },
  // For packages only
  packageDetails: {
    totalSessions: {
      type: Number,
      min: [1, 'Total sessions must be at least 1']
    },
    includedCodes: [{
      code: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      unitsPerSession: {
        type: Number,
        default: 1,
        min: 1
      }
    }],
    validityDays: {
      type: Number,
      default: 90, // Package expires after 90 days
      min: 1
    }
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
serviceCodeSchema.index({ clinicId: 1, isActive: 1 });
serviceCodeSchema.index({ clinicId: 1, code: 1 }, { unique: true });
serviceCodeSchema.index({ clinicId: 1, isPackage: 1, isActive: 1 });

// Text index for search functionality
serviceCodeSchema.index({
  code: 'text',
  description: 'text'
}, {
  weights: {
    code: 10,
    description: 5
  }
});

// Virtual for package label
serviceCodeSchema.virtual('packageLabel').get(function() {
  return this.isPackage ? '(P)' : '';
});

// Virtual for display name
serviceCodeSchema.virtual('displayName').get(function() {
  return `${this.code} - ${this.description}${this.isPackage ? ' (P)' : ''}`;
});

// Pre-save middleware
serviceCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Validate package details if this is a package
  if (this.isPackage) {
    if (!this.packageDetails.totalSessions) {
      return next(new Error('Package must have total sessions defined'));
    }
    if (!this.packageDetails.includedCodes || this.packageDetails.includedCodes.length === 0) {
      return next(new Error('Package must have included codes defined'));
    }
  }

  next();
});

// Static methods
serviceCodeSchema.statics.findByClinic = function(clinicId, options = {}) {
  const query = { clinicId, isActive: true };

  if (options.isPackage !== undefined) {
    query.isPackage = options.isPackage;
  }

  return this.find(query).sort({ code: 1 });
};

serviceCodeSchema.statics.searchCodes = function(clinicId, searchTerm, options = {}) {
  const query = {
    clinicId,
    isActive: true,
    $or: [
      { code: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  if (options.isPackage !== undefined) {
    query.isPackage = options.isPackage;
  }

  return this.find(query)
    .sort({ code: 1 })
    .limit(options.limit || 20);
};

// Instance methods
serviceCodeSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

serviceCodeSchema.methods.getIncludedServices = function() {
  if (!this.isPackage) {
    return [];
  }
  return this.packageDetails.includedCodes;
};

// Ensure virtuals are included in JSON output
serviceCodeSchema.set('toJSON', { virtuals: true });
serviceCodeSchema.set('toObject', { virtuals: true });

const ServiceCode = mongoose.model('ServiceCode', serviceCodeSchema);

module.exports = ServiceCode;
