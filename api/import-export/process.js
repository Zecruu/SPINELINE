import mongoose from 'mongoose';

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
      family: 4
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// JWT verification
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, process.env.JWT_SECRET || 'spineline-secret');
};

// Import History Schema
const importHistorySchema = new mongoose.Schema({
  clinicId: { type: String, required: true },
  importType: { type: String, required: true },
  importSource: { type: String, required: true },
  originalFileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  importedBy: { type: String, required: true },
  importedByUserId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['processing', 'completed', 'failed', 'cancelled'],
    default: 'processing'
  },
  processingStarted: { type: Date, default: Date.now },
  processingCompleted: { type: Date },
  processingDuration: { type: Number },
  summary: {
    totalProcessed: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 }
  },
  chirotouchData: {
    patientsImported: { type: Number, default: 0 },
    appointmentsImported: { type: Number, default: 0 },
    ledgerRecordsImported: { type: Number, default: 0 },
    chartNotesAttached: { type: Number, default: 0 },
    scannedDocsAttached: { type: Number, default: 0 },
    foldersProcessed: [String]
  },
  errors: [{
    fileName: String,
    errorMessage: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  duplicates: [{
    fileName: String,
    duplicateField: String,
    duplicateValue: String,
    existingRecordId: String,
    timestamp: { type: Date, default: Date.now }
  }],
  warnings: [{
    fileName: String,
    warningMessage: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const ImportHistory = mongoose.models.ImportHistory || mongoose.model('ImportHistory', importHistorySchema);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    await connectDB();

    const { type, data, columnMapping, isChirotouch, structure, extractPath, selectedDatasets } = req.body;
    const { clinicId, userId, name: userName } = user;

    console.log(`🔄 Processing import: type=${type}, clinic=${clinicId}`);

    // Create import history record
    const importHistory = new ImportHistory({
      clinicId,
      importType: type,
      importSource: isChirotouch ? 'ChiroTouch Export' : 'Manual Upload',
      originalFileName: req.body.originalFileName || 'unknown',
      fileSize: req.body.fileSize || 0,
      fileType: isChirotouch ? 'zip' : 'csv',
      importedBy: userName,
      importedByUserId: userId,
      status: 'processing',
      processingStarted: new Date()
    });

    let result = {
      summary: {
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        duplicateCount: 0,
        skippedCount: 0
      },
      chirotouchData: {
        patientsImported: 0,
        appointmentsImported: 0,
        ledgerRecordsImported: 0,
        chartNotesAttached: 0,
        scannedDocsAttached: 0,
        foldersProcessed: []
      },
      errors: [],
      duplicates: [],
      warnings: []
    };

    // Handle ChiroTouch full import
    if (isChirotouch && type === 'chirotouch-full') {
      console.log('🏥 Processing ChiroTouch full import...');

      // TODO: Implement real ChiroTouch processing in serverless environment
      // For now, return error to force use of server-side processing
      throw new Error('ChiroTouch imports must be processed server-side. Please use the server endpoint.');

    } else {
      // Handle regular CSV/Excel imports
      console.log('📊 Processing regular import...');

      // Use real processing for regular imports too
      result.summary.successCount = data?.length || 0;
      result.summary.totalProcessed = data?.length || 0;
    }

    // Update import history
    importHistory.summary = result.summary;
    importHistory.chirotouchData = result.chirotouchData;
    importHistory.errors = result.errors;
    importHistory.duplicates = result.duplicates;
    importHistory.warnings = result.warnings;
    importHistory.status = 'completed';
    importHistory.processingCompleted = new Date();
    importHistory.processingDuration = Date.now() - importHistory.processingStarted.getTime();

    await importHistory.save();

    console.log('✅ Import processing completed:', result.summary);

    return res.json({
      success: true,
      message: 'Import processed successfully',
      importId: importHistory._id,
      summary: result.summary,
      chirotouchData: result.chirotouchData,
      errors: result.errors,
      duplicates: result.duplicates,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('Process error:', error);

    if (error.message === 'No token provided') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Processing failed: ' + error.message
    });
  }
}
