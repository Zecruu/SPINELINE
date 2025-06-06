const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Code Booster model (in-memory for now, can be moved to MongoDB later)
let codeBoosters = [];

// Default boosters to create for new clinics
const defaultBoosters = [
  {
    _id: 'default-1',
    name: 'ChiroClassic',
    description: 'Standard chiropractic adjustment with electrical stimulation',
    category: 'Spine',
    codes: [
      { code: '98941', description: 'Chiropractic manipulative treatment; spinal, 3-4 regions', type: 'CPT', isActive: true },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', isActive: true }
    ],
    isDefault: true,
    isFavorite: false,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'default-2',
    name: 'QuickSpine Relief',
    description: 'Quick spinal adjustment with modality',
    category: 'Spine',
    codes: [
      { code: '98940', description: 'Chiropractic manipulative treatment; spinal, 1-2 regions', type: 'CPT', isActive: true },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', isActive: true }
    ],
    isDefault: true,
    isFavorite: false,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'default-3',
    name: 'Advanced Full Spine',
    description: 'Comprehensive spinal treatment with modalities',
    category: 'Spine',
    codes: [
      { code: '98942', description: 'Chiropractic manipulative treatment; spinal, 5 regions', type: 'CPT', isActive: true },
      { code: '97012', description: 'Application of a modality to 1 or more areas; traction, mechanical', type: 'CPT', isActive: true }
    ],
    isDefault: true,
    isFavorite: false,
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// All routes require authentication
router.use(verifyToken);

// Get all code boosters for a clinic
router.get('/', async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { category, favorites, search } = req.query;

    // Only doctors can access boosters
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    console.log(`📋 Getting code boosters for clinic: ${clinicId}`);

    // Filter boosters by clinic
    let clinicBoosters = codeBoosters.filter(booster => 
      booster.clinicId === clinicId && booster.isActive
    );

    // If no boosters exist for this clinic, create default ones
    if (clinicBoosters.length === 0 && !search && !category) {
      console.log(`🚀 Creating default boosters for clinic: ${clinicId}`);
      
      const newDefaultBoosters = defaultBoosters.map(booster => ({
        ...booster,
        _id: `${clinicId}-${booster._id}`,
        clinicId,
        createdBy: req.user.name || req.user.email
      }));

      codeBoosters.push(...newDefaultBoosters);
      clinicBoosters = newDefaultBoosters;
    }

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      clinicBoosters = clinicBoosters.filter(booster =>
        booster.name.toLowerCase().includes(searchLower) ||
        booster.description.toLowerCase().includes(searchLower)
      );
    }

    if (category && category !== 'all') {
      clinicBoosters = clinicBoosters.filter(booster => booster.category === category);
    }

    if (favorites === 'true') {
      clinicBoosters = clinicBoosters.filter(booster => booster.isFavorite);
    }

    console.log(`📊 Returning ${clinicBoosters.length} code boosters`);

    res.json({
      success: true,
      boosters: clinicBoosters
    });

  } catch (error) {
    console.error('Get code boosters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get code boosters',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new code booster
router.post('/', async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { templateName, description, category, content } = req.body;

    // Validate required fields
    if (!templateName || !content?.codes || content.codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one code are required'
      });
    }

    // Check if booster name already exists
    const existingBooster = codeBoosters.find(booster =>
      booster.clinicId === clinicId &&
      booster.name.toLowerCase() === templateName.toLowerCase() &&
      booster.isActive
    );

    if (existingBooster) {
      return res.status(400).json({
        success: false,
        message: 'A booster with this name already exists'
      });
    }

    // Create new booster
    const newBooster = {
      _id: `${clinicId}-${Date.now()}`,
      clinicId,
      name: templateName,
      description: description || '',
      category: category || 'General',
      codes: content.codes.map(code => ({
        ...code,
        isActive: true
      })),
      isDefault: false,
      isFavorite: false,
      isActive: true,
      usageCount: 0,
      lastUsed: null,
      createdBy: name || req.user.email,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    codeBoosters.push(newBooster);

    console.log(`✅ Code booster created: ${templateName} by ${name || req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Code booster created successfully',
      booster: newBooster
    });

  } catch (error) {
    console.error('Create code booster error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create code booster',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update code booster
router.put('/:id', async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    const { id } = req.params;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const boosterIndex = codeBoosters.findIndex(booster =>
      booster._id === id && booster.clinicId === clinicId
    );

    if (boosterIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Code booster not found'
      });
    }

    const { templateName, description, category, content } = req.body;

    // Update booster
    codeBoosters[boosterIndex] = {
      ...codeBoosters[boosterIndex],
      name: templateName || codeBoosters[boosterIndex].name,
      description: description || codeBoosters[boosterIndex].description,
      category: category || codeBoosters[boosterIndex].category,
      codes: content?.codes || codeBoosters[boosterIndex].codes,
      updatedBy: name || req.user.email,
      updatedAt: new Date()
    };

    console.log(`✅ Code booster updated: ${templateName} by ${name || req.user.email}`);

    res.json({
      success: true,
      message: 'Code booster updated successfully',
      booster: codeBoosters[boosterIndex]
    });

  } catch (error) {
    console.error('Update code booster error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update code booster',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete code booster
router.delete('/:id', async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { id } = req.params;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const boosterIndex = codeBoosters.findIndex(booster =>
      booster._id === id && booster.clinicId === clinicId
    );

    if (boosterIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Code booster not found'
      });
    }

    // Soft delete
    codeBoosters[boosterIndex].isActive = false;
    codeBoosters[boosterIndex].updatedAt = new Date();

    console.log(`✅ Code booster deleted: ${codeBoosters[boosterIndex].name}`);

    res.json({
      success: true,
      message: 'Code booster deleted successfully'
    });

  } catch (error) {
    console.error('Delete code booster error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete code booster',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
