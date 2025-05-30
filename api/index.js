const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// MongoDB connection for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    console.log('🔍 Attempting MongoDB connection...');
    console.log('🔍 Environment check:', {
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    // Log connection attempt (without showing full URI for security)
    console.log('🔍 Connecting to MongoDB Atlas...');
    console.log('🔍 URI format:', mongoUri.substring(0, 20) + '...');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    console.log('✅ Connection state:', mongoose.connection.readyState);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.error('❌ Error details:', error);
    throw error;
  }
};

// Function to check if MongoDB is connected (for compatibility)
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

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../server/uploads')));

// Database connection middleware (with fallback)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    req.dbConnected = true;
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    req.dbConnected = false;

    // Allow certain routes to proceed with mock data
    const allowedRoutes = [
      '/api/secret-admin/login',
      '/api/secret-admin/clinics',
      '/api/secret-admin/users',
      '/api/health',
      '/api/test-db'
    ];

    if (allowedRoutes.some(route => req.path.startsWith(route))) {
      console.log('Allowing route to proceed with mock data:', req.path);
      next();
    } else {
      res.status(503).json({
        message: 'Database connection failed',
        error: 'Service temporarily unavailable'
      });
    }
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'SpineLine API Server is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      connected: checkConnection(),
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || 'not connected'
    }
  });
});

// MongoDB connection test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    await connectDB();
    res.json({
      success: true,
      message: 'Database connection successful',
      connection: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Simple admin login route (no DB dependency)
app.post('/api/secret-admin/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check against hardcoded admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@spineline.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SpineLine2024!';

    if (email === adminEmail && password === adminPassword) {
      // Generate simple token (for now)
      const token = 'admin-token-' + Date.now();

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: 'admin',
          email: adminEmail,
          role: 'admin',
          name: 'SpineLine Admin'
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Mock data endpoints (when DB is not available)
app.get('/api/secret-admin/clinics', (req, res, next) => {
  if (!req.dbConnected) {
    return res.json({
      success: true,
      clinics: [],
      message: 'Database connection unavailable - showing empty data'
    });
  }
  // If DB is connected, this will be handled by the admin routes below
  next();
});

app.get('/api/secret-admin/users', (req, res, next) => {
  if (!req.dbConnected) {
    return res.json({
      success: true,
      users: [],
      message: 'Database connection unavailable - showing empty data'
    });
  }
  // If DB is connected, this will be handled by the admin routes below
  next();
});

app.post('/api/secret-admin/clinics', (req, res, next) => {
  if (!req.dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Cannot create clinic at this time.'
    });
  }
  // If DB is connected, this will be handled by the admin routes below
  next();
});

app.post('/api/secret-admin/users', (req, res, next) => {
  if (!req.dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Cannot create user at this time.'
    });
  }
  // If DB is connected, this will be handled by the admin routes below
  next();
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

// 404 handler for API routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export the Express app as a serverless function
module.exports = app;
