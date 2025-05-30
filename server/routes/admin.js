const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
const { adminLogin, createClinic, createUser } = require('../controllers/adminController');
const { User, Clinic } = require('../models');

// Database connection check - works in both server and serverless environments
let isConnected;
try {
  // Try to import from config (server environment)
  isConnected = require('../config/db').isConnected;
} catch (error) {
  // Fallback for serverless environment
  const mongoose = require('mongoose');
  isConnected = () => mongoose.connection.readyState === 1;
}

// Admin login route (no auth required)
router.post('/login', adminLogin);

// Test route to check if admin routes are mounted (no auth required)
router.get('/test', (req, res) => {
  console.log('Admin test route hit');
  res.json({
    success: true,
    message: 'Admin routes are working',
    timestamp: new Date().toISOString()
  });
});

// Test auth route to debug authentication (no auth required)
router.get('/test-auth', (req, res) => {
  try {
    console.log('Admin test-auth route hit');
    console.log('Headers received:', req.headers);

    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader);

    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'Token present' : 'No token');

    if (!token) {
      return res.json({
        success: false,
        message: 'No token provided',
        debug: {
          authHeader: authHeader,
          headers: req.headers
        }
      });
    }

    const jwt = require('jsonwebtoken');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);

      res.json({
        success: true,
        message: 'Token is valid',
        decoded: decoded,
        debug: {
          tokenLength: token.length,
          jwtSecretExists: !!process.env.JWT_SECRET
        }
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      res.json({
        success: false,
        message: 'Token verification failed',
        error: process.env.NODE_ENV === 'development' ? jwtError.message : 'Internal server error',
        debug: {
          tokenLength: token.length,
          jwtSecretExists: !!process.env.JWT_SECRET
        }
      });
    }
  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Test auth failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all clinics (admin only)
router.get('/clinics', verifyAdmin, async (req, res) => {
  try {
    console.log('Admin clinics route hit, user:', req.user);
    console.log('Environment check - JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('Environment check - MONGO_URI exists:', !!process.env.MONGO_URI);

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    console.log('Executing clinics query...');

    const clinics = await Clinic.find({})
      .select('clinicName clinicId contactInfo isActive createdAt')
      .sort({ createdAt: -1 })
      .maxTimeMS(30000); // 30 second timeout for the query

    console.log('Found clinics:', clinics.length);
    res.json({
      success: true,
      clinics
    });
  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching clinics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new clinic (admin only)
router.post('/clinics', verifyAdmin, createClinic);

// Get all users (admin only)
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    console.log('Admin users route hit, user:', req.user);

    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    console.log('Executing users query...');
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('name email role clinicId isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .maxTimeMS(30000); // 30 second timeout for the query

    console.log('Found users:', users.length);
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new user (admin only)
router.post('/users', verifyAdmin, createUser);

// Get users by clinic (admin only)
router.get('/clinics/:clinicId/users', verifyAdmin, async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Check if clinic exists
    const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    const users = await User.find({
      clinicId: clinicId.toUpperCase(),
      role: { $ne: 'admin' }
    })
    .select('name email role isActive createdAt lastLogin')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      clinic: {
        clinicName: clinic.clinicName,
        clinicId: clinic.clinicId
      },
      users
    });
  } catch (error) {
    console.error('Get clinic users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching clinic users'
    });
  }
});

// Update user status (admin only)
router.patch('/users/:userId/status', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
});

// Update clinic status (admin only)
router.patch('/clinics/:clinicId/status', verifyAdmin, async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { isActive } = req.body;

    const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    clinic.isActive = isActive;
    await clinic.save();

    res.json({
      success: true,
      message: `Clinic ${isActive ? 'activated' : 'deactivated'} successfully`,
      clinic: {
        clinicName: clinic.clinicName,
        clinicId: clinic.clinicId,
        isActive: clinic.isActive
      }
    });
  } catch (error) {
    console.error('Update clinic status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating clinic status'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `User ${user.name} deleted successfully`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// Delete clinic (admin only)
router.delete('/clinics/:clinicId', verifyAdmin, async (req, res) => {
  try {
    const { clinicId } = req.params;

    const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found'
      });
    }

    // Check if clinic has users
    const userCount = await User.countDocuments({
      clinicId: clinicId.toUpperCase(),
      role: { $ne: 'admin' }
    });

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete clinic. It has ${userCount} user(s). Please delete or reassign users first.`
      });
    }

    await Clinic.findOneAndDelete({ clinicId: clinicId.toUpperCase() });

    res.json({
      success: true,
      message: `Clinic ${clinic.clinicName} deleted successfully`
    });
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting clinic'
    });
  }
});

// Generate clinic ID suggestion
router.get('/generate-clinic-id', verifyAdmin, async (req, res) => {
  try {
    const { clinicName } = req.query;

    if (!clinicName) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name is required'
      });
    }

    // Generate ID from clinic name
    let baseId = clinicName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    if (baseId.length < 3) {
      baseId = baseId.padEnd(3, '0');
    }

    let clinicId = baseId;
    let counter = 1;

    // Check if ID exists and increment if needed
    while (await Clinic.findOne({ clinicId })) {
      clinicId = baseId + counter.toString().padStart(2, '0');
      counter++;

      if (counter > 99) {
        // Fallback to random if too many conflicts
        clinicId = baseId + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        break;
      }
    }

    res.json({
      success: true,
      suggestedId: clinicId
    });
  } catch (error) {
    console.error('Generate clinic ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating clinic ID'
    });
  }
});

module.exports = router;
