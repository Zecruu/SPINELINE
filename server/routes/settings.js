const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ===== USERS & ROLES MANAGEMENT =====

// Get all users for the clinic
router.get('/users', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;

    const users = await User.find({ clinicId })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new user
router.post('/users', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { name, email, role, password } = req.body;

    // Validation
    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      name,
      email,
      passwordHash,
      role,
      clinicId,
      isActive: true
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
});

// Update user
router.put('/users/:userId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { userId } = req.params;
    const { name, email, role } = req.body;

    // Find user and verify clinic ownership
    const user = await User.findOne({ _id: userId, clinicId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.updatedAt = Date.now();

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Deactivate user
router.put('/users/:userId/deactivate', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { userId } = req.params;

    // Find user and verify clinic ownership
    const user = await User.findOne({ _id: userId, clinicId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deactivation
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Deactivate user
    user.isActive = false;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
});

// Reset user password
router.post('/users/:userId/reset-password', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { userId } = req.params;

    // Find user and verify clinic ownership
    const user = await User.findOne({ _id: userId, clinicId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new password
    const newPassword = generatePassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.passwordHash = passwordHash;
    user.updatedAt = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      newPassword // In production, this should be sent via email
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

// ===== PROVIDERS MANAGEMENT =====

// Mock providers data (in production, this would be a separate model)
let providersData = {};

// Get providers for clinic
router.get('/providers', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const providers = providersData[clinicId] || [];

    res.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching providers'
    });
  }
});

// Create provider
router.post('/providers', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { fullName, npi, specialization, licenseNumber, isActive } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Provider name is required'
      });
    }

    if (!providersData[clinicId]) {
      providersData[clinicId] = [];
    }

    const newProvider = {
      _id: Date.now().toString(),
      fullName,
      npi: npi || '',
      specialization: specialization || '',
      licenseNumber: licenseNumber || '',
      isActive: isActive !== false,
      clinicId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    providersData[clinicId].push(newProvider);

    res.status(201).json({
      success: true,
      message: 'Provider created successfully',
      provider: newProvider
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating provider'
    });
  }
});

// Update provider
router.put('/providers/:providerId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { providerId } = req.params;
    const { fullName, npi, specialization, licenseNumber, isActive } = req.body;

    if (!providersData[clinicId]) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerIndex = providersData[clinicId].findIndex(p => p._id === providerId);
    if (providerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Update provider
    providersData[clinicId][providerIndex] = {
      ...providersData[clinicId][providerIndex],
      fullName: fullName || providersData[clinicId][providerIndex].fullName,
      npi: npi || '',
      specialization: specialization || '',
      licenseNumber: licenseNumber || '',
      isActive: isActive !== undefined ? isActive : providersData[clinicId][providerIndex].isActive,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Provider updated successfully',
      provider: providersData[clinicId][providerIndex]
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating provider'
    });
  }
});

// Delete provider
router.delete('/providers/:providerId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { providerId } = req.params;

    if (!providersData[clinicId]) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerIndex = providersData[clinicId].findIndex(p => p._id === providerId);
    if (providerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    providersData[clinicId].splice(providerIndex, 1);

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting provider'
    });
  }
});

// ===== CLINIC SCHEDULE MANAGEMENT =====

// Mock schedule data (in production, this would be a separate model)
let scheduleData = {};

// Get clinic schedule
router.get('/schedule', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const schedule = scheduleData[clinicId] || {
      schedule: {
        monday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        friday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
        saturday: { isOpen: false, openTime: '09:00', closeTime: '14:00', breakStart: '', breakEnd: '' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '14:00', breakStart: '', breakEnd: '' }
      },
      holidays: []
    };

    res.json({
      success: true,
      ...schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching schedule'
    });
  }
});

// Update clinic schedule
router.put('/schedule', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { schedule, holidays } = req.body;

    scheduleData[clinicId] = {
      schedule,
      holidays: holidays || [],
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating schedule'
    });
  }
});

// ===== SIGNATURE SETTINGS =====

// Mock signature settings data
let signatureSettings = {};

// Get signature settings
router.get('/signature', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const settings = signatureSettings[clinicId] || {
      signatureRequired: 'required',
      defaultDeviceType: 'software',
      allowDeviceSelection: true,
      autoDetectHardware: true
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching signature settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching signature settings'
    });
  }
});

// Update signature settings
router.put('/signature', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const settings = req.body;

    signatureSettings[clinicId] = {
      ...settings,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Signature settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating signature settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating signature settings'
    });
  }
});

// ===== TIMEZONE SETTINGS =====

// Mock timezone settings data
let timezoneSettings = {};

// Get timezone settings
router.get('/timezone', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const settings = timezoneSettings[clinicId] || {
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12',
      autoDetectTimezone: false
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching timezone settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching timezone settings'
    });
  }
});

// Update timezone settings
router.put('/timezone', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const settings = req.body;

    timezoneSettings[clinicId] = {
      ...settings,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Timezone settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating timezone settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating timezone settings'
    });
  }
});

module.exports = router;
