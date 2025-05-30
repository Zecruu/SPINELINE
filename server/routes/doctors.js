const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { User } = require('../models');
const path = require('path');

// For now, we'll handle file uploads without multer to avoid dependency issues
// In production, you would install and configure multer properly

// Get doctor settings
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    // Only allow doctors to access this endpoint
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    console.log(`🔍 Getting settings for doctor: ${userId}`);

    // Get user data
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Format settings response
    const settings = {
      profile: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        title: user.title || '',
        specialty: user.specialty || '',
        phone: user.phone || '',
        profilePic: user.profilePic || null
      },
      notifications: user.notificationSettings || {
        emailAlerts: true,
        newPatientAlerts: true,
        flaggedPatientAlerts: true,
        appointmentReminders: true,
        systemUpdates: false
      },
      signature: {
        signatureImage: user.signatureImage || null,
        autoSign: user.autoSign || false
      },
      preferences: user.defaultPreferences || {
        defaultDuration: 15,
        defaultVisitType: 'Follow-Up',
        defaultTemplate: '',
        autoSaveNotes: true
      },
      credentials: {
        npiNumber: user.npiNumber || '',
        businessNpiNumber: user.businessNpiNumber || '',
        taxonomyCode: user.taxonomyCode || '',
        licenseState: user.licenseState || '',
        isNpiVerified: user.isNpiVerified || false
      }
    };

    res.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('Error getting doctor settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
});

// Update doctor settings
router.put('/settings', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    // Only allow doctors to access this endpoint
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { profile, notifications, signature, preferences, credentials } = req.body;

    console.log(`🔄 Updating settings for doctor: ${userId}`);

    // Update user data
    const updateData = {};

    if (profile) {
      updateData.firstName = profile.firstName;
      updateData.lastName = profile.lastName;
      updateData.email = profile.email;
      updateData.title = profile.title;
      updateData.specialty = profile.specialty;
      updateData.phone = profile.phone;
      updateData.name = `${profile.firstName} ${profile.lastName}`.trim();
    }

    if (notifications) {
      updateData.notificationSettings = notifications;
    }

    if (signature) {
      updateData.autoSign = signature.autoSign;
      if (signature.signatureImage) {
        updateData.signatureImage = signature.signatureImage;
      }
    }

    if (preferences) {
      updateData.defaultPreferences = preferences;
    }

    if (credentials) {
      updateData.npiNumber = credentials.npiNumber;
      updateData.businessNpiNumber = credentials.businessNpiNumber;
      updateData.taxonomyCode = credentials.taxonomyCode;
      updateData.licenseState = credentials.licenseState;
      updateData.isNpiVerified = credentials.isNpiVerified;
    }

    updateData.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    console.log(`✅ Settings updated for doctor: ${updatedUser.name}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        title: updatedUser.title,
        specialty: updatedUser.specialty
      }
    });

  } catch (error) {
    console.error('Error updating doctor settings:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Upload profile picture (placeholder implementation)
router.post('/profile-pic', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // For now, return a placeholder response
    // In production, you would implement actual file upload with multer
    console.log(`📸 Profile picture upload requested for doctor: ${userId}`);

    res.json({
      success: true,
      message: 'Profile picture upload feature will be implemented with proper multer configuration',
      profilePicUrl: '/uploads/placeholder-profile.jpg'
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
});

// Upload signature (placeholder implementation)
router.post('/signature', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // For now, return a placeholder response
    // In production, you would implement actual file upload with multer
    console.log(`✍️ Signature upload requested for doctor: ${userId}`);

    res.json({
      success: true,
      message: 'Signature upload feature will be implemented with proper multer configuration',
      signatureUrl: '/uploads/placeholder-signature.jpg'
    });

  } catch (error) {
    console.error('Error uploading signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload signature'
    });
  }
});

// Get clinic doctors for provider selection
router.get('/clinic-doctors', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;

    const doctors = await User.find({
      clinicId: clinicId,
      role: 'doctor',
      isActive: true
    }).select('firstName lastName email credentials npiNumber businessNpiNumber signatureImage');

    res.json({
      success: true,
      doctors: doctors
    });

  } catch (error) {
    console.error('Get clinic doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting clinic doctors'
    });
  }
});

// Get doctor signature
router.get('/:doctorId/signature', verifyToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { clinicId } = req.user;

    const doctor = await User.findOne({
      _id: doctorId,
      clinicId: clinicId,
      role: 'doctor'
    }).select('signatureImage');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      signature: doctor.signatureImage || null
    });
  } catch (error) {
    console.error('Get doctor signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting doctor signature',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Save doctor signature
router.patch('/:doctorId/signature', verifyToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { signature } = req.body;
    const { clinicId } = req.user;

    const doctor = await User.findOneAndUpdate(
      { _id: doctorId, clinicId: clinicId, role: 'doctor' },
      { signatureImage: signature },
      { new: true }
    ).select('firstName lastName signatureImage');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Signature saved successfully',
      doctor: doctor
    });
  } catch (error) {
    console.error('Save doctor signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving doctor signature',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
