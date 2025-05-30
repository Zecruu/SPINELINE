const mongoose = require('mongoose');

// Ledger entry schema for financial tracking
const ledgerSchema = new mongoose.Schema({
  // Basic Information
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required']
  },

  // Transaction Details
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['Payment', 'Charge', 'Adjustment', 'Refund', 'Insurance Payment', 'Write-off'],
    default: 'Payment'
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },

  // Service Information
  serviceCodes: [{
    code: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    units: {
      type: Number,
      default: 1,
      min: 1
    },
    unitRate: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  // Diagnostic Codes
  diagnosticCodes: [{
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Financial Details
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },

  // Insurance Information
  insuranceInfo: {
    insuranceName: {
      type: String,
      trim: true
    },
    memberId: {
      type: String,
      trim: true
    },
    copayAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    deductibleAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    coverageAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    claimNumber: {
      type: String,
      trim: true
    }
  },

  // Package Information
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
      min: 0
    },
    remainingVisitsAfter: {
      type: Number,
      min: 0
    },
    packageValue: {
      type: Number,
      min: 0
    }
  },

  // Payment Information
  paymentDetails: {
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance', 'Package', 'Combination', 'Other']
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: 0
    },
    changeGiven: {
      type: Number,
      default: 0,
      min: 0
    },
    cardLast4: {
      type: String,
      trim: true,
      maxlength: 4
    },
    checkNumber: {
      type: String,
      trim: true
    },
    authorizationCode: {
      type: String,
      trim: true
    },
    signature: {
      type: String // Base64 encoded signature
    }
  },

  // Balance Tracking
  previousBalance: {
    type: Number,
    default: 0
  },
  newBalance: {
    type: Number,
    default: 0
  },

  // Status and Notes
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled', 'Refunded', 'Disputed'],
    default: 'Completed'
  },
  notes: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
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
      type: String
    },
    notes: {
      type: String,
      trim: true
    }
  },

  // Audit Information
  createdBy: {
    type: String,
    required: [true, 'Creator is required']
  },
  updatedBy: {
    type: String
  },
  processedBy: {
    type: String,
    required: [true, 'Processor is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Compliance and Tracking
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Appointment Action Tracking (for cancellations, reschedules)
  appointmentAction: {
    action: {
      type: String,
      enum: ['cancelled', 'rescheduled', 'no-show'],
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    originalDate: {
      type: Date
    },
    originalTime: {
      type: String
    },
    newDate: {
      type: Date
    },
    newTime: {
      type: String
    },
    actionDate: {
      type: Date,
      default: Date.now
    }
  },
  fiscalYear: {
    type: Number
  },
  fiscalMonth: {
    type: Number,
    min: 1,
    max: 12
  }
});

// Indexes for better performance
ledgerSchema.index({ clinicId: 1, transactionDate: -1 });
ledgerSchema.index({ clinicId: 1, patientId: 1, transactionDate: -1 });
ledgerSchema.index({ clinicId: 1, appointmentId: 1 });
ledgerSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });
ledgerSchema.index({ clinicId: 1, status: 1, transactionDate: -1 });

// Pre-save middleware
ledgerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate totals
  if (this.serviceCodes && this.serviceCodes.length > 0) {
    this.subtotal = this.serviceCodes.reduce((sum, service) => sum + service.totalAmount, 0);
    this.totalAmount = this.subtotal + this.taxAmount;
  }

  // Set fiscal year and month
  const transactionDate = new Date(this.transactionDate);
  this.fiscalYear = transactionDate.getFullYear();
  this.fiscalMonth = transactionDate.getMonth() + 1;

  // Generate receipt number if not provided
  if (!this.receiptNumber && this.status === 'Completed') {
    const timestamp = Date.now().toString();
    const clinicPrefix = this.clinicId.substring(0, 3);
    this.receiptNumber = `${clinicPrefix}-${timestamp.slice(-8)}`;
  }

  next();
});

// Virtual for formatted receipt number
ledgerSchema.virtual('formattedReceiptNumber').get(function() {
  if (!this.receiptNumber) return 'N/A';
  return this.receiptNumber;
});

// Virtual for total services amount
ledgerSchema.virtual('servicesTotal').get(function() {
  if (!this.serviceCodes || this.serviceCodes.length === 0) return 0;
  return this.serviceCodes.reduce((sum, service) => sum + service.totalAmount, 0);
});

// Method to calculate patient balance
ledgerSchema.methods.calculateBalance = function() {
  if (this.transactionType === 'Payment' || this.transactionType === 'Insurance Payment') {
    return this.previousBalance - this.paymentDetails.amountPaid;
  } else if (this.transactionType === 'Charge') {
    return this.previousBalance + this.totalAmount;
  } else if (this.transactionType === 'Refund') {
    return this.previousBalance + this.paymentDetails.amountPaid;
  } else {
    return this.previousBalance;
  }
};

// Static method to get patient balance
ledgerSchema.statics.getPatientBalance = async function(clinicId, patientId) {
  const result = await this.aggregate([
    {
      $match: {
        clinicId,
        patientId: new mongoose.Types.ObjectId(patientId),
        status: 'Completed'
      }
    },
    {
      $group: {
        _id: null,
        totalCharges: {
          $sum: {
            $cond: [
              { $in: ['$transactionType', ['Charge']] },
              '$totalAmount',
              0
            ]
          }
        },
        totalPayments: {
          $sum: {
            $cond: [
              { $in: ['$transactionType', ['Payment', 'Insurance Payment']] },
              '$paymentDetails.amountPaid',
              0
            ]
          }
        },
        totalRefunds: {
          $sum: {
            $cond: [
              { $in: ['$transactionType', ['Refund']] },
              '$paymentDetails.amountPaid',
              0
            ]
          }
        }
      }
    }
  ]);

  if (result.length === 0) return 0;

  const { totalCharges, totalPayments, totalRefunds } = result[0];
  return totalCharges - totalPayments + totalRefunds;
};

// Static method to get clinic daily summary
ledgerSchema.statics.getDailySummary = function(clinicId, date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  return this.aggregate([
    {
      $match: {
        clinicId,
        transactionDate: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        status: 'Completed'
      }
    },
    {
      $group: {
        _id: '$transactionType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paymentDetails.amountPaid' }
      }
    }
  ]);
};

module.exports = mongoose.model('Ledger', ledgerSchema);
