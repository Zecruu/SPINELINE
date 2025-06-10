const mongoose = require('mongoose');

// Import history schema for audit logging
const importHistorySchema = new mongoose.Schema({
  // Basic Information
  clinicId: {
    type: String,
    required: [true, 'Clinic ID is required'],
    trim: true,
    uppercase: true
  },
  importType: {
    type: String,
    required: [true, 'Import type is required'],
    enum: ['patients', 'appointments', 'service-codes', 'icd-codes', 'ledger', 'soap-notes', 'chirotouch-full'],
    default: 'patients'
  },
  importSource: {
    type: String,
    required: [true, 'Import source is required'],
    enum: ['CSV/Excel Import', 'ChiroTouch Export', 'Manual Entry'],
    default: 'CSV/Excel Import'
  },

  // File Information
  originalFileName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['csv', 'xlsx', 'zip'],
    default: 'csv'
  },

  // Import Summary
  summary: {
    totalProcessed: {
      type: Number,
      default: 0,
      min: 0
    },
    successCount: {
      type: Number,
      default: 0,
      min: 0
    },
    errorCount: {
      type: Number,
      default: 0,
      min: 0
    },
    duplicateCount: {
      type: Number,
      default: 0,
      min: 0
    },
    skippedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // ChiroTouch Specific Data
  chirotouchData: {
    patientsImported: {
      type: Number,
      default: 0,
      min: 0
    },
    appointmentsImported: {
      type: Number,
      default: 0,
      min: 0
    },
    ledgerRecordsImported: {
      type: Number,
      default: 0,
      min: 0
    },
    chartNotesAttached: {
      type: Number,
      default: 0,
      min: 0
    },
    scannedDocsAttached: {
      type: Number,
      default: 0,
      min: 0
    },
    foldersProcessed: [{
      folderName: String,
      fileCount: Number,
      processedCount: Number,
      errorCount: Number
    }]
  },

  // Error Tracking
  errors: [{
    row: Number,
    fileName: String,
    folderPath: String,
    errorMessage: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Duplicate Tracking
  duplicates: [{
    type: {
      type: String,
      enum: ['patient', 'appointment', 'service-code', 'icd-code', 'ledger']
    },
    identifier: String, // Record number, code, etc.
    name: String,
    reason: String
  }],

  // Warnings
  warnings: [{
    type: {
      type: String,
      enum: ['missing_patient', 'invalid_date', 'missing_file', 'format_issue', 'data_mismatch']
    },
    message: String,
    fileName: String,
    folderPath: String,
    affectedRecord: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Processing Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  processingStarted: {
    type: Date
  },
  processingCompleted: {
    type: Date
  },
  processingDuration: {
    type: Number, // in milliseconds
    min: 0
  },

  // User Information
  importedBy: {
    type: String,
    required: [true, 'Importer is required']
  },
  importedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  suppressReservedKeysWarning: true
});

// Indexes for better query performance
importHistorySchema.index({ clinicId: 1, createdAt: -1 });
importHistorySchema.index({ clinicId: 1, importType: 1 });
importHistorySchema.index({ clinicId: 1, status: 1 });
importHistorySchema.index({ importedBy: 1 });

// Update the updatedAt field before saving
importHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for processing time in human readable format
importHistorySchema.virtual('processingTimeFormatted').get(function() {
  if (!this.processingDuration) return null;
  
  const seconds = Math.floor(this.processingDuration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for success rate
importHistorySchema.virtual('successRate').get(function() {
  if (this.summary.totalProcessed === 0) return 0;
  return Math.round((this.summary.successCount / this.summary.totalProcessed) * 100);
});

// Static method to get import statistics for a clinic
importHistorySchema.statics.getClinicStats = function(clinicId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        clinicId: clinicId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$importType',
        totalImports: { $sum: 1 },
        totalRecords: { $sum: '$summary.totalProcessed' },
        totalSuccessful: { $sum: '$summary.successCount' },
        totalErrors: { $sum: '$summary.errorCount' },
        avgProcessingTime: { $avg: '$processingDuration' }
      }
    }
  ]);
};

module.exports = mongoose.model('ImportHistory', importHistorySchema);
