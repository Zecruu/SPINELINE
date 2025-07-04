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

// Chunked Upload Schema
const chunkedUploadSchema = new mongoose.Schema({
  uploadId: { type: String, required: true, unique: true },
  clinicId: { type: String, required: true },
  userId: { type: String, required: true },
  fileName: { type: String, required: true },
  totalSize: { type: Number, required: true },
  totalChunks: { type: Number, required: true },
  uploadedChunks: [{ 
    chunkIndex: Number,
    chunkSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['uploading', 'completed', 'failed', 'processing'],
    default: 'uploading'
  },
  fileType: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const ChunkedUpload = mongoose.models.ChunkedUpload || mongoose.model('ChunkedUpload', chunkedUploadSchema);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    await connectDB();

    if (req.method === 'POST') {
      // Initialize chunked upload
      const { fileName, totalSize, totalChunks, fileType } = req.body;
      
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const chunkedUpload = new ChunkedUpload({
        uploadId,
        clinicId: user.clinicId,
        userId: user.userId,
        fileName,
        totalSize,
        totalChunks,
        fileType,
        status: 'uploading'
      });

      await chunkedUpload.save();

      return res.json({
        success: true,
        uploadId,
        message: 'Chunked upload initialized'
      });

    } else if (req.method === 'GET') {
      // Get upload status
      const { uploadId } = req.query;
      
      const upload = await ChunkedUpload.findOne({ 
        uploadId, 
        clinicId: user.clinicId 
      });

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found'
        });
      }

      return res.json({
        success: true,
        upload: {
          uploadId: upload.uploadId,
          status: upload.status,
          uploadedChunks: upload.uploadedChunks.length,
          totalChunks: upload.totalChunks,
          progress: Math.round((upload.uploadedChunks.length / upload.totalChunks) * 100)
        }
      });
    }

  } catch (error) {
    console.error('Chunked upload error:', error);

    if (error.message === 'No token provided') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Chunked upload failed: ' + error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
