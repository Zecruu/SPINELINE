const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { ServiceCode } = require('../models');

// Get all service codes for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { search, isPackage, limit = 50 } = req.query;

    console.log(`📋 Service codes request from ${role} for clinic: ${clinicId}`);

    let query = { clinicId, isActive: true };

    // Filter by package type if specified
    if (isPackage !== undefined) {
      query.isPackage = isPackage === 'true';
    }

    let serviceCodes;

    if (search && search.trim()) {
      // Search functionality
      serviceCodes = await ServiceCode.searchCodes(
        clinicId,
        search.trim(),
        {
          isPackage: isPackage === 'true' ? true : isPackage === 'false' ? false : undefined,
          limit: parseInt(limit)
        }
      );
    } else {
      // Get all codes
      serviceCodes = await ServiceCode.find(query)
        .sort({ code: 1 })
        .limit(parseInt(limit));
    }

    console.log(`📋 Found ${serviceCodes.length} service codes for clinic: ${clinicId}`);

    res.json({
      success: true,
      serviceCodes
    });

  } catch (error) {
    console.error('Get service codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching service codes'
    });
  }
});

// Get a specific service code
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { id } = req.params;

    const serviceCode = await ServiceCode.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found'
      });
    }

    res.json({
      success: true,
      serviceCode
    });

  } catch (error) {
    console.error('Get service code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching service code'
    });
  }
});

// Search service codes (autocomplete endpoint)
router.get('/search/:term', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { term } = req.params;
    const { isPackage, limit = 20 } = req.query;

    if (!term || term.trim().length < 1) {
      return res.json({
        success: true,
        serviceCodes: []
      });
    }

    const serviceCodes = await ServiceCode.searchCodes(
      clinicId,
      term.trim(),
      {
        isPackage: isPackage === 'true' ? true : isPackage === 'false' ? false : undefined,
        limit: parseInt(limit)
      }
    );

    res.json({
      success: true,
      serviceCodes
    });

  } catch (error) {
    console.error('Search service codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching service codes'
    });
  }
});

// Create a new service code (admin/doctor only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;

    // Only doctors and admins can create service codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to create service codes'
      });
    }

    const serviceCodeData = {
      ...req.body,
      clinicId
    };

    const serviceCode = new ServiceCode(serviceCodeData);
    await serviceCode.save();

    res.status(201).json({
      success: true,
      message: 'Service code created successfully',
      serviceCode
    });

  } catch (error) {
    console.error('Create service code error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service code already exists for this clinic'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating service code'
    });
  }
});

// Update a service code (admin/doctor only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { id } = req.params;

    // Only doctors and admins can update service codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update service codes'
      });
    }

    const serviceCode = await ServiceCode.findOneAndUpdate(
      { _id: id, clinicId },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found'
      });
    }

    res.json({
      success: true,
      message: 'Service code updated successfully',
      serviceCode
    });

  } catch (error) {
    console.error('Update service code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating service code'
    });
  }
});

// Delete a service code (soft delete - admin/doctor only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { id } = req.params;

    // Only doctors and admins can delete service codes
    if (role !== 'doctor' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete service codes'
      });
    }

    const serviceCode = await ServiceCode.findOneAndUpdate(
      { _id: id, clinicId },
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found'
      });
    }

    res.json({
      success: true,
      message: 'Service code deleted successfully'
    });

  } catch (error) {
    console.error('Delete service code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting service code'
    });
  }
});

// Increment usage count for a service code
router.post('/:id/usage', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { id } = req.params;

    const serviceCode = await ServiceCode.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!serviceCode) {
      return res.status(404).json({
        success: false,
        message: 'Service code not found'
      });
    }

    await serviceCode.incrementUsage();

    res.json({
      success: true,
      message: 'Usage count updated'
    });

  } catch (error) {
    console.error('Update usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating usage'
    });
  }
});

module.exports = router;
