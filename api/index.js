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
    console.log('🔍 Environment check:', {
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });

    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    // Warn if the connection string contains unencoded special characters
    const credMatch = mongoUri.match(/mongodb\+srv:\/\/(.*?):(.*?)@/);
    if (credMatch) {
      const [_, user, pass] = credMatch;
      if (/[^A-Za-z0-9%]/.test(user) || /[^A-Za-z0-9%]/.test(pass)) {
        console.warn('⚠️ MongoDB username/password may contain unencoded special characters. This can break connections in Vercel. Please URI-encode them if needed.');
      }
    }

    // Log connection attempt (without showing full URI for security)
    console.log('🔍 Connecting to MongoDB Atlas...');
    console.log('🔍 URI format:', mongoUri.substring(0, 20) + '...');

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increased timeout for serverless
      socketTimeoutMS: 45000,
      bufferCommands: false, // Disable buffering completely
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Minimum connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionRetryDelayMS: 5000, // Retry every 5 seconds
      heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
      connectTimeoutMS: 30000, // Connection timeout
      family: 4 // Use IPv4, skip trying IPv6
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    console.log('✅ Connection state:', mongoose.connection.readyState);
    console.log('✅ Host:', mongoose.connection.host);
    console.log('✅ Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.error('❌ Error details:', error);
    isConnected = false;
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

// Simple environment check endpoint (no DB dependency)
app.get('/api/env-check', (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    res.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        MONGO_URI_EXISTS: !!process.env.MONGO_URI,
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        ADMIN_EMAIL_EXISTS: !!process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD_EXISTS: !!process.env.ADMIN_PASSWORD,
        CONNECTION_STRING_FORMAT: mongoUri ? mongoUri.substring(0, 50) + '...' : 'NOT_FOUND',
        CONNECTION_STRING_INCLUDES_DB: mongoUri ? mongoUri.includes('/spineline') : false
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Env check error:', error);
    res.status(500).json({
      success: false,
      message: 'Environment check failed',
      error: error.message
    });
  }
});

// MongoDB connection test endpoint
app.get('/api/test-db', async (req, res) => {
  // This endpoint checks DB connection and returns connection status
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
    console.error('❌ /api/test-db connection error:', error);
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// --- DEBUG ENDPOINT FOR VERCEL ---
// This endpoint helps debug env var and DB connection issues in Vercel serverless
app.get('/api/debug-mongo', async (req, res) => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  let connectionResult = null;
  try {
    await connectDB();
    connectionResult = {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      connected: mongoose.connection.readyState === 1
    };
  } catch (error) {
    connectionResult = {
      error: error.message,
      stack: error.stack,
      readyState: mongoose.connection.readyState
    };
  }
  res.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_SET: !!process.env.MONGODB_URI,
      MONGO_URI_SET: !!process.env.MONGO_URI,
      JWT_SECRET_SET: !!process.env.JWT_SECRET
    },
    mongoUriPreview: mongoUri ? mongoUri.substring(0, 40) + '...' : null,
    connectionResult,
    timestamp: new Date().toISOString()
  });
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
      // Generate proper JWT token
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'spineline-secret-key-2024';

      const payload = {
        id: 'admin',
        email: adminEmail,
        role: 'admin',
        name: 'SpineLine Admin'
      };

      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: '2h'
      });

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: payload
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

// Remove mock data endpoints - database is working

// Test endpoint to check database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { User, Clinic } = require('../server/models');

    console.log('MongoDB connection state:', mongoose.connection.readyState);
    console.log('MongoDB connection name:', mongoose.connection.name);

    // Test basic queries
    const userCount = await User.countDocuments();
    const clinicCount = await Clinic.countDocuments();

    res.json({
      success: true,
      database: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.name,
        userCount,
        clinicCount
      },
      message: 'Database test successful'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database test failed'
    });
  }
});

// Debug endpoint to check environment and auth
app.get('/api/debug', async (req, res) => {
  try {
    const mongoose = require('mongoose');

    // Test direct connection
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    let connectionTest = null;

    if (mongoUri) {
      try {
        console.log('Testing direct MongoDB connection...');
        const testConnection = await mongoose.createConnection(mongoUri, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          bufferCommands: false
        });

        await testConnection.db.admin().ping();
        connectionTest = {
          success: true,
          message: 'Direct connection successful'
        };
        await testConnection.close();
      } catch (testError) {
        console.error('Direct connection test failed:', testError);
        connectionTest = {
          success: false,
          error: testError.message,
          code: testError.code
        };
      }
    }

    res.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        MONGO_URI_EXISTS: !!process.env.MONGO_URI,
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        ADMIN_EMAIL_EXISTS: !!process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD_EXISTS: !!process.env.ADMIN_PASSWORD,
        CONNECTION_STRING_FORMAT: mongoUri ? mongoUri.substring(0, 20) + '...' : 'NOT_FOUND'
      },
      database: {
        readyState: mongoose.connection.readyState,
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.name,
        host: mongoose.connection.host
      },
      connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes (Vercel rewrites /api/* to this function)
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
