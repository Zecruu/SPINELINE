const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const DiagnosticCode = require('../models/DiagnosticCode');

// Get all diagnostic codes for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { category, bodySystem, commonlyUsed, limit = 100 } = req.query;

    console.log(`🔍 Getting diagnostic codes for clinic: ${clinicId}`);

    const options = {};
    if (category) options.category = category;
    if (bodySystem) options.bodySystem = bodySystem;
    if (commonlyUsed !== undefined) options.commonlyUsed = commonlyUsed === 'true';

    const diagnosticCodes = await DiagnosticCode.findByClinic(clinicId, options)
      .limit(parseInt(limit));

    console.log(`📊 Found ${diagnosticCodes.length} diagnostic codes`);

    res.json({
      success: true,
      diagnosticCodes
    });

  } catch (error) {
    console.error('Get diagnostic codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving diagnostic codes'
    });
  }
});

// Get commonly used diagnostic codes
router.get('/common', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { limit = 20 } = req.query;

    console.log(`🔍 Getting common diagnostic codes for clinic: ${clinicId}`);

    const commonCodes = await DiagnosticCode.getCommonCodes(clinicId, parseInt(limit));

    console.log(`📊 Found ${commonCodes.length} common diagnostic codes`);

    res.json({
      success: true,
      diagnosticCodes: commonCodes
    });

  } catch (error) {
    console.error('Get common diagnostic codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving common diagnostic codes'
    });
  }
});

// Get diagnostic codes by category
router.get('/category/:category', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { category } = req.params;

    console.log(`🔍 Getting diagnostic codes for clinic: ${clinicId}, category: ${category}`);

    const diagnosticCodes = await DiagnosticCode.getByCategory(clinicId, category);

    console.log(`📊 Found ${diagnosticCodes.length} diagnostic codes in category: ${category}`);

    res.json({
      success: true,
      diagnosticCodes
    });

  } catch (error) {
    console.error('Get diagnostic codes by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving diagnostic codes by category'
    });
  }
});

// Search diagnostic codes (autocomplete endpoint)
router.get('/search/:term', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { term } = req.params;
    const { category, bodySystem, commonlyUsed, limit = 20 } = req.query;

    if (!term || term.trim().length < 1) {
      return res.json({
        success: true,
        diagnosticCodes: []
      });
    }

    console.log(`🔍 Searching diagnostic codes for: "${term}" in clinic: ${clinicId}`);

    const options = {};
    if (category) options.category = category;
    if (bodySystem) options.bodySystem = bodySystem;
    if (commonlyUsed !== undefined) options.commonlyUsed = commonlyUsed === 'true';
    options.limit = parseInt(limit);

    const diagnosticCodes = await DiagnosticCode.searchCodes(
      clinicId,
      term.trim(),
      options
    );

    console.log(`📊 Found ${diagnosticCodes.length} diagnostic codes matching: "${term}"`);

    res.json({
      success: true,
      diagnosticCodes
    });

  } catch (error) {
    console.error('Search diagnostic codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching diagnostic codes'
    });
  }
});

// Create a new diagnostic code (admin/doctor only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;

    // Only doctors and admins can create diagnostic codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create diagnostic codes'
      });
    }

    const diagnosticCodeData = {
      ...req.body,
      clinicId
    };

    console.log(`➕ Creating diagnostic code: ${diagnosticCodeData.code} for clinic: ${clinicId}`);

    const diagnosticCode = new DiagnosticCode(diagnosticCodeData);
    await diagnosticCode.save();

    console.log(`✅ Diagnostic code created: ${diagnosticCode.code}`);

    res.status(201).json({
      success: true,
      message: 'Diagnostic code created successfully',
      diagnosticCode
    });

  } catch (error) {
    console.error('Create diagnostic code error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Diagnostic code already exists for this clinic'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating diagnostic code'
    });
  }
});

// Update a diagnostic code (admin/doctor only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { id } = req.params;

    // Only doctors and admins can update diagnostic codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update diagnostic codes'
      });
    }

    console.log(`📝 Updating diagnostic code: ${id} for clinic: ${clinicId}`);

    const diagnosticCode = await DiagnosticCode.findOneAndUpdate(
      { _id: id, clinicId },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!diagnosticCode) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic code not found'
      });
    }

    console.log(`✅ Diagnostic code updated: ${diagnosticCode.code}`);

    res.json({
      success: true,
      message: 'Diagnostic code updated successfully',
      diagnosticCode
    });

  } catch (error) {
    console.error('Update diagnostic code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating diagnostic code'
    });
  }
});

// Delete a diagnostic code (admin/doctor only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { id } = req.params;

    // Only doctors and admins can delete diagnostic codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete diagnostic codes'
      });
    }

    console.log(`🗑️ Deleting diagnostic code: ${id} for clinic: ${clinicId}`);

    const diagnosticCode = await DiagnosticCode.findOneAndUpdate(
      { _id: id, clinicId },
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!diagnosticCode) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic code not found'
      });
    }

    console.log(`✅ Diagnostic code deactivated: ${diagnosticCode.code}`);

    res.json({
      success: true,
      message: 'Diagnostic code deleted successfully'
    });

  } catch (error) {
    console.error('Delete diagnostic code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting diagnostic code'
    });
  }
});

// Increment usage count for a diagnostic code
router.post('/:id/use', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { id } = req.params;

    console.log(`📈 Incrementing usage for diagnostic code: ${id}`);

    const diagnosticCode = await DiagnosticCode.findOne({ _id: id, clinicId });

    if (!diagnosticCode) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic code not found'
      });
    }

    await diagnosticCode.incrementUsage();

    console.log(`✅ Usage incremented for: ${diagnosticCode.code} (count: ${diagnosticCode.usageCount})`);

    res.json({
      success: true,
      message: 'Usage count updated',
      diagnosticCode
    });

  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating usage count'
    });
  }
});

module.exports = router;
