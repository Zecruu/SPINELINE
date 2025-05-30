const bcrypt = require('bcrypt');
const { User, Clinic } = require('../models');
const { generateAdminToken } = require('../middleware/auth');
const { isConnected } = require('../config/db');

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check against hardcoded admin credentials first
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@spineline.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SpineLine2024!';

    if (email === adminEmail && password === adminPassword) {
      // Generate admin token
      const token = generateAdminToken({
        id: 'admin',
        email: adminEmail,
        role: 'admin',
        name: 'SpineLine Admin'
      });

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

    // If not hardcoded admin, check database for admin users
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateAdminToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Create new clinic
const createClinic = async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please check MongoDB Atlas connection.'
      });
    }

    const { clinicName, clinicId, contactInfo } = req.body;

    // Validate required fields
    if (!clinicName || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name and clinic ID are required'
      });
    }

    // Check if clinic ID already exists
    const existingClinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
    if (existingClinic) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID already exists'
      });
    }

    // Create new clinic
    const clinic = new Clinic({
      clinicName,
      clinicId: clinicId.toUpperCase(),
      contactInfo
    });

    await clinic.save();

    res.status(201).json({
      success: true,
      message: 'Clinic created successfully',
      clinic: {
        id: clinic._id,
        clinicName: clinic.clinicName,
        clinicId: clinic.clinicId,
        contactInfo: clinic.contactInfo,
        createdAt: clinic.createdAt
      }
    });

  } catch (error) {
    console.error('Create clinic error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating clinic'
    });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please check MongoDB Atlas connection.'
      });
    }

    const { name, email, password, role, clinicId } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Validate role
    if (!['doctor', 'secretary'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either doctor or secretary'
      });
    }

    // Validate clinic ID is provided for non-admin users
    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID is required'
      });
    }

    // Check if clinic exists
    const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
    if (!clinic) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clinic ID. Clinic does not exist.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password, // Will be hashed by the pre-save middleware
      role,
      clinicId: clinicId.toUpperCase()
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        createdAt: user.createdAt
      },
      clinic: {
        clinicName: clinic.clinicName,
        clinicId: clinic.clinicId
      }
    });

  } catch (error) {
    console.error('Create user error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
};

module.exports = {
  adminLogin,
  createClinic,
  createUser
};
