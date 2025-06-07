const express = require('express');
const router = express.Router();
const BillingCluster = require('../models/BillingCluster');
const { verifyToken } = require('../middleware/auth');

// Get all billing clusters for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { category, favorites, search, includeHidden } = req.query;

    // Only doctors can access clusters
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    let query = { clinicId, isActive: true };

    // Apply filters
    if (favorites === 'true') {
      query.isFavorite = true;
    }

    if (category && category !== 'all') {
      query.tags = category;
    }

    let clusters;
    
    if (search) {
      // Text search across name and description
      clusters = await BillingCluster.find({
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'codes.code': { $regex: search, $options: 'i' } },
          { 'codes.description': { $regex: search, $options: 'i' } }
        ]
      }).sort({ usageCount: -1, name: 1 });
    } else {
      clusters = await BillingCluster.find(query).sort({ usageCount: -1, name: 1 });
    }

    // Transform data for frontend
    const transformedClusters = clusters.map(cluster => ({
      _id: cluster._id,
      name: cluster.name,
      displayName: cluster.name,
      description: cluster.description,
      tags: cluster.tags,
      codes: cluster.codes.filter(code => code.isActive),
      usageCount: cluster.usageCount,
      lastUsed: cluster.lastUsed,
      isFavorite: cluster.isFavorite,
      isDefault: cluster.isDefault,
      createdAt: cluster.createdAt
    }));

    res.json({
      success: true,
      clusters: transformedClusters
    });
  } catch (error) {
    console.error('Get billing clusters error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching billing clusters',
      error: error.message
    });
  }
});

// Get favorite billing clusters
router.get('/favorites', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const favorites = await BillingCluster.find({
      clinicId,
      isActive: true,
      isFavorite: true
    })
    .sort({ usageCount: -1, lastUsed: -1, name: 1 })
    .limit(10);

    // Transform data for frontend
    const transformedFavorites = favorites.map(cluster => ({
      _id: cluster._id,
      name: cluster.name,
      displayName: cluster.name,
      description: cluster.description,
      tags: cluster.tags,
      codes: cluster.codes.filter(code => code.isActive),
      usageCount: cluster.usageCount,
      lastUsed: cluster.lastUsed,
      createdAt: cluster.createdAt
    }));

    res.json({
      success: true,
      favorites: transformedFavorites
    });
  } catch (error) {
    console.error('Get billing cluster favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching favorite billing clusters',
      error: error.message
    });
  }
});

// Get single billing cluster by ID
router.get('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { clusterId } = req.params;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const cluster = await BillingCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Billing cluster not found'
      });
    }

    res.json({
      success: true,
      cluster
    });
  } catch (error) {
    console.error('Get billing cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching billing cluster',
      error: error.message
    });
  }
});

// Create new billing cluster
router.post('/', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name: userName } = req.user;
    const { name, description, tags, codes } = req.body;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Validate required fields
    if (!name || !codes || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one code are required'
      });
    }

    // Check if cluster name already exists
    const existingCluster = await BillingCluster.findOne({
      clinicId,
      name,
      isActive: true
    });

    if (existingCluster) {
      return res.status(400).json({
        success: false,
        message: 'A cluster with this name already exists'
      });
    }

    // Create new cluster
    const newCluster = new BillingCluster({
      clinicId,
      name,
      description,
      tags: tags || [],
      codes,
      createdBy: userName || 'Unknown'
    });

    await newCluster.save();

    res.status(201).json({
      success: true,
      message: 'Billing cluster created successfully',
      cluster: newCluster
    });
  } catch (error) {
    console.error('Create billing cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating billing cluster',
      error: error.message
    });
  }
});

// Update billing cluster
router.put('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name: userName } = req.user;
    const { clusterId } = req.params;
    const { name, description, tags, codes } = req.body;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Validate required fields
    if (!name || !codes || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name and at least one code are required'
      });
    }

    // Check if another cluster with the same name exists (excluding current)
    const existingCluster = await BillingCluster.findOne({
      _id: { $ne: clusterId },
      clinicId,
      name,
      isActive: true
    });

    if (existingCluster) {
      return res.status(400).json({
        success: false,
        message: 'A cluster with this name already exists'
      });
    }

    // Update cluster
    const updatedCluster = await BillingCluster.findOneAndUpdate(
      { _id: clusterId, clinicId, isActive: true },
      {
        name,
        description,
        tags: tags || [],
        codes,
        updatedBy: userName || 'Unknown'
      },
      { new: true }
    );

    if (!updatedCluster) {
      return res.status(404).json({
        success: false,
        message: 'Billing cluster not found'
      });
    }

    res.json({
      success: true,
      message: 'Billing cluster updated successfully',
      cluster: updatedCluster
    });
  } catch (error) {
    console.error('Update billing cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating billing cluster',
      error: error.message
    });
  }
});

// Delete billing cluster (soft delete)
router.delete('/:clusterId', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name: userName } = req.user;
    const { clusterId } = req.params;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const cluster = await BillingCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Billing cluster not found'
      });
    }

    // Prevent deletion of default clusters
    if (cluster.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default clusters. You can rename or edit them instead.'
      });
    }

    // Soft delete
    await BillingCluster.findOneAndUpdate(
      { _id: clusterId, clinicId },
      { 
        isActive: false,
        updatedBy: userName || 'Unknown'
      }
    );

    res.json({
      success: true,
      message: 'Billing cluster deleted successfully'
    });
  } catch (error) {
    console.error('Delete billing cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting billing cluster',
      error: error.message
    });
  }
});

// Apply billing cluster (get codes for selection)
router.post('/:clusterId/apply', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { clusterId } = req.params;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const cluster = await BillingCluster.findOne({
      _id: clusterId,
      clinicId,
      isActive: true
    });

    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Billing cluster not found'
      });
    }

    // Update usage statistics
    await BillingCluster.findOneAndUpdate(
      { _id: clusterId, clinicId },
      { 
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      }
    );

    // Return the codes from the cluster
    const codes = cluster.codes.filter(code => code.isActive).map(code => ({
      code: code.code,
      description: code.description,
      type: code.type,
      unitRate: code.unitRate,
      duration: code.duration,
      category: 'Billing',
      isPackage: false
    }));

    res.json({
      success: true,
      message: 'Billing cluster applied successfully',
      codes,
      clusterName: cluster.name
    });
  } catch (error) {
    console.error('Apply billing cluster error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying billing cluster',
      error: error.message
    });
  }
});

module.exports = router;
