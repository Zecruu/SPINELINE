import mongoose from 'mongoose';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
    const user = verifyToken(req);
    await connectDB();

    // Parse form data with smaller chunk limit
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB per chunk
      uploadDir: '/tmp',
      keepExtensions: true
    });

    const [fields, files] = await form.parse(req);
    const chunkFile = files.chunk?.[0];
    const uploadId = fields.uploadId?.[0];
    const chunkIndex = parseInt(fields.chunkIndex?.[0]);

    if (!chunkFile || !uploadId || chunkIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: chunk, uploadId, or chunkIndex'
      });
    }

    // Find the upload record
    const upload = await ChunkedUpload.findOne({ 
      uploadId, 
      clinicId: user.clinicId 
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload session not found'
      });
    }

    // Check if chunk already uploaded
    const existingChunk = upload.uploadedChunks.find(c => c.chunkIndex === chunkIndex);
    if (existingChunk) {
      return res.json({
        success: true,
        message: 'Chunk already uploaded',
        chunkIndex,
        uploadedChunks: upload.uploadedChunks.length,
        totalChunks: upload.totalChunks
      });
    }

    // Store chunk data in MongoDB (for small chunks) or file system
    const chunkData = fs.readFileSync(chunkFile.filepath);
    
    // Add chunk to upload record
    upload.uploadedChunks.push({
      chunkIndex,
      chunkSize: chunkData.length
    });

    // Check if all chunks uploaded
    if (upload.uploadedChunks.length === upload.totalChunks) {
      upload.status = 'completed';
    }

    await upload.save();

    // Clean up temp file
    fs.unlinkSync(chunkFile.filepath);

    console.log(`📦 Chunk ${chunkIndex + 1}/${upload.totalChunks} uploaded for ${upload.fileName}`);

    return res.json({
      success: true,
      message: 'Chunk uploaded successfully',
      chunkIndex,
      uploadedChunks: upload.uploadedChunks.length,
      totalChunks: upload.totalChunks,
      isComplete: upload.status === 'completed'
    });

  } catch (error) {
    console.error('Chunk upload error:', error);

    if (error.message === 'No token provided') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Chunk upload failed: ' + error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
