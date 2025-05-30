const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  clinicName: {
    type: String,
    required: [true, 'Clinic name is required'],
    trim: true,
    maxlength: [100, 'Clinic name cannot exceed 100 characters']
  },
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,10}$/, 'Clinic ID must be 3-10 characters, alphanumeric only']
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'USA'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt field before saving
clinicSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
clinicSchema.index({ clinicId: 1 });
clinicSchema.index({ clinicName: 1 });

module.exports = mongoose.model('Clinic', clinicSchema);
