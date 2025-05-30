const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['doctor', 'secretary', 'admin'],
      message: 'Role must be either doctor, secretary, or admin'
    }
  },
  clinicId: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    },
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Profile fields
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  specialty: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  profilePic: {
    type: String
  },
  // Professional credentials
  npiNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'NPI number must be exactly 10 digits'
    }
  },
  businessNpiNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Business NPI number must be exactly 10 digits'
    }
  },
  taxonomyCode: {
    type: String,
    trim: true
  },
  licenseState: {
    type: String,
    trim: true,
    uppercase: true
  },
  isNpiVerified: {
    type: Boolean,
    default: false
  },
  // Settings
  notificationSettings: {
    emailAlerts: { type: Boolean, default: true },
    newPatientAlerts: { type: Boolean, default: true },
    flaggedPatientAlerts: { type: Boolean, default: true },
    appointmentReminders: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: false }
  },
  signatureImage: {
    type: String
  },
  autoSign: {
    type: Boolean,
    default: false
  },
  defaultPreferences: {
    defaultDuration: { type: Number, default: 15 },
    defaultVisitType: { type: String, default: 'Follow-Up' },
    defaultTemplate: { type: String, default: '' },
    autoSaveNotes: { type: Boolean, default: true }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  if (!this.isModified('passwordHash')) {
    this.updatedAt = Date.now();
  }
  next();
});

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ clinicId: 1 });
userSchema.index({ role: 1 });

// Virtual to populate clinic information
userSchema.virtual('clinic', {
  ref: 'Clinic',
  localField: 'clinicId',
  foreignField: 'clinicId',
  justOne: true
});

module.exports = mongoose.model('User', userSchema);
