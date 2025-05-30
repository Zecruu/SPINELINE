const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Mock template storage (in production, these would be stored in MongoDB)
let procedureTemplates = [];
let diagnosticTemplates = [];
let alertTemplates = [];

// Get procedure templates
router.get('/procedures', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    
    // Only allow doctors to access templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Filter templates by clinic
    const clinicTemplates = procedureTemplates.filter(template => 
      template.clinicId === clinicId && template.isActive !== false
    );

    console.log(`📋 Retrieved ${clinicTemplates.length} procedure templates for clinic: ${clinicId}`);

    res.json({
      success: true,
      templates: clinicTemplates
    });

  } catch (error) {
    console.error('Get procedure templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get procedure templates'
    });
  }
});

// Create procedure template
router.post('/procedures', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { templateName, description, category, content } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    const newTemplate = {
      _id: Date.now().toString(),
      templateName: templateName.trim(),
      description: description || '',
      category: category || 'General',
      content: content || { codes: [], notes: '' },
      clinicId,
      createdBy: name || req.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isActive: true
    };

    procedureTemplates.push(newTemplate);

    console.log(`✅ Procedure template created: ${templateName} by ${name}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    });

  } catch (error) {
    console.error('Create procedure template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create procedure template'
    });
  }
});

// Update procedure template
router.put('/procedures/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    const { id } = req.params;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const templateIndex = procedureTemplates.findIndex(t => 
      t._id === id && t.clinicId === clinicId && t.isActive !== false
    );

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const { templateName, description, category, content } = req.body;

    // Update template
    procedureTemplates[templateIndex] = {
      ...procedureTemplates[templateIndex],
      templateName: templateName || procedureTemplates[templateIndex].templateName,
      description: description !== undefined ? description : procedureTemplates[templateIndex].description,
      category: category || procedureTemplates[templateIndex].category,
      content: content || procedureTemplates[templateIndex].content,
      updatedBy: name || req.user.email,
      updatedAt: new Date()
    };

    console.log(`✅ Procedure template updated: ${templateName} by ${name}`);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: procedureTemplates[templateIndex]
    });

  } catch (error) {
    console.error('Update procedure template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update procedure template'
    });
  }
});

// Delete procedure template
router.delete('/procedures/:id', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    const { id } = req.params;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const templateIndex = procedureTemplates.findIndex(t => 
      t._id === id && t.clinicId === clinicId && t.isActive !== false
    );

    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Soft delete
    procedureTemplates[templateIndex].isActive = false;
    procedureTemplates[templateIndex].updatedBy = name || req.user.email;
    procedureTemplates[templateIndex].updatedAt = new Date();

    console.log(`✅ Procedure template deleted: ${procedureTemplates[templateIndex].templateName} by ${name}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete procedure template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete procedure template'
    });
  }
});

// Get diagnostic templates
router.get('/diagnostics', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const clinicTemplates = diagnosticTemplates.filter(template => 
      template.clinicId === clinicId && template.isActive !== false
    );

    res.json({
      success: true,
      templates: clinicTemplates
    });

  } catch (error) {
    console.error('Get diagnostic templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get diagnostic templates'
    });
  }
});

// Create diagnostic template
router.post('/diagnostics', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { templateName, description, category, content } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    const newTemplate = {
      _id: Date.now().toString(),
      templateName: templateName.trim(),
      description: description || '',
      category: category || 'General',
      content: content || { codes: [], notes: '' },
      clinicId,
      createdBy: name || req.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isActive: true
    };

    diagnosticTemplates.push(newTemplate);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    });

  } catch (error) {
    console.error('Create diagnostic template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create diagnostic template'
    });
  }
});

// Get alert templates
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const clinicTemplates = alertTemplates.filter(template => 
      template.clinicId === clinicId && template.isActive !== false
    );

    res.json({
      success: true,
      templates: clinicTemplates
    });

  } catch (error) {
    console.error('Get alert templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alert templates'
    });
  }
});

// Create alert template
router.post('/alerts', verifyToken, async (req, res) => {
  try {
    const { clinicId, role, name } = req.user;
    
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { templateName, description, category, content } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    const newTemplate = {
      _id: Date.now().toString(),
      templateName: templateName.trim(),
      description: description || '',
      category: category || 'General',
      content: content || { message: '', severity: 'medium', conditions: [] },
      clinicId,
      createdBy: name || req.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isActive: true
    };

    alertTemplates.push(newTemplate);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: newTemplate
    });

  } catch (error) {
    console.error('Create alert template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert template'
    });
  }
});

module.exports = router;
