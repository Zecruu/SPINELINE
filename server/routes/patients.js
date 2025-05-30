const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const { Patient } = require('../models');
const { isConnected } = require('../config/db');

// All patient routes require authentication
router.use(verifyToken);

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/patient-photos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: patientId_timestamp.extension
    const uniqueName = `${req.params.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer for document uploads
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/patient-documents');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: patientId_timestamp_originalname
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${req.params.id}_${Date.now()}_${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents
  },
  fileFilter: function (req, file, cb) {
    // Check file type for documents
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, images, and Word documents are allowed'), false);
    }
  }
});

// Generate record number for new patient
router.get('/generate-record-number', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const clinicId = req.user.clinicId;

    // Generate unique record number
    const recordNumber = await Patient.generateRecordNumber(clinicId);

    // Log record number generation
    console.log(`✅ Record number generated: ${recordNumber} - Clinic: ${clinicId} - By: ${req.user.name || req.user.email}`);

    res.json({
      success: true,
      recordNumber
    });

  } catch (error) {
    console.error('Generate record number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating record number'
    });
  }
});

// Get all patients for the authenticated user's clinic
router.get('/', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { search, status } = req.query;
    const clinicId = req.user.clinicId;

    // Build query
    let query = { clinicId };

    // Add status filter
    if (status && status !== 'all') {
      query.status = status.charAt(0).toUpperCase() + status.slice(1);
    }

    // Add search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { recordNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .select('firstName lastName recordNumber phone email dateOfBirth status lastVisit nextAppointment createdAt alerts')
      .sort({ createdAt: -1 });

    // Add computed fields
    const patientsWithExtras = patients.map(patient => ({
      ...patient.toObject(),
      fullName: patient.fullName,
      age: patient.age,
      hasActiveAlerts: patient.alerts.some(alert => alert.isVisible && !alert.resolvedAt),
      alertCount: patient.alerts.filter(alert => alert.isVisible && !alert.resolvedAt).length
    }));

    res.json({
      success: true,
      patients: patientsWithExtras,
      total: patientsWithExtras.length
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching patients'
    });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const clinicId = req.user.clinicId;
    const createdBy = req.user.name || req.user.email;

    // Use provided record number or generate one
    let recordNumber = req.body.recordNumber;
    if (!recordNumber || recordNumber.trim() === '') {
      recordNumber = await Patient.generateRecordNumber(clinicId);
    } else {
      // Validate that the provided record number doesn't already exist
      const existingPatient = await Patient.findOne({
        clinicId,
        recordNumber: recordNumber.trim().toUpperCase()
      });

      if (existingPatient) {
        return res.status(400).json({
          success: false,
          message: 'Record number already exists for this clinic'
        });
      }

      recordNumber = recordNumber.trim().toUpperCase();
    }

    // Process referrals - calculate expiration dates
    let referrals = [];
    if (req.body.referrals && req.body.referrals.length > 0) {
      referrals = req.body.referrals.map(referral => {
        const referralDate = new Date(referral.referralDate || Date.now());
        const expirationDate = new Date(referralDate);
        expirationDate.setDate(expirationDate.getDate() + (referral.duration || 90)); // Default 90 days

        return {
          ...referral,
          referralDate,
          expirationDate,
          isActive: true
        };
      });
    }

    // Process packages
    let packages = [];
    if (req.body.packages && req.body.packages.length > 0) {
      packages = req.body.packages.map(pkg => ({
        ...pkg,
        usedVisits: 0,
        remainingVisits: pkg.totalVisits,
        startDate: new Date(),
        isActive: true
      }));
    }

    // Process alerts
    let alerts = [];
    if (req.body.alerts && req.body.alerts.length > 0) {
      alerts = req.body.alerts.map(alert => ({
        ...alert,
        createdBy,
        createdAt: new Date(),
        isVisible: true
      }));
    }

    // Create patient data
    const patientData = {
      ...req.body,
      clinicId,
      recordNumber,
      createdBy,
      referrals,
      packages,
      alerts,
      status: req.body.status || 'Active'
    };

    const patient = new Patient(patientData);
    await patient.save();

    // Log patient creation
    console.log(`✅ Patient created: ${patient.fullName} (${patient.recordNumber}) - Clinic: ${clinicId} - By: ${createdBy}`);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      patient: {
        id: patient._id,
        recordNumber: patient.recordNumber,
        fullName: patient.fullName,
        status: patient.status
      }
    });

  } catch (error) {
    console.error('Create patient error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Record number already exists for this clinic'
      });
    }

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
      message: 'Server error creating patient'
    });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;

    const patient = await Patient.findOne({ _id: id, clinicId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Add computed fields
    const patientData = {
      ...patient.toObject(),
      fullName: patient.fullName,
      age: patient.age
    };

    res.json({
      success: true,
      patient: patientData
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching patient'
    });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    // Find existing patient
    const existingPatient = await Patient.findOne({ _id: id, clinicId });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Process referrals - calculate expiration dates for new ones
    let referrals = [];
    if (req.body.referrals && req.body.referrals.length > 0) {
      referrals = req.body.referrals.map(referral => {
        // If it's an existing referral (has _id), keep it as is
        if (referral._id) {
          return referral;
        }

        // For new referrals, calculate expiration
        const referralDate = new Date(referral.referralDate || Date.now());
        const expirationDate = new Date(referralDate);
        expirationDate.setDate(expirationDate.getDate() + (referral.duration || 90));

        return {
          ...referral,
          referralDate,
          expirationDate,
          isActive: true
        };
      });
    }

    // Process packages
    let packages = [];
    if (req.body.packages && req.body.packages.length > 0) {
      packages = req.body.packages.map(pkg => {
        // If it's an existing package (has _id), preserve usage data
        if (pkg._id) {
          return {
            ...pkg,
            remainingVisits: pkg.totalVisits - (pkg.usedVisits || 0)
          };
        }

        // For new packages
        return {
          ...pkg,
          usedVisits: 0,
          remainingVisits: pkg.totalVisits,
          startDate: new Date(),
          isActive: true
        };
      });
    }

    // Process alerts - preserve existing ones, add new ones
    let alerts = existingPatient.alerts || [];
    if (req.body.alerts && req.body.alerts.length > 0) {
      const newAlerts = req.body.alerts.filter(alert => !alert._id).map(alert => ({
        ...alert,
        createdBy: updatedBy,
        createdAt: new Date(),
        isVisible: true
      }));

      const existingAlerts = req.body.alerts.filter(alert => alert._id);
      alerts = [...existingAlerts, ...newAlerts];
    }

    // Update patient data
    const updateData = {
      ...req.body,
      referrals,
      packages,
      alerts,
      updatedBy,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updateData.clinicId;
    delete updateData.recordNumber;
    delete updateData.createdBy;
    delete updateData.createdAt;

    const updatedPatient = await Patient.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true, runValidators: true }
    );

    // Log patient update
    console.log(`✅ Patient updated: ${updatedPatient.fullName} (${updatedPatient.recordNumber}) - Clinic: ${clinicId} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient: {
        id: updatedPatient._id,
        recordNumber: updatedPatient.recordNumber,
        fullName: updatedPatient.fullName,
        status: updatedPatient.status
      }
    });

  } catch (error) {
    console.error('Update patient error:', error);

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
      message: 'Server error updating patient'
    });
  }
});

