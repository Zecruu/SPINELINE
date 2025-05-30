const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  // Core References
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required'],
    index: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required'],
    index: true
  },

  // Checkout Identification
  checkoutNumber: {
    type: String,
    unique: true,
    required: [true, 'Checkout number is required']
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: [true, 'Receipt number is required']
  },

  // Service Codes
  serviceCodes: [{
    code: {
      type: String,
      required: [true, 'Service code is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true
    },
    units: {
      type: Number,
      required: [true, 'Units is required'],
      min: [1, 'Units must be at least 1'],
      default: 1
    },
    unitRate: {
      type: Number,
      required: [true, 'Unit rate is required'],
      min: [0, 'Unit rate cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    }
  }],

  // Diagnostic Codes
  diagnosticCodes: [{
    code: {
      type: String,
      required: [true, 'Diagnostic code is required'],
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      required: [true, 'Diagnostic description is required'],
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Financial Information
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },

  // Payment Details
  paymentDetails: {
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance', 'Package', 'Other']
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative']
    },
    changeGiven: {
      type: Number,
      default: 0,
      min: [0, 'Change given cannot be negative']
    },
    signature: {
      type: String, // Base64 encoded signature
      required: [true, 'Patient signature is required']
    }
  },

  // Package Usage
  packageUsed: {
    packageId: {
      type: mongoose.Schema.Types.ObjectId
    },
    packageName: {
      type: String,
      trim: true
    },
    visitsUsedThisTransaction: {
      type: Number,
      default: 0,
      min: [0, 'Visits used cannot be negative']
    },
    remainingVisitsAfter: {
      type: Number,
      min: [0, 'Remaining visits cannot be negative']
    },
    packageValue: {
      type: Number,
      min: [0, 'Package value cannot be negative']
    }
  },

  // Next Appointment
  nextAppointment: {
    scheduledDate: {
      type: Date
    },
    scheduledTime: {
      type: String
    },
    visitType: {
      type: String,
      enum: ['New Patient', 'Regular Visit', 'Re-evaluation', 'Follow-Up', 'Consultation']
    },
    notes: {
      type: String,
      trim: true
    }
  },

  // Audit Information
  checkoutNotes: {
    type: String,
    trim: true
  },
  checkedOutBy: {
    type: String,
    required: [true, 'Checked out by is required']
  },
  checkedOutAt: {
    type: Date,
    default: Date.now,
    required: [true, 'Checked out at is required']
  },
  
  // System Metadata
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },

  // Status and Flags
  status: {
    type: String,
    enum: ['Completed', 'Voided', 'Refunded', 'Disputed'],
    default: 'Completed'
  },
  isVoided: {
    type: Boolean,
    default: false
  },
  voidedAt: {
    type: Date
  },
  voidedBy: {
    type: String
  },
  voidReason: {
    type: String,
    trim: true
  },

  // Alerts Triggered
  alertsTriggered: [{
    type: {
      type: String,
      enum: ['Referral Expiring', 'Insurance Expiring', 'Package Expiring', 'Payment Pending', 'Other']
    },
    message: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    triggeredAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
checkoutSchema.index({ clinicId: 1, patientId: 1 });
checkoutSchema.index({ clinicId: 1, checkedOutAt: -1 });
checkoutSchema.index({ checkoutNumber: 1 });
checkoutSchema.index({ receiptNumber: 1 });
checkoutSchema.index({ 'paymentDetails.paymentMethod': 1 });
checkoutSchema.index({ status: 1 });

// Pre-save middleware to update timestamps
checkoutSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate checkout number
checkoutSchema.pre('save', async function(next) {
  if (this.isNew && !this.checkoutNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
    const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.checkoutNumber = `CHK-${dateStr}-${timeStr}-${randomStr}`;
  }
  next();
});

// Generate receipt number
checkoutSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.receiptNumber = `RCP-${year}${month}${day}-${randomNum}`;
  }
  next();
});

// Virtual for formatted checkout date
checkoutSchema.virtual('formattedCheckoutDate').get(function() {
  return this.checkedOutAt.toLocaleDateString();
});

// Virtual for formatted checkout time
checkoutSchema.virtual('formattedCheckoutTime').get(function() {
  return this.checkedOutAt.toLocaleTimeString();
});

// Virtual for total services count
checkoutSchema.virtual('totalServicesCount').get(function() {
  return this.serviceCodes.length;
});

// Virtual for total diagnostics count
checkoutSchema.virtual('totalDiagnosticsCount').get(function() {
  return this.diagnosticCodes.length;
});

// Ensure virtuals are included in JSON output
checkoutSchema.set('toJSON', { virtuals: true });
checkoutSchema.set('toObject', { virtuals: true });

const Checkout = mongoose.model('Checkout', checkoutSchema);

module.exports = Checkout;
