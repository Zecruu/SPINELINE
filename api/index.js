const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// MongoDB connection for serverless (Vercel/Render)
// Use a singleton pattern to avoid reconnecting on every request in serverless environments
let isConnected = false;

const connectDB = async () => {
  // If already connected, reuse the connection
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  try {
    // Disable Mongoose buffering globally for serverless
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('🔍 Attempting MongoDB connection...');

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

// Function to check if MongoDB is connected
const checkConnection = () => {
  return mongoose.connection.readyState === 1;
};

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:7890',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    req.dbConnected = true;
    req.isConnected = checkConnection;
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    req.dbConnected = false;
    req.isConnected = () => false;
    res.status(503).json({
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: checkConnection(),
      readyState: mongoose.connection.readyState
    }
  });
});

// API Routes
app.use('/api/secret-admin', require('../server/routes/admin'));
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/patients', require('../server/routes/patients'));
app.use('/api/appointments', require('../server/routes/appointments'));
app.use('/api/service-codes', require('../server/routes/serviceCodes'));
app.use('/api/diagnostic-codes', require('../server/routes/diagnosticCodes'));
app.use('/api/soap-templates', require('../server/routes/soapTemplates'));
app.use('/api/templates', require('../server/routes/templates'));
app.use('/api/audit', require('../server/routes/audit'));
app.use('/api/reports', require('../server/routes/reports'));
app.use('/api/ledger', require('../server/routes/ledger'));
app.use('/api/import-export', require('../server/routes/importExport'));
app.use('/api/dx-clusters', require('../server/routes/dxClusters'));
app.use('/api/billing-clusters', require('../server/routes/billingClusters'));
app.use('/api/care-kits', require('../server/routes/careKits'));
app.use('/api/settings', require('../server/routes/settings'));
app.use('/api/doctors', require('../server/routes/doctors'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export for Vercel
module.exports = app;