// Add package to patient
router.post('/:id/packages', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;
    const createdBy = req.user.name || req.user.email;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Prepare package data
    const packageData = {
      ...req.body,
      usedVisits: 0,
      remainingVisits: req.body.totalVisits,
      startDate: req.body.startDate || new Date(),
      isActive: true
    };

    // Add package to patient
    patient.packages.push(packageData);
    patient.updatedBy = createdBy;
    patient.updatedAt = new Date();

    await patient.save();

    // Log package assignment
    console.log(`✅ Package assigned: ${packageData.packageName} to ${patient.fullName} (${patient.recordNumber}) - Clinic: ${clinicId} - By: ${createdBy}`);

    res.json({
      success: true,
      message: 'Package assigned successfully',
      package: packageData
    });

  } catch (error) {
    console.error('Add package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding package to patient'
    });
  }
});

// Delete patient (soft delete - set status to inactive)
router.delete('/:id', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    const patient = await Patient.findOneAndUpdate(
      { _id: id, clinicId },
      {
        status: 'Inactive',
        updatedBy,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Log patient deletion
    console.log(`✅ Patient deactivated: ${patient.fullName} (${patient.recordNumber}) - Clinic: ${clinicId} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: 'Patient deactivated successfully'
    });

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting patient'
    });
  }
});

// Update doctor notes for a patient
router.patch('/:id/doctor-notes', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { clinicId, userId, role } = req.user;
    const { id } = req.params;
    const { notes } = req.body;

    // Only allow doctors to update doctor notes
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    console.log(`🩺 Doctor ${userId} updating notes for patient ${id} in clinic ${clinicId}`);

    // Find and update the patient
    const patient = await Patient.findOneAndUpdate(
      { _id: id, clinicId },
      {
        $set: {
          'doctorNotes': notes,
          'lastUpdatedBy': userId,
          'updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    console.log(`✅ Doctor notes updated for patient: ${patient.firstName} ${patient.lastName}`);

    res.json({
      success: true,
      message: 'Doctor notes updated successfully'
    });

  } catch (error) {
    console.error('Update doctor notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating doctor notes'
    });
  }
});

// Get patient pain scale history
router.get('/:id/pain-history', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;

    // Only allow doctors to access pain history
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Get appointments with pain scale data for this patient
    const { Appointment } = require('../models');
    const appointments = await Appointment.find({
      patientId: id,
      clinicId,
      'visitData.soapNotes.painScale': { $exists: true, $ne: null }
    })
    .select('appointmentDate visitData.soapNotes.painScale')
    .sort({ appointmentDate: -1 })
    .limit(10);

    const painHistory = appointments.map(appointment => ({
      date: appointment.appointmentDate,
      painScale: appointment.visitData.soapNotes.painScale
    }));

    console.log(`📊 Pain history retrieved for patient ${id}: ${painHistory.length} records`);

    res.json({
      success: true,
      history: painHistory
    });

  } catch (error) {
    console.error('Get pain history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pain history'
    });
  }
});

// Upload patient photo
router.post('/:id/photo', upload.single('profilePic'), async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      // Delete uploaded file if patient not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Delete old photo if it exists
    if (patient.profilePic) {
      const oldPhotoPath = path.join(__dirname, '../uploads/patient-photos', path.basename(patient.profilePic));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Generate full URL for the uploaded photo
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.SERVER_URL || 'http://localhost:5001'
      : 'http://localhost:5001';
    const photoUrl = `${baseUrl}/uploads/patient-photos/${req.file.filename}`;

    // Update patient with new photo URL
    const updatedPatient = await Patient.findOneAndUpdate(
      { _id: id, clinicId },
      {
        profilePic: photoUrl,
        updatedBy,
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log(`📸 Photo uploaded for patient: ${patient.firstName} ${patient.lastName} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      profilePicUrl: photoUrl
    });

  } catch (error) {
    console.error('Upload photo error:', error);

    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error uploading photo'
    });
  }
});

