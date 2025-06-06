const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { DxCluster, DiagnosticCode } = require('../models');

// Get all Dx Clusters for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { category, favorites, search, includeHidden } = req.query;

    let clusters;
    
    if (search) {
      clusters = await DxCluster.searchClusters(clinicId, search, {
        category,
        includeHidden: includeHidden === 'true'
      });
    } else if (favorites === 'true') {
      clusters = await DxCluster.getFavorites(clinicId);
    } else {
      clusters = await DxCluster.findByClinic(clinicId, {
        category,
        includeHidden: includeHidden === 'true'
      });
    }

    res.json({
      success: true,
      clusters
    });
  } catch (error) {
    console.error('Get Dx Clusters error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching Dx Clusters'
    });
  }
});

// Get single Dx Cluster by ID
router.get('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { clusterId } = req.params;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    res.json({
      success: true,
      cluster
    });
  } catch (error) {
    console.error('Get Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching Dx Cluster'
    });
  }
});

// Create new Dx Cluster
router.post('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { name, description, codes, category } = req.body;

    // Validate required fields
    if (!name || !codes || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one ICD-10 code are required'
      });
    }

    // Check if cluster name already exists
    const existingCluster = await DxCluster.findOne({
      clinicId,
      name,
      isActive: true
    });

    if (existingCluster) {
      return res.status(400).json({
        success: false,
        message: 'A Dx Cluster with this name already exists'
      });
    }

    // Validate ICD-10 codes exist in the clinic's diagnostic codes
    const validCodes = await DiagnosticCode.find({
      clinicId,
      code: { $in: codes.map(c => c.code) },
      isActive: true
    });

    if (validCodes.length !== codes.length) {
      return res.status(400).json({
        success: false,
        message: 'Some ICD-10 codes are not valid for this clinic'
      });
    }

    // Create new cluster
    const newCluster = new DxCluster({
      clinicId,
      name,
      description,
      codes,
      category: category || 'Custom',
      createdBy: userId
    });

    await newCluster.save();

    res.status(201).json({
      success: true,
      message: 'Dx Cluster created successfully',
      cluster: newCluster
    });
  } catch (error) {
    console.error('Create Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating Dx Cluster'
    });
  }
});

// Update Dx Cluster
router.put('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { clusterId } = req.params;
    const { name, description, codes, category, customName } = req.body;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    // Check if new name conflicts with existing clusters
    if (name && name !== cluster.name) {
      const existingCluster = await DxCluster.findOne({
        clinicId,
        name,
        isActive: true,
        _id: { $ne: clusterId }
      });

      if (existingCluster) {
        return res.status(400).json({
          success: false,
          message: 'A Dx Cluster with this name already exists'
        });
      }
    }

    // Update fields
    if (name) cluster.name = name;
    if (description !== undefined) cluster.description = description;
    if (codes) cluster.codes = codes;
    if (category) cluster.category = category;
    if (customName !== undefined) cluster.customName = customName;
    cluster.updatedBy = userId;

    await cluster.save();

    res.json({
      success: true,
      message: 'Dx Cluster updated successfully',
      cluster
    });
  } catch (error) {
    console.error('Update Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating Dx Cluster'
    });
  }
});

// Toggle favorite status
router.patch('/:clusterId/favorite', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { clusterId } = req.params;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    await cluster.toggleFavorite();

    res.json({
      success: true,
      message: `Dx Cluster ${cluster.isFavorite ? 'added to' : 'removed from'} favorites`,
      cluster
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating favorite status'
    });
  }
});

// Clone Dx Cluster
router.post('/:clusterId/clone', verifyToken, async (req, res) => {
  try {
    const { clinicId, userId } = req.user;
    const { clusterId } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({
        success: false,
        message: 'New name is required for cloning'
      });
    }

    const originalCluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!originalCluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    // Check if new name already exists
    const existingCluster = await DxCluster.findOne({
      clinicId,
      name: newName,
      isActive: true
    });

    if (existingCluster) {
      return res.status(400).json({
        success: false,
        message: 'A Dx Cluster with this name already exists'
      });
    }

    const clonedCluster = await originalCluster.clone(newName, userId);

    res.status(201).json({
      success: true,
      message: 'Dx Cluster cloned successfully',
      cluster: clonedCluster
    });
  } catch (error) {
    console.error('Clone Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cloning Dx Cluster'
    });
  }
});

// Apply Dx Cluster (increment usage)
router.post('/:clusterId/apply', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { clusterId } = req.params;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    await cluster.incrementUsage();

    res.json({
      success: true,
      message: 'Dx Cluster applied successfully',
      codes: cluster.codes.filter(code => code.isActive)
    });
  } catch (error) {
    console.error('Apply Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying Dx Cluster'
    });
  }
});

// Hide/Show Dx Cluster
router.patch('/:clusterId/visibility', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { clusterId } = req.params;
    const { isHidden } = req.body;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    cluster.isHidden = isHidden;
    await cluster.save();

    res.json({
      success: true,
      message: `Dx Cluster ${isHidden ? 'hidden' : 'shown'} successfully`,
      cluster
    });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating visibility'
    });
  }
});

// Delete Dx Cluster
router.delete('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { clusterId } = req.params;

    const cluster = await DxCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Dx Cluster not found'
      });
    }

    // Soft delete
    cluster.isActive = false;
    await cluster.save();

    res.json({
      success: true,
      message: 'Dx Cluster deleted successfully'
    });
  } catch (error) {
    console.error('Delete Dx Cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting Dx Cluster'
    });
  }
});

module.exports = router;
