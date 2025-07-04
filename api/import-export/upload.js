import mongoose from 'mongoose';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import csv from 'csv-parser';

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

// Helper function to analyze ZIP structure
const analyzeZipStructure = (filePath) => {
  return new Promise((resolve, reject) => {
    const structure = {
      folders: {
        tables: [],
        ledgerHistory: [],
        chartNotes: [],
        scannedDocs: []
      },
      isChirotouch: false
    };

    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName;
        
        if (fileName.includes('00_Tables/') && fileName.endsWith('.csv')) {
          structure.folders.tables.push({
            fileName: path.basename(fileName),
            filePath: fileName,
            size: entry.uncompressedSize
          });
        } else if (fileName.includes('01_LedgerHistory/') && fileName.endsWith('.csv')) {
          structure.folders.ledgerHistory.push({
            fileName: path.basename(fileName),
            filePath: fileName,
            size: entry.uncompressedSize
          });
        } else if (fileName.includes('03_ChartNotes/')) {
          structure.folders.chartNotes.push({
            fileName: path.basename(fileName),
            filePath: fileName,
            size: entry.uncompressedSize
          });
        } else if (fileName.includes('02_ScannedDocs/')) {
          structure.folders.scannedDocs.push({
            fileName: path.basename(fileName),
            filePath: fileName,
            size: entry.uncompressedSize
          });
        }

        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        structure.isChirotouch = structure.folders.tables.length > 0 ||
                               structure.folders.ledgerHistory.length > 0;
        resolve(structure);
      });

      zipfile.on('error', reject);
    });
  });
};

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

    // Parse form data with Vercel-compatible limits
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit for Vercel
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFieldsSize: 50 * 1024 * 1024
    });

    const [fields, files] = await form.parse(req);
    const importFile = files.importFile?.[0];
    const type = fields.type?.[0];

    if (!importFile) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📤 File upload: ${importFile.originalFilename}, size: ${importFile.size}`);

    // Handle ZIP files (ChiroTouch exports)
    if (importFile.originalFilename.toLowerCase().endsWith('.zip')) {
      try {
        const structure = await analyzeZipStructure(importFile.filepath);
        
        return res.json({
          success: true,
          isChirotouch: structure.isChirotouch,
          message: 'ZIP file uploaded successfully',
          uploadId: path.basename(importFile.filepath),
          originalFileName: importFile.originalFilename,
          fileSize: importFile.size,
          structure: structure,
          preview: {
            summary: {
              totalPatients: structure.folders.tables.length,
              totalAppointments: 0,
              totalLedgerRecords: structure.folders.ledgerHistory.length
            },
            patients: { count: structure.folders.tables.length },
            appointments: { count: 0 },
            ledger: { count: structure.folders.ledgerHistory.length },
            chartNotes: { count: structure.folders.chartNotes.length },
            scannedDocs: { count: structure.folders.scannedDocs.length }
          }
        });
      } catch (error) {
        console.error('ZIP processing error:', error);
        return res.status(400).json({
          success: false,
          message: 'Failed to process ZIP file: ' + error.message
        });
      }
    }

    // Handle CSV/Excel files
    return res.json({
      success: true,
      isChirotouch: false,
      message: 'File uploaded successfully',
      uploadId: path.basename(importFile.filepath),
      originalFileName: importFile.originalFilename,
      fileSize: importFile.size,
      totalRows: 0,
      preview: [],
      columns: []
    });

  } catch (error) {
    console.error('Upload error:', error);

    if (error.message === 'No token provided') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Handle file size errors
    if (error.code === 'LIMIT_FILE_SIZE' || error.message.includes('maxFileSize')) {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for Vercel deployment. Please use a smaller file or contact support for larger imports.'
      });
    }

    // Handle formidable errors
    if (error.code === 'ENOENT' || error.message.includes('no such file')) {
      return res.status(400).json({
        success: false,
        message: 'File upload failed. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
}

export default handler;

export const config = {
  api: {
    bodyParser: false,
  },
};
