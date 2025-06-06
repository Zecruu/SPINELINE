const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { CareKit, ServiceCode } = require('../models');

// Get all Care Kits for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { category, treatmentType, favorites, search, includeHidden } = req.query;

    let kits;
    
    if (search) {
      kits = await CareKit.searchKits(clinicId, search, {
        category,
        treatmentType,
        includeHidden: includeHidden === 'true'
      });
    } else if (favorites === 'true') {
      kits = await CareKit.getFavorites(clinicId);
    } else {
      kits = await CareKit.findByClinic(clinicId, {
        category,
        treatmentType,
        includeHidden: includeHidden === 'true'
      });
    }

    res.json({
      success: true,
      kits
    });
  } catch (error) {
    console.error('Get Care Kits error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching Care Kits'
    });
  }
});

// Get single Care Kit by ID
router.get('/:kitId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { kitId } = req.params;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    res.json({
      success: true,
      kit
    });
  } catch (error) {
    console.error('Get Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching Care Kit'
    });
  }
});

// Create new Care Kit
router.post('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { name, description, services, category, treatmentType, discountPercentage } = req.body;

    // Validate required fields
    if (!name || !services || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one service code are required'
      });
    }

    // Check if kit name already exists
    const existingKit = await CareKit.findOne({
      clinicId,
      name,
      isActive: true
    });

    if (existingKit) {
      return res.status(400).json({
        success: false,
        message: 'A Care Kit with this name already exists'
      });
    }

    // Validate service codes exist in the clinic's service codes
    const validCodes = await ServiceCode.find({
      clinicId,
      code: { $in: services.map(s => s.code) },
      isActive: true
    });

    if (validCodes.length !== services.length) {
      return res.status(400).json({
        success: false,
        message: 'Some service codes are not valid for this clinic'
      });
    }

    // Create new kit
    const newKit = new CareKit({
      clinicId,
      name,
      description,
      services,
      category: category || 'Custom',
      treatmentType: treatmentType || 'Chiropractic',
      discountPercentage: discountPercentage || 0,
      createdBy: userId
    });

    await newKit.save();

    res.status(201).json({
      success: true,
      message: 'Care Kit created successfully',
      kit: newKit
    });
  } catch (error) {
    console.error('Create Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating Care Kit'
    });
  }
});

// Update Care Kit
router.put('/:kitId', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { kitId } = req.params;
    const { name, description, services, category, treatmentType, discountPercentage, customName } = req.body;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    // Check if new name conflicts with existing kits
    if (name && name !== kit.name) {
      const existingKit = await CareKit.findOne({
        clinicId,
        name,
        isActive: true,
        _id: { $ne: kitId }
      });

      if (existingKit) {
        return res.status(400).json({
          success: false,
          message: 'A Care Kit with this name already exists'
        });
      }
    }

    // Update fields
    if (name) kit.name = name;
    if (description !== undefined) kit.description = description;
    if (services) kit.services = services;
    if (category) kit.category = category;
    if (treatmentType) kit.treatmentType = treatmentType;
    if (discountPercentage !== undefined) kit.discountPercentage = discountPercentage;
    if (customName !== undefined) kit.customName = customName;
    kit.updatedBy = userId;

    await kit.save();

    res.json({
      success: true,
      message: 'Care Kit updated successfully',
      kit
    });
  } catch (error) {
    console.error('Update Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating Care Kit'
    });
  }
});

// Toggle favorite status
router.patch('/:kitId/favorite', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { kitId } = req.params;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    await kit.toggleFavorite();

    res.json({
      success: true,
      message: `Care Kit ${kit.isFavorite ? 'added to' : 'removed from'} favorites`,
      kit
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating favorite status'
    });
  }
});

// Clone Care Kit
router.post('/:kitId/clone', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { kitId } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({
        success: false,
        message: 'New name is required for cloning'
      });
    }

    const originalKit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!originalKit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    // Check if new name already exists
    const existingKit = await CareKit.findOne({
      clinicId,
      name: newName,
      isActive: true
    });

    if (existingKit) {
      return res.status(400).json({
        success: false,
        message: 'A Care Kit with this name already exists'
      });
    }

    const clonedKit = await originalKit.clone(newName, userId);

    res.status(201).json({
      success: true,
      message: 'Care Kit cloned successfully',
      kit: clonedKit
    });
  } catch (error) {
    console.error('Clone Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cloning Care Kit'
    });
  }
});

// Apply Care Kit (increment usage and return services)
router.post('/:kitId/apply', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { kitId } = req.params;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    await kit.incrementUsage();

    res.json({
      success: true,
      message: 'Care Kit applied successfully',
      services: kit.services.filter(service => service.isActive),
      totalAmount: kit.totalAmount,
      discountAmount: kit.discountAmount,
      finalAmount: kit.finalAmount
    });
  } catch (error) {
    console.error('Apply Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying Care Kit'
    });
  }
});

// Hide/Show Care Kit
router.patch('/:kitId/visibility', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { kitId } = req.params;
    const { isHidden } = req.body;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    kit.isHidden = isHidden;
    await kit.save();

    res.json({
      success: true,
      message: `Care Kit ${isHidden ? 'hidden' : 'shown'} successfully`,
      kit
    });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating visibility'
    });
  }
});

// Delete Care Kit
router.delete('/:kitId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { kitId } = req.params;

    const kit = await CareKit.findOne({
      _id: kitId,
      clinicId,
      isActive: true
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Care Kit not found'
      });
    }

    // Soft delete
    kit.isActive = false;
    await kit.save();

    res.json({
      success: true,
      message: 'Care Kit deleted successfully'
    });
  } catch (error) {
    console.error('Delete Care Kit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting Care Kit'
    });
  }
});

module.exports = router;
