const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:7890',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Redirect /login to /api/auth/login for backward compatibility
app.all('/login', (req, res) => {
  res.redirect(301, '/api/auth/login');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/secret-admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/service-codes', require('./routes/serviceCodes'));
app.use('/api/diagnostic-codes', require('./routes/diagnosticCodes'));
app.use('/api/soap-templates', require('./routes/soapTemplates'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/import-export', require('./routes/importExport'));
app.use('/api/dx-clusters', require('./routes/dxClusters'));
app.use('/api/care-kits', require('./routes/careKits'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/doctors', require('./routes/doctors'));
// app.use('/api/users', require('./routes/users'));
// app.use('/api/clinics', require('./routes/clinics'));

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from client dist directory
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Handle React Router - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

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
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
