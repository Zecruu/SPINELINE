const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Clinic } = require('../models');
const { generateToken } = require('../middleware/auth');
const { isConnected } = require('../config/db');

// User login route
const userLogin = async (req, res) => {
  try {
    const { email, password, clinicId } = req.body;

    // Validate input
    if (!email || !password || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and clinic ID are required'
      });
    }

    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    // Find user by email and clinic ID
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      clinicId: clinicId.toUpperCase(),
      isActive: true
    }).populate('clinic', 'clinicName isActive');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or clinic ID'
      });
    }

    // Check if clinic is active
    if (!user.clinic || !user.clinic.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Clinic is inactive. Please contact your administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token with user info
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      name: user.name
    });

    // Log successful login (audit trail)
    console.log(`✅ User login: ${user.email} (${user.role}) - Clinic: ${user.clinicId} - ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic.clinicName
      }
    });

  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify token route (for checking if user is still authenticated)
const verifyUserToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const user = await User.findById(decoded.userId)
      .select('name email role clinicId isActive')
      .populate('clinic', 'clinicName isActive');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    if (!user.clinic || !user.clinic.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Clinic is inactive'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic.clinicName
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Get clinic info by clinic ID (for login form validation)
const getClinicInfo = async (req, res) => {
  try {
    const { clinicId } = req.params;

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID is required'
      });
    }

    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const clinic = await Clinic.findOne({ 
      clinicId: clinicId.toUpperCase(),
      isActive: true 
    }).select('clinicName clinicId');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found or inactive'
      });
    }

    res.json({
      success: true,
      clinic: {
        clinicId: clinic.clinicId,
        clinicName: clinic.clinicName
      }
    });

  } catch (error) {
    console.error('Get clinic info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Routes
router.post('/login', userLogin);
router.get('/verify', verifyUserToken);
router.get('/clinic/:clinicId', getClinicInfo);

module.exports = router;
