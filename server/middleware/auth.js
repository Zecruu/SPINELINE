const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, () => {});
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication.' 
    });
  }
};

// Middleware to verify clinic access (user belongs to specific clinic)
const verifyClinicAccess = (req, res, next) => {
  try {
    const { clinicId } = req.params;
    
    // Admin can access any clinic
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User must belong to the clinic they're trying to access
    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only access your own clinic data.' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during clinic access verification.' 
    });
  }
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Generate short-lived admin token
const generateAdminToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '2h' // Short-lived for admin sessions
  });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyClinicAccess,
  generateToken,
  generateAdminToken
};