// Upload patient document
router.post('/:id/documents', documentUpload.single('document'), async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { category } = req.body;
    const clinicId = req.user.clinicId;
    const uploadedBy = req.user.name || req.user.email;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided'
      });
    }

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      // Delete uploaded file if patient not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate full URL for the uploaded document
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.SERVER_URL || 'http://localhost:5001'
      : 'http://localhost:5001';
    const documentUrl = `${baseUrl}/uploads/patient-documents/${req.file.filename}`;

    // Create document object
    const documentData = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      category: category || 'Other',
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      filePath: documentUrl,
      uploadedBy,
      uploadedAt: new Date()
    };

    // Add document to patient's files array
    if (!patient.files) {
      patient.files = [];
    }
    patient.files.push(documentData);
    patient.updatedBy = uploadedBy;
    patient.updatedAt = new Date();

    await patient.save();

    console.log(`📄 Document uploaded for patient: ${patient.firstName} ${patient.lastName} - File: ${req.file.originalname} - By: ${uploadedBy}`);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: documentData
    });

  } catch (error) {
    console.error('Upload document error:', error);

    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.message.includes('Only PDF, images, and Word documents are allowed')) {
      return res.status(400).json({
        success: false,
        message: 'Only PDF, images, and Word documents are allowed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error uploading document'
    });
  }
});

// Get patient documents
router.get('/:id/documents', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const clinicId = req.user.clinicId;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId }).select('files firstName lastName');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      documents: patient.files || []
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching documents'
    });
  }
});

// Delete patient document
router.delete('/:id/documents/:documentId', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id, documentId } = req.params;
    const clinicId = req.user.clinicId;
    const deletedBy = req.user.name || req.user.email;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find the document
    const documentIndex = patient.files.findIndex(file => file._id.toString() === documentId);
    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = patient.files[documentIndex];

    // Delete the physical file
    const filePath = path.join(__dirname, '../uploads/patient-documents', document.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove document from patient's files array
    patient.files.splice(documentIndex, 1);
    patient.updatedBy = deletedBy;
    patient.updatedAt = new Date();

    await patient.save();

    console.log(`🗑️ Document deleted for patient: ${patient.firstName} ${patient.lastName} - File: ${document.originalName} - By: ${deletedBy}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting document'
    });
  }
});

// Download patient document
router.get('/:id/files/:fileId/download', verifyToken, async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id, fileId } = req.params;
    const clinicId = req.user.clinicId;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find the file in patient's files array
    const file = patient.files.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Extract filename from filePath
    const fileName = path.basename(file.filePath);
    const filePath = path.join(__dirname, '../uploads/patient-documents', fileName);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`📥 File downloaded: ${file.originalName} - Patient: ${patient.firstName} ${patient.lastName} - By: ${req.user.name || req.user.email}`);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading file'
    });
  }
});

// Update patient file metadata
router.patch('/:id/files/:fileId', verifyToken, async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id, fileId } = req.params;
    const { originalName, category } = req.body;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find the file in patient's files array
    const file = patient.files.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Update file metadata
    if (originalName !== undefined) {
      file.originalName = originalName;
    }
    if (category !== undefined) {
      file.category = category;
    }

    // Update patient metadata
    patient.updatedBy = updatedBy;
    patient.updatedAt = new Date();

    await patient.save();

    console.log(`📝 File metadata updated: ${file.originalName} - Patient: ${patient.firstName} ${patient.lastName} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: 'File updated successfully',
      file: file
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating file'
    });
  }
});

