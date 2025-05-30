const mongoose = require('mongoose');

// Insurance subdocument schema
const insuranceSchema = new mongoose.Schema({
  insuranceName: {
    type: String,
    required: [true, 'Insurance name is required'],
    trim: true
  },
  memberId: {
    type: String,
    required: [true, 'Member ID is required'],
    trim: true
  },
  groupId: {
    type: String,
    trim: true
  },
  copay: {
    type: Number,
    min: [0, 'Copay cannot be negative'],
    default: 0
  },
  expirationDate: {
    type: Date
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
});

// Referral subdocument schema
const referralSchema = new mongoose.Schema({
  source: {
    type: String,
    required: [true, 'Referral source is required'],
    trim: true
  },
  referralDate: {
    type: Date,
    required: [true, 'Referral date is required'],
    default: Date.now
  },
  expirationDate: {
    type: Date,
    required: [true, 'Referral expiration date is required']
  },
  remainingDays: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
});

// Package subdocument schema
const packageSchema = new mongoose.Schema({
  packageName: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true
  },
  packageCode: {
    type: String,
    trim: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId
  },
  totalVisits: {
    type: Number,
    required: [true, 'Total visits is required'],
    min: [1, 'Total visits must be at least 1']
  },
  usedVisits: {
    type: Number,
    default: 0,
    min: [0, 'Used visits cannot be negative']
  },
  remainingVisits: {
    type: Number,
    default: 0
  },
  packageCost: {
    type: Number,
    min: [0, 'Package cost cannot be negative']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expirationDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  includedCodes: [{
    code: String,
    description: String,
    unitRate: Number
  }]
});

// Alert subdocument schema
const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['Referral Expiring', 'Payment Pending', 'Important Note', 'Package Expiring', 'Other'],
    default: 'Important Note'
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
  isVisible: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: [true, 'Alert creator is required']
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  }
});

// File upload subdocument schema
const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    required: [true, 'File uploader is required']
  },
  category: {
    type: String,
    enum: ['X-Ray', 'MRI', 'CT Scan', 'Lab Report', 'Insurance Card', 'Referral', 'Other'],
    default: 'Other'
  }
});

// Main patient schema
const patientSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'USA'
    }
  },

  // Clinic and Record Information
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },
  recordNumber: {
    type: String,
    required: [true, 'Record number is required'],
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Active'
  },

  // Related Data
  insurances: [insuranceSchema],
  referrals: [referralSchema],
  packages: [packageSchema],
  alerts: [alertSchema],
  files: [fileSchema],

  // Metadata
  createdBy: {
    type: String,
    required: [true, 'Creator is required']
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
  },
  lastVisit: {
    type: Date
  },
  nextAppointment: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  doctorNotes: {
    type: String,
    trim: true
  },
  profilePic: {
    type: String,
    trim: true
  }
});

// Indexes for better performance
patientSchema.index({ clinicId: 1, recordNumber: 1 }, { unique: true });
patientSchema.index({ clinicId: 1, email: 1 });
patientSchema.index({ clinicId: 1, phone: 1 });
patientSchema.index({ clinicId: 1, lastName: 1, firstName: 1 });
patientSchema.index({ clinicId: 1, status: 1 });

// Pre-save middleware to update timestamps and calculate derived fields
patientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate remaining days for referrals
  this.referrals.forEach(referral => {
    if (referral.isActive && referral.expirationDate) {
      const today = new Date();
      const expDate = new Date(referral.expirationDate);
      const diffTime = expDate - today;
      referral.remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  });

  // Calculate remaining visits for packages
  this.packages.forEach(package => {
    if (package.isActive) {
      package.remainingVisits = package.totalVisits - package.usedVisits;
    }
  });

  next();
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Method to generate unique record number
patientSchema.statics.generateRecordNumber = async function(clinicId) {
  const currentYear = new Date().getFullYear();
  const prefix = `${clinicId}-${currentYear}`;

  // Find the highest record number for this clinic and year
  const lastPatient = await this.findOne({
    clinicId: clinicId,
    recordNumber: { $regex: `^${prefix}-` }
  }).sort({ recordNumber: -1 });

  let nextNumber = 1;
  if (lastPatient) {
    const lastNumber = parseInt(lastPatient.recordNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('Patient', patientSchema);
