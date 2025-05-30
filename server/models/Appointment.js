const mongoose = require('mongoose');

// Appointment schema
const appointmentSchema = new mongoose.Schema({
  // Basic Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },

  // Appointment Details
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Minimum appointment duration is 15 minutes'],
    max: [240, 'Maximum appointment duration is 4 hours']
  },

  // Visit Information
  visitType: {
    type: String,
    required: [true, 'Visit type is required'],
    enum: [
      'New Patient',
      'Re-evaluation',
      'Regular Visit',
      'Initial Consultation',
      'Follow-Up',
      'Treatment',
      'Maintenance',
      'Emergency',
      'Consultation',
      'Other'
    ],
    default: 'Regular Visit'
  },
  colorTag: {
    type: String,
    enum: ['green', 'yellow', 'blue', 'white', 'red'],
    default: 'green'
  },
  chiefComplaint: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },

  // Status Tracking
  status: {
    type: String,
    enum: ['Scheduled', 'Checked-In', 'In Treatment', 'Checked-Out', 'In Progress', 'Completed', 'No-Show', 'Cancelled'],
    default: 'Scheduled'
  },

  // Appointment Confirmation Status (for Scheduled appointments)
  confirmationStatus: {
    type: String,
    enum: ['Unconfirmed', 'Confirmed'],
    default: 'Unconfirmed'
  },
  confirmedAt: {
    type: Date
  },
  confirmedBy: {
    type: String,
    trim: true
  },

  // Treatment Status (for Checked-In appointments)
  treatmentStatus: {
    type: String,
    enum: ['In Progress', 'Ready for Checkout'],
    default: 'In Progress'
  },
  readyForCheckoutAt: {
    type: Date
  },
  readyForCheckoutBy: {
    type: String,
    trim: true
  },

  checkedInAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },

  // Provider Information
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  providerName: {
    type: String,
    trim: true
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Treatment Information
  treatmentCodes: [{
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
    rate: {
      type: Number,
      min: 0
    }
  }],

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

  // Package Usage
  packageUsed: {
    packageId: {
      type: mongoose.Schema.Types.ObjectId
    },
    packageName: {
      type: String,
      trim: true
    },
    visitsUsed: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Financial Information
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  copayAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  insuranceCoverage: {
    type: Number,
    default: 0,
    min: 0
  },
  patientResponsibility: {
    type: Number,
    default: 0,
    min: 0
  },

  // Checkout Information
  isCheckedOut: {
    type: Boolean,
    default: false
  },
  checkoutData: {
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance', 'Package', 'Other']
    },
    amountPaid: {
      type: Number,
      min: 0
    },
    changeGiven: {
      type: Number,
      min: 0
    },
    signature: {
      type: String // Base64 encoded signature
    },
    checkoutNotes: {
      type: String,
      trim: true
    },
    nextAppointment: {
      date: Date,
      time: String,
      visitType: String
    }
  },

  // Visit Data (Doctor's clinical notes and findings)
  visitData: {
    diagnoses: [{
      code: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    procedureCodes: [{
      code: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      units: {
        type: Number,
        default: 1
      }
    }],
    notes: {
      type: String,
      trim: true
    },
    soapNotes: {
      subjective: {
        type: String,
        trim: true
      },
      objective: {
        type: String,
        trim: true
      },
      assessment: {
        type: String,
        trim: true
      },
      plan: {
        type: String,
        trim: true
      },
      painScale: {
        type: Number,
        min: 1,
        max: 10
      },
      createdBy: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date
      },
      updatedBy: {
        type: String,
        trim: true
      },
      updatedAt: {
        type: Date
      }
    },
    physicalExam: {
      type: mongoose.Schema.Types.Mixed // Flexible structure for exam findings
    },
    doctorSignature: {
      type: String // Base64 encoded signature
    },
    completedAt: {
      type: Date
    },
    completedBy: {
      type: String,
      trim: true
    }
  },

  // Action tracking for history
  actionTaken: {
    type: String,
    trim: true
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  rescheduleReason: {
    type: String,
    trim: true
  },

  // Appointment history timeline
  history: [{
    action: {
      type: String,
      enum: ['created', 'rescheduled', 'cancelled', 'checked-in', 'checked-out', 'no-show'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    previousData: {
      appointmentDate: Date,
      appointmentTime: String,
      status: String
    },
    newData: {
      appointmentDate: Date,
      appointmentTime: String,
      status: String
    }
  }],

  // Metadata
  createdBy: {
    type: String,
    required: [true, 'Creator is required']
  },
  updatedBy: {
    type: String
  },
  checkedOutBy: {
    type: String
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

// Indexes for better performance
appointmentSchema.index({ clinicId: 1, appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ clinicId: 1, patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ clinicId: 1, status: 1, appointmentDate: 1 });
appointmentSchema.index({ clinicId: 1, providerId: 1, appointmentDate: 1 });
appointmentSchema.index({ clinicId: 1, assignedDoctor: 1, appointmentDate: 1 });

// Pre-save middleware
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate patient responsibility
  this.patientResponsibility = Math.max(0, this.totalAmount - this.insuranceCoverage);

  // Set completion timestamp
  if (this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Set check-in timestamp
  if (this.status === 'Checked-In' && !this.checkedInAt) {
    this.checkedInAt = new Date();
  }

  next();
});

// Virtual for appointment datetime
appointmentSchema.virtual('appointmentDateTime').get(function() {
  if (!this.appointmentDate || !this.appointmentTime) return null;

  const date = new Date(this.appointmentDate);
  const [hours, minutes] = this.appointmentTime.split(':');
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return date;
});

// Virtual for formatted time
appointmentSchema.virtual('formattedTime').get(function() {
  if (!this.appointmentTime) return '';

  const [hours, minutes] = this.appointmentTime.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${displayHour}:${minutes} ${ampm}`;
});

// Method to check if appointment is today
appointmentSchema.methods.isToday = function() {
  if (!this.appointmentDate) return false;

  const today = new Date();
  const appointmentDate = new Date(this.appointmentDate);

  return today.toDateString() === appointmentDate.toDateString();
};

// Static method to get today's appointments for a clinic
appointmentSchema.statics.getTodaysAppointments = async function(clinicId) {
  const today = new Date();

  // Get today's date in local timezone as YYYY-MM-DD string
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  // Create date range that covers the entire day in local timezone
  const startOfDay = new Date(year, today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(year, today.getMonth(), today.getDate(), 23, 59, 59, 999);

  console.log(`🔍 Searching appointments for clinic: ${clinicId}`);
  console.log(`📅 Today's date: ${todayString}`);
  console.log(`📅 Local date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

  const query = this.find({
    clinicId,
    $or: [
      // Match appointments stored in local timezone
      {
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      },
      // Match appointments by date string comparison (most reliable)
      {
        $expr: {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" } },
            todayString
          ]
        }
      }
    ]
  })
  .populate('patientId', 'firstName lastName recordNumber phone email dateOfBirth')
  .sort({ appointmentTime: 1 });

  // Execute query and add debugging
  const appointments = await query.exec();

  console.log(`📊 Found ${appointments.length} appointments for today`);
  appointments.forEach(apt => {
    const aptDateString = apt.appointmentDate.toISOString().split('T')[0];
    console.log(`  - ${apt.patientId?.firstName} ${apt.patientId?.lastName}: ${aptDateString} (matches today: ${aptDateString === todayString})`);
  });

  return appointments;
};

module.exports = mongoose.model('Appointment', appointmentSchema);