// Preview patient file
router.get('/:id/files/:fileId/preview', verifyToken, async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id, fileId } = req.params;
    const clinicId = req.user.clinicId;

    // Find the patient
    const patient = await Patient.findOne({ _id: id, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find the file in patient's files array
    const file = patient.files.id(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Extract filename from filePath
    const fileName = path.basename(file.filePath);
    const filePath = path.join(__dirname, '../uploads/patient-documents', fileName);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for preview (inline display)
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`👁️ File previewed: ${file.originalName} - Patient: ${patient.firstName} ${patient.lastName} - By: ${req.user.name || req.user.email}`);

  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error previewing file'
    });
  }
});

// Get patient's upcoming appointments
router.get('/:patientId/appointments/upcoming', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { clinicId } = req.user;

    // Get upcoming appointments for this patient
    const { Appointment } = require('../models');
    const appointments = await Appointment.find({
      patientId: patientId,
      clinicId: clinicId,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Checked-In'] }
    })
    .populate('patientId', 'firstName lastName fullName')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      success: true,
      appointments: appointments
    });

  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming appointments',
      error: error.message
    });
  }
});

// Get patient's last visit data for "Same as Last" functionality
router.get('/:patientId/last-visit-data', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { clinicId } = req.user;

    console.log(`🔍 Getting last visit data for patient: ${patientId} in clinic: ${clinicId}`);

    // Only allow doctors to access last visit data
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // Get the most recent completed appointment for this patient
    const { Appointment } = require('../models');
    const lastVisit = await Appointment.findOne({
      patientId: patientId,
      clinicId: clinicId,
      status: 'Completed',
      visitData: { $exists: true }
    })
    .sort({ appointmentDate: -1, appointmentTime: -1 })
    .select('visitData appointmentDate appointmentTime visitType');

    if (!lastVisit || !lastVisit.visitData) {
      return res.json({
        success: true,
        hasLastVisit: false,
        message: 'No previous visit data found'
      });
    }

    console.log(`📊 Found last visit data from ${lastVisit.appointmentDate}`);

    // Extract the relevant data for copying
    const lastVisitData = {
      soapNotes: lastVisit.visitData.soapNotes || {},
      procedureCodes: lastVisit.visitData.procedureCodes || [],
      diagnoses: lastVisit.visitData.diagnoses || [],
      physicalExam: lastVisit.visitData.physicalExam || {},
      visitDate: lastVisit.appointmentDate,
      visitType: lastVisit.visitType
    };

    res.json({
      success: true,
      hasLastVisit: true,
      lastVisitData: lastVisitData
    });

  } catch (error) {
    console.error('Get last visit data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching last visit data'
    });
  }
});

// Get patient's appointment history
router.get('/:patientId/appointments/history', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { clinicId } = req.user;

    console.log(`🔍 Getting appointment history for patient: ${patientId} in clinic: ${clinicId}`);

    // Get all appointments for this patient
    const { Appointment } = require('../models');
    const appointments = await Appointment.find({
      patientId: patientId,
      clinicId: clinicId
    })
    .populate('patientId', 'firstName lastName fullName recordNumber')
    .sort({ appointmentDate: -1, appointmentTime: -1 }); // Most recent first

    console.log(`📊 Found ${appointments.length} appointments in history`);

    // Format appointments with additional data
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      visitType: apt.visitType,
      status: apt.status,
      notes: apt.notes,
      chiefComplaint: apt.chiefComplaint,
      soapNotes: apt.soapNotes,
      procedureCodes: apt.procedureCodes,
      diagnosticCodes: apt.diagnosticCodes,
      physicalExam: apt.physicalExam,
      doctorSignature: apt.doctorSignature,
      patientSignature: apt.patientSignature,
      checkoutData: apt.checkoutData,
      history: apt.history,
      actionTaken: apt.actionTaken,
      rescheduleReason: apt.rescheduleReason,
      cancellationReason: apt.cancellationReason,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt
    }));

    res.json({
      success: true,
      appointments: formattedAppointments
    });

  } catch (error) {
    console.error('Get appointment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appointment history'
    });
  }
});

module.exports = router;
