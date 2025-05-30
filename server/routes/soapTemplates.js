const express = require('express');
const router = express.Router();
const { SoapTemplate } = require('../models');
const { verifyToken } = require('../middleware/auth');

// Get all SOAP templates for a clinic
router.get('/', verifyToken, async (req, res) => {
  try {

    const { clinicId, role } = req.user;
    const { category, sortBy, search } = req.query;

    // Only doctors can access SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    let templates;

    if (search && search.trim()) {
      // Search templates
      templates = await SoapTemplate.searchTemplates(clinicId, search.trim(), {
        limit: 50
      });
    } else {
      // Get all templates with optional filtering
      templates = await SoapTemplate.getTemplatesForClinic(clinicId, {
        category,
        sortBy,
        limit: 50
      });
    }

    console.log(`📋 Retrieved ${templates.length} SOAP templates for clinic: ${clinicId}`);
    console.log(`🔍 Template search query:`, { clinicId, isActive: true });
    console.log(`🔍 First few templates:`, templates.slice(0, 2));

    // Debug: Check all templates in database
    const allTemplates = await SoapTemplate.find({});
    console.log(`🔍 Total templates in database: ${allTemplates.length}`);
    const templatesByClinic = {};
    allTemplates.forEach(template => {
      if (!templatesByClinic[template.clinicId]) {
        templatesByClinic[template.clinicId] = 0;
      }
      templatesByClinic[template.clinicId]++;
    });
    console.log(`🔍 Templates by clinic:`, templatesByClinic);

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get SOAP templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SOAP templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get a specific SOAP template
router.get('/:id', verifyToken, async (req, res) => {
  try {

    const { clinicId, role } = req.user;
    const { id } = req.params;

    // Only doctors can access SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const template = await SoapTemplate.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Get SOAP template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching SOAP template'
    });
  }
});

// Create a new SOAP template
router.post('/', verifyToken, async (req, res) => {
  try {

    const { clinicId, role, name } = req.user;
    const { templateName, subjective, objective, assessment, plan, category, description } = req.body;

    // Only doctors can create SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Validate required fields
    if (!templateName || !templateName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Check if template name already exists for this clinic
    const existingTemplate = await SoapTemplate.findOne({
      clinicId,
      templateName: templateName.trim(),
      isActive: true
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'A template with this name already exists'
      });
    }

    // Create new template
    const template = new SoapTemplate({
      templateName: templateName.trim(),
      clinicId,
      subjective: subjective || '',
      objective: objective || '',
      assessment: assessment || '',
      plan: plan || '',
      category: category || 'General',
      description: description || '',
      createdBy: name || req.user.email
    });

    await template.save();

    console.log(`✅ SOAP template created: ${templateName} by ${name} for clinic: ${clinicId}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('Create SOAP template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating SOAP template'
    });
  }
});

// Update a SOAP template
router.put('/:id', verifyToken, async (req, res) => {
  try {

    const { clinicId, role, name } = req.user;
    const { id } = req.params;
    const { templateName, subjective, objective, assessment, plan, category, description } = req.body;

    // Only doctors can update SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const template = await SoapTemplate.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if new template name conflicts with existing templates
    if (templateName && templateName.trim() !== template.templateName) {
      const existingTemplate = await SoapTemplate.findOne({
        clinicId,
        templateName: templateName.trim(),
        isActive: true,
        _id: { $ne: id }
      });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'A template with this name already exists'
        });
      }
    }

    // Update template
    if (templateName) template.templateName = templateName.trim();
    if (subjective !== undefined) template.subjective = subjective;
    if (objective !== undefined) template.objective = objective;
    if (assessment !== undefined) template.assessment = assessment;
    if (plan !== undefined) template.plan = plan;
    if (category !== undefined) template.category = category;
    if (description !== undefined) template.description = description;
    template.updatedBy = name || req.user.email;

    await template.save();

    console.log(`✅ SOAP template updated: ${template.templateName} by ${name}`);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('Update SOAP template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating SOAP template'
    });
  }
});

// Delete a SOAP template (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {

    const { clinicId, role, name } = req.user;
    const { id } = req.params;

    // Only doctors can delete SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const template = await SoapTemplate.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Soft delete
    template.isActive = false;
    template.updatedBy = name || req.user.email;
    await template.save();

    console.log(`✅ SOAP template deleted: ${template.templateName} by ${name}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete SOAP template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting SOAP template'
    });
  }
});

// Apply template with macros
router.post('/:id/apply', verifyToken, async (req, res) => {
  try {

    const { clinicId, role } = req.user;
    const { id } = req.params;
    const { macroValues } = req.body;

    // Only doctors can apply SOAP templates
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const template = await SoapTemplate.findOne({
      _id: id,
      clinicId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Apply macros and get populated content
    const populatedContent = template.applyMacros(macroValues || {});

    // Increment usage count
    await template.incrementUsage();

    console.log(`✅ SOAP template applied: ${template.templateName} (usage: ${template.usageCount + 1})`);

    res.json({
      success: true,
      content: populatedContent,
      templateName: template.templateName
    });

  } catch (error) {
    console.error('Apply SOAP template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying SOAP template'
    });
  }
});

module.exports = router;
