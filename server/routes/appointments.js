const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Appointment, Patient, Ledger, Checkout } = require('../models');
const { isConnected } = require('../config/db');

// All appointment routes require authentication
router.use(verifyToken);

// Get today's appointments for doctor
router.get('/doctor/today', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { clinicId, userId, role } = req.user;

    // Only allow doctors to access this endpoint
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    console.log(`🔍 Getting today's appointments for doctor: ${userId} in clinic: ${clinicId}`);

    // Get today's date in consistent format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    // Create date range for today
    const startOfDay = new Date(year, today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(year, today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`📅 Doctor view - Today's date: ${todayString}`);
    console.log(`📅 Doctor view - Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Get all clinic appointments for today (same as secretary view)
    // This ensures doctors and secretaries see the same patient list
    console.log(`📋 Fetching all clinic appointments for today (same as secretary view)`);
    let appointments = await Appointment.getTodaysAppointments(clinicId);

    console.log(`📋 DOCTOR VIEW - Found ${appointments.length} total clinic appointments for today`);
    appointments.forEach(apt => {
      console.log(`  - ${apt.patientId?.firstName} ${apt.patientId?.lastName} at ${apt.appointmentTime} (${apt.status}) - Assigned: ${apt.assignedDoctor || 'None'} - ID: ${apt._id}`);
    });

    // Format the response to match secretary API structure exactly
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      appointmentTime: apt.appointmentTime,
      formattedTime: apt.formattedTime,
      visitType: apt.visitType,
      status: apt.status,
      isCheckedOut: apt.isCheckedOut,
      patient: apt.patientId ? {
        _id: apt.patientId._id,
        fullName: `${apt.patientId.firstName} ${apt.patientId.lastName}`,
        recordNumber: apt.patientId.recordNumber,
        phone: apt.patientId.phone,
        email: apt.patientId.email,
        dateOfBirth: apt.patientId.dateOfBirth
      } : null,
      notes: apt.notes,
      chiefComplaint: apt.chiefComplaint
    }));

    console.log(`📊 Found ${formattedAppointments.length} appointments for doctor (formatted with same structure as secretary)`);

    res.json({
      success: true,
      appointments: formattedAppointments
    });

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
});

// Get today's appointments for the authenticated user's clinic (secretary view)
router.get('/today', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const clinicId = req.user.clinicId;

    // Debug: Log current date and clinic info
    const today = new Date();
    console.log(`🔍 Getting today's appointments for clinic: ${clinicId}`);
    console.log(`📅 Today's date: ${today.toISOString()}`);
    console.log(`📅 Today's local date: ${today.toLocaleDateString()}`);

    // Get today's appointments
    const appointments = await Appointment.getTodaysAppointments(clinicId);

    console.log(`📊 SECRETARY VIEW - Found ${appointments.length} appointments for today`);
    appointments.forEach(apt => {
      console.log(`  - ${apt.patientId?.firstName} ${apt.patientId?.lastName} at ${apt.appointmentTime} (${apt.status})`);
      console.log(`    📅 Appointment Date: ${apt.appointmentDate}`);
      console.log(`    📅 Date String: ${apt.appointmentDate.toISOString().split('T')[0]}`);
      console.log(`    📅 Today String: ${today.toISOString().split('T')[0]}`);
      console.log(`    🆔 ID: ${apt._id}`);
      console.log(`    👤 Assigned Doctor: ${apt.assignedDoctor}`);
    });

    // Get KPI data
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Count active patients (patients with appointments today)
    const activePatients = await Patient.countDocuments({
      clinicId,
      _id: { $in: appointments.map(apt => apt.patientId) }
    });

    // Count pending tasks (alerts, expired referrals, incomplete checkouts)
    const pendingCheckouts = appointments.filter(apt =>
      apt.status === 'Completed' && !apt.isCheckedOut
    ).length;

    const patientsWithAlerts = await Patient.countDocuments({
      clinicId,
      'alerts.isVisible': true,
      'alerts.resolvedAt': { $exists: false }
    });

    const pendingTasks = pendingCheckouts + patientsWithAlerts;

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        _id: apt._id,
        appointmentTime: apt.appointmentTime,
        formattedTime: apt.formattedTime,
        visitType: apt.visitType,
        status: apt.status,
        confirmationStatus: apt.confirmationStatus || 'Unconfirmed',
        treatmentStatus: apt.treatmentStatus || 'In Progress',
        isCheckedOut: apt.isCheckedOut,
        patient: {
          _id: apt.patientId._id,
          fullName: `${apt.patientId.firstName} ${apt.patientId.lastName}`,
          recordNumber: apt.patientId.recordNumber,
          phone: apt.patientId.phone,
          email: apt.patientId.email,
          dateOfBirth: apt.patientId.dateOfBirth
        },
        notes: apt.notes,
        chiefComplaint: apt.chiefComplaint
      })),
      kpis: {
        totalAppointments: appointments.length,
        activePatients,
        pendingTasks
      }
    });

  } catch (error) {
    console.error('Get today\'s appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching today\'s appointments'
    });
  }
});

// Get appointments by date
router.get('/date/:date', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const clinicId = req.user.clinicId;
    const { date } = req.params;

    // Parse the date and create date range for the entire day
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const appointments = await Appointment.find({
      clinicId,
      appointmentDate: {
        $gte: targetDate,
        $lt: nextDay
      }
    })
    .populate('patientId', 'firstName lastName recordNumber phone email')
    .sort({ appointmentTime: 1 });

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        _id: apt._id,
        appointmentTime: apt.appointmentTime,
        duration: apt.duration,
        visitType: apt.visitType,
        colorTag: apt.colorTag,
        status: apt.status,
        patient: apt.patientId ? {
          _id: apt.patientId._id,
          fullName: `${apt.patientId.firstName} ${apt.patientId.lastName}`,
          recordNumber: apt.patientId.recordNumber,
          phone: apt.patientId.phone
        } : null,
        notes: apt.notes
      }))
    });

  } catch (error) {
    console.error('Get appointments by date error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching appointments'
    });
  }
});

// Get appointment by ID with patient details
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

    const appointment = await Appointment.findOne({ _id: id, clinicId })
      .populate('patientId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Get patient's insurance and referral info
    const patient = appointment.patientId;
    const activeInsurance = patient.insurances.find(ins => ins.isPrimary) || patient.insurances[0];
    const activeReferrals = patient.referrals.filter(ref => ref.isActive);
    const activeAlerts = patient.alerts.filter(alert => alert.isVisible && !alert.resolvedAt);

    // Get visit history (last 5 appointments)
    const visitHistory = await Appointment.find({
      clinicId,
      patientId: patient._id,
      _id: { $ne: appointment._id },
      status: 'Completed'
    })
    .sort({ appointmentDate: -1 })
    .limit(5)
    .select('appointmentDate visitType status totalAmount');

    res.json({
      success: true,
      appointment: {
        ...appointment.toObject(),
        patient: {
          ...patient.toObject(),
          fullName: `${patient.firstName} ${patient.lastName}`,
          age: patient.age,
          activeInsurance,
          activeReferrals,
          activeAlerts,
          visitHistory
        }
      }
    });

  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching appointment'
    });
  }
});

// Update appointment status (check-in, complete, etc.)
router.patch('/:id/status', async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { status, cancellationReason, rescheduleReason } = req.body;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    const validStatuses = ['Scheduled', 'Checked-In', 'In Progress', 'Completed', 'No-Show', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get current appointment for history tracking
    const currentAppointment = await Appointment.findOne({ _id: id, clinicId });
    if (!currentAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Prepare update data
    const updateData = {
      status,
      updatedBy,
      updatedAt: new Date(),
      ...(status === 'Checked-In' && { checkedInAt: new Date() }),
      ...(status === 'Completed' && { completedAt: new Date() })
    };

    // Set action taken and reasons based on status
    if (status === 'Cancelled') {
      updateData.actionTaken = 'Appointment Cancelled';
      updateData.cancellationReason = cancellationReason;
    } else if (status === 'Checked-In') {
      updateData.actionTaken = 'Patient Checked In';
    } else if (status === 'Checked-Out') {
      updateData.actionTaken = 'Visit Completed';
    } else if (status === 'No-Show') {
      updateData.actionTaken = 'Patient No-Show';
    }

    // Add to history
    const historyEntry = {
      action: status.toLowerCase().replace('-', ''),
      timestamp: new Date(),
      performedBy: updatedBy,
      reason: cancellationReason || rescheduleReason || '',
      previousData: {
        appointmentDate: currentAppointment.appointmentDate,
        appointmentTime: currentAppointment.appointmentTime,
        status: currentAppointment.status
      },
      newData: {
        appointmentDate: currentAppointment.appointmentDate,
        appointmentTime: currentAppointment.appointmentTime,
        status: status
      }
    };

    updateData.$push = { history: historyEntry };

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true }
    ).populate('patientId', 'firstName lastName recordNumber');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Log status change
    console.log(`✅ Appointment status updated: ${appointment.patientId.firstName} ${appointment.patientId.lastName} (${appointment.patientId.recordNumber}) - Status: ${status} - Clinic: ${clinicId} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        actionTaken: appointment.actionTaken,
        patient: {
          fullName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
          recordNumber: appointment.patientId.recordNumber
        }
      }
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating appointment status'
    });
  }
});

// Update appointment confirmation status
router.patch('/:id/confirmation', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { confirmationStatus } = req.body;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    console.log(`🔄 Updating appointment ${id} confirmation status to: ${confirmationStatus}`);

    const appointment = await Appointment.findOne({ _id: id, clinicId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update confirmation status
    const updateData = {
      confirmationStatus,
      updatedBy,
      updatedAt: new Date()
    };

    if (confirmationStatus === 'Confirmed') {
      updateData.confirmedAt = new Date();
      updateData.confirmedBy = updatedBy;
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true }
    ).populate('patientId', 'firstName lastName recordNumber');

    console.log(`✅ Appointment confirmation status updated to: ${confirmationStatus}`);

    res.json({
      success: true,
      message: 'Appointment confirmation status updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment confirmation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating appointment confirmation status'
    });
  }
});

// Update appointment treatment status
router.patch('/:id/treatment-status', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { treatmentStatus } = req.body;
    const clinicId = req.user.clinicId;
    const updatedBy = req.user.name || req.user.email;

    console.log(`🔄 Updating appointment ${id} treatment status to: ${treatmentStatus}`);

    const appointment = await Appointment.findOne({ _id: id, clinicId });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update treatment status
    const updateData = {
      treatmentStatus,
      updatedBy,
      updatedAt: new Date()
    };

    if (treatmentStatus === 'Ready for Checkout') {
      updateData.readyForCheckoutAt = new Date();
      updateData.readyForCheckoutBy = updatedBy;
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true }
    ).populate('patientId', 'firstName lastName recordNumber');

    console.log(`✅ Appointment treatment status updated to: ${treatmentStatus}`);

    res.json({
      success: true,
      message: 'Appointment treatment status updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment treatment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating appointment treatment status'
    });
  }
});

// Create new appointment
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

    // Validate patient exists and belongs to clinic
    const patient = await Patient.findOne({
      _id: req.body.patientId,
      clinicId
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get clinic doctors to assign appointment
    const { User } = require('../models');
    const clinicDoctors = await User.find({
      clinicId,
      role: 'doctor',
      isActive: true
    });

    // Auto-assign to first available doctor if not specified
    let assignedDoctor = req.body.assignedDoctor;
    if (!assignedDoctor && clinicDoctors.length > 0) {
      // If no doctor specified, assign to the first doctor in the clinic
      assignedDoctor = clinicDoctors[0]._id;
      console.log(`🏥 Auto-assigning appointment to doctor: ${clinicDoctors[0].name} (${assignedDoctor})`);
    }

    // Create appointment data with proper date handling
    const appointmentData = {
      ...req.body,
      clinicId,
      createdBy,
      assignedDoctor,
      status: 'Scheduled'
    };

    // Handle date string to ensure it's stored as local date, not UTC
    console.log(`🔍 Original appointment date: ${appointmentData.appointmentDate} (type: ${typeof appointmentData.appointmentDate})`);
    if (appointmentData.appointmentDate && typeof appointmentData.appointmentDate === 'string') {
      // Parse the date string as local date (YYYY-MM-DD)
      const [year, month, day] = appointmentData.appointmentDate.split('-');
      const originalDate = appointmentData.appointmentDate;
      appointmentData.appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      console.log(`🔄 Date parsing: ${originalDate} -> ${appointmentData.appointmentDate} (${appointmentData.appointmentDate.toISOString()})`);
    }

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Log appointment creation
    console.log(`✅ Appointment created: ${patient.firstName} ${patient.lastName} (${patient.recordNumber}) - Date: ${appointment.appointmentDate} Time: ${appointment.appointmentTime} - Clinic: ${clinicId} - By: ${createdBy}`);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment: {
        _id: appointment._id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        visitType: appointment.visitType,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Create appointment error:', error);

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
      message: 'Server error creating appointment'
    });
  }
});

// Update appointment
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

    const updateData = {
      ...req.body,
      updatedBy,
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated
    delete updateData.clinicId;
    delete updateData.createdBy;
    delete updateData.createdAt;

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true, runValidators: true }
    ).populate('patientId', 'firstName lastName recordNumber');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Log appointment update
    console.log(`✅ Appointment updated: ${appointment.patientId.firstName} ${appointment.patientId.lastName} (${appointment.patientId.recordNumber}) - Clinic: ${clinicId} - By: ${updatedBy}`);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: {
        _id: appointment._id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        visitType: appointment.visitType,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Update appointment error:', error);

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
      message: 'Server error updating appointment'
    });
  }
});

// Checkout appointment
router.post('/:id/checkout', async (req, res) => {
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
    const checkedOutBy = req.user.name || req.user.email;

    // Find appointment
    const appointment = await Appointment.findOne({ _id: id, clinicId })
      .populate('patientId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.isCheckedOut) {
      return res.status(400).json({
        success: false,
        message: 'Appointment already checked out'
      });
    }

    const {
      serviceCodes,
      diagnosticCodes,
      paymentMethod,
      amountPaid,
      changeGiven,
      signature,
      packageUsed,
      nextAppointment,
      checkoutNotes
    } = req.body;

    // Calculate totals
    const subtotal = serviceCodes.reduce((sum, service) => sum + (service.unitRate * service.units), 0);
    const totalAmount = subtotal;

    // Update appointment with checkout data
    appointment.treatmentCodes = serviceCodes;
    appointment.diagnosticCodes = diagnosticCodes;
    appointment.totalAmount = totalAmount;
    appointment.isCheckedOut = true;
    appointment.checkedOutBy = checkedOutBy;
    appointment.status = 'Checked-Out';
    appointment.checkoutData = {
      paymentMethod,
      amountPaid,
      changeGiven,
      signature,
      checkoutNotes,
      nextAppointment
    };

    // Handle package usage
    if (packageUsed && packageUsed.packageId) {
      const patient = appointment.patientId;
      const packageIndex = patient.packages.findIndex(pkg =>
        pkg._id.toString() === packageUsed.packageId
      );

      if (packageIndex !== -1) {
        patient.packages[packageIndex].usedVisits += packageUsed.visitsUsed || 1;
        patient.packages[packageIndex].remainingVisits =
          patient.packages[packageIndex].totalVisits - patient.packages[packageIndex].usedVisits;

        appointment.packageUsed = {
          packageId: packageUsed.packageId,
          packageName: patient.packages[packageIndex].packageName,
          visitsUsed: packageUsed.visitsUsed || 1
        };

        await patient.save();
      }
    }

    await appointment.save();

    // Create ledger entry
    const ledgerEntry = new Ledger({
      clinicId,
      patientId: appointment.patientId._id,
      appointmentId: appointment._id,
      transactionType: 'Payment',
      serviceCodes: serviceCodes.map(service => ({
        code: service.code,
        description: service.description,
        units: service.units,
        unitRate: service.unitRate,
        totalAmount: service.unitRate * service.units
      })),
      diagnosticCodes,
      subtotal,
      totalAmount,
      paymentDetails: {
        paymentMethod,
        amountPaid,
        changeGiven,
        signature
      },
      packageUsed: packageUsed ? {
        packageId: packageUsed.packageId,
        packageName: packageUsed.packageName,
        visitsUsedThisTransaction: packageUsed.visitsUsed || 1
      } : undefined,
      nextAppointment: nextAppointment ? {
        scheduledDate: nextAppointment.date,
        scheduledTime: nextAppointment.time,
        visitType: nextAppointment.visitType,
        notes: nextAppointment.notes
      } : undefined,
      notes: checkoutNotes,
      createdBy: checkedOutBy,
      processedBy: checkedOutBy,
      status: 'Completed'
    });

    await ledgerEntry.save();

    // Create checkout record for audit trail
    const checkoutRecord = new Checkout({
      clinicId,
      patientId: appointment.patientId._id,
      appointmentId: appointment._id,
      serviceCodes: serviceCodes.map(service => ({
        code: service.code,
        description: service.description,
        units: service.units,
        unitRate: service.unitRate,
        totalAmount: service.unitRate * service.units
      })),
      diagnosticCodes,
      subtotal,
      totalAmount,
      paymentDetails: {
        paymentMethod,
        amountPaid,
        changeGiven,
        signature
      },
      packageUsed: packageUsed ? {
        packageId: packageUsed.packageId,
        packageName: packageUsed.packageName,
        visitsUsedThisTransaction: packageUsed.visitsUsed || 1,
        remainingVisitsAfter: packageUsed.packageId ?
          (patient.packages.find(pkg => pkg._id.toString() === packageUsed.packageId)?.remainingVisits || 0) : 0,
        packageValue: packageUsed.packageValue || 0
      } : undefined,
      nextAppointment: nextAppointment ? {
        scheduledDate: nextAppointment.date,
        scheduledTime: nextAppointment.time,
        visitType: nextAppointment.visitType,
        notes: nextAppointment.notes
      } : undefined,
      checkoutNotes,
      checkedOutBy,
      checkedOutAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      status: 'Completed'
    });

    await checkoutRecord.save();

    // Schedule next appointment if provided
    if (nextAppointment && nextAppointment.date && nextAppointment.time) {
      const newAppointment = new Appointment({
        patientId: appointment.patientId._id,
        clinicId,
        appointmentDate: nextAppointment.date,
        appointmentTime: nextAppointment.time,
        visitType: nextAppointment.visitType || 'Follow-Up',
        notes: nextAppointment.notes,
        createdBy: checkedOutBy,
        status: 'Scheduled'
      });

      await newAppointment.save();
    }

    // Check for alerts to trigger
    const patient = appointment.patientId;
    const alertsToAdd = [];

    // Check insurance expiration
    if (patient.insurances && patient.insurances.length > 0) {
      const primaryInsurance = patient.insurances.find(ins => ins.isPrimary);
      if (primaryInsurance && primaryInsurance.expirationDate) {
        const daysUntilExpiry = Math.ceil((new Date(primaryInsurance.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          alertsToAdd.push({
            type: 'Insurance Expiring',
            message: `Primary insurance expires in ${daysUntilExpiry} days`,
            priority: daysUntilExpiry <= 7 ? 'High' : 'Medium',
            isVisible: true,
            createdBy: checkedOutBy,
            createdAt: new Date()
          });
        }
      }
    }

    // Check referral expiration
    if (patient.referrals && patient.referrals.length > 0) {
      patient.referrals.forEach(referral => {
        if (referral.isActive && referral.remainingDays <= 7 && referral.remainingDays > 0) {
          alertsToAdd.push({
            type: 'Referral Expiring',
            message: `Referral from ${referral.source} expires in ${referral.remainingDays} days`,
            priority: referral.remainingDays <= 3 ? 'High' : 'Medium',
            isVisible: true,
            createdBy: checkedOutBy,
            createdAt: new Date()
          });
        }
      });
    }

    // Check package visits
    if (patient.packages && patient.packages.length > 0) {
      patient.packages.forEach(pkg => {
        if (pkg.isActive && pkg.remainingVisits === 0) {
          alertsToAdd.push({
            type: 'Package Expiring',
            message: `Package "${pkg.packageName}" has no remaining visits`,
            priority: 'Medium',
            isVisible: true,
            createdBy: checkedOutBy,
            createdAt: new Date()
          });
        }
      });
    }

    // Add alerts to patient and checkout record
    if (alertsToAdd.length > 0) {
      patient.alerts.push(...alertsToAdd);
      await patient.save();

      // Add alerts to checkout record
      checkoutRecord.alertsTriggered = alertsToAdd.map(alert => ({
        type: alert.type,
        message: alert.message,
        priority: alert.priority,
        triggeredAt: alert.createdAt || new Date()
      }));
      await checkoutRecord.save();
    }

    // Log checkout
    console.log(`✅ Appointment checked out: ${patient.firstName} ${patient.lastName} (${patient.recordNumber}) - Amount: $${amountPaid} - Method: ${paymentMethod} - Clinic: ${clinicId} - By: ${checkedOutBy}`);

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      checkout: {
        appointmentId: appointment._id,
        checkoutNumber: checkoutRecord.checkoutNumber,
        receiptNumber: ledgerEntry.receiptNumber,
        totalAmount,
        amountPaid,
        changeGiven,
        nextAppointment: nextAppointment ? {
          date: nextAppointment.date,
          time: nextAppointment.time,
          visitType: nextAppointment.visitType
        } : null,
        alertsTriggered: alertsToAdd.length,
        checkoutRecordId: checkoutRecord._id
      }
    });

  } catch (error) {
    console.error('Checkout appointment error:', error);

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
      message: 'Checkout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Save SOAP notes for appointment (doctor only)
router.patch('/:id/soap-notes', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { clinicId, userId, role } = req.user;

    // Only allow doctors to save SOAP notes
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const appointment = await Appointment.findOne({ _id: id, clinicId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor is assigned to this appointment (allow if no doctor assigned yet)
    if (appointment.assignedDoctor && appointment.assignedDoctor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this appointment.'
      });
    }

    // If no doctor assigned yet, assign current doctor
    if (!appointment.assignedDoctor) {
      appointment.assignedDoctor = userId;
      console.log(`✅ Doctor ${userId} auto-assigned to appointment ${id}`);
    }

    const { soapNotes } = req.body;

    // Update appointment with SOAP notes
    if (!appointment.visitData) {
      appointment.visitData = {};
    }

    appointment.visitData.soapNotes = {
      ...soapNotes,
      updatedAt: new Date(),
      updatedBy: req.user.name || req.user.email
    };

    await appointment.save();

    console.log(`✅ SOAP notes saved for appointment: ${id} by doctor: ${req.user.name}`);

    res.json({
      success: true,
      message: 'SOAP notes saved successfully'
    });

  } catch (error) {
    console.error('Error saving SOAP notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save SOAP notes',
      error: error.message
    });
  }
});

// Save procedure codes for appointment (doctor only)
router.patch('/:id/procedure-codes', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { clinicId, userId, role } = req.user;

    // Only allow doctors to save procedure codes
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const appointment = await Appointment.findOne({ _id: id, clinicId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor is assigned to this appointment (allow if no doctor assigned yet)
    if (appointment.assignedDoctor && appointment.assignedDoctor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this appointment.'
      });
    }

    // If no doctor assigned yet, assign current doctor
    if (!appointment.assignedDoctor) {
      appointment.assignedDoctor = userId;
      console.log(`✅ Doctor ${userId} auto-assigned to appointment ${id}`);
    }

    const { procedureCodes } = req.body;

    // Update appointment with procedure codes
    if (!appointment.visitData) {
      appointment.visitData = {};
    }

    appointment.visitData.procedureCodes = procedureCodes.map(code => ({
      code: code.code,
      description: code.description,
      units: code.units || 1,
      notes: code.notes || '',
      rate: code.rate || 0,
      isPackage: code.isPackage || false,
      category: code.category || 'General',
      updatedAt: new Date(),
      updatedBy: req.user.name || req.user.email
    }));

    await appointment.save();

    console.log(`✅ Procedure codes saved for appointment: ${id} by doctor: ${req.user.name} - ${procedureCodes.length} codes`);

    res.json({
      success: true,
      message: 'Procedure codes saved successfully'
    });

  } catch (error) {
    console.error('Error saving procedure codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save procedure codes',
      error: error.message
    });
  }
});

// Save physical exam for appointment (doctor only)
router.patch('/:id/physical-exam', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { clinicId, userId, role } = req.user;

    // Only allow doctors to save physical exam
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const appointment = await Appointment.findOne({ _id: id, clinicId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor is assigned to this appointment (allow if no doctor assigned yet)
    if (appointment.assignedDoctor && appointment.assignedDoctor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this appointment.'
      });
    }

    // If no doctor assigned yet, assign current doctor
    if (!appointment.assignedDoctor) {
      appointment.assignedDoctor = userId;
      console.log(`✅ Doctor ${userId} auto-assigned to appointment ${id}`);
    }

    const { physicalExam } = req.body;

    // Update appointment with physical exam data
    if (!appointment.visitData) {
      appointment.visitData = {};
    }

    appointment.visitData.physicalExam = {
      ...physicalExam,
      updatedAt: new Date(),
      updatedBy: req.user.name || req.user.email
    };

    await appointment.save();

    console.log(`✅ Physical exam saved for appointment: ${id} by doctor: ${req.user.name}`);

    res.json({
      success: true,
      message: 'Physical exam saved successfully'
    });

  } catch (error) {
    console.error('Error saving physical exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save physical exam',
      error: error.message
    });
  }
});

// Save diagnostic codes for appointment (doctor only)
router.patch('/:id/diagnostic-codes', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { clinicId, userId, role } = req.user;

    // Only allow doctors to save diagnostic codes
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const appointment = await Appointment.findOne({ _id: id, clinicId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor is assigned to this appointment (allow if no doctor assigned yet)
    if (appointment.assignedDoctor && appointment.assignedDoctor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this appointment.'
      });
    }

    // If no doctor assigned yet, assign current doctor
    if (!appointment.assignedDoctor) {
      appointment.assignedDoctor = userId;
      console.log(`✅ Doctor ${userId} auto-assigned to appointment ${id}`);
    }

    const { diagnosticCodes } = req.body;

    // Update appointment with diagnostic codes
    if (!appointment.visitData) {
      appointment.visitData = {};
    }

    appointment.visitData.diagnosticCodes = diagnosticCodes.map(code => ({
      ...code,
      updatedAt: new Date(),
      updatedBy: req.user.name || req.user.email
    }));

    await appointment.save();

    console.log(`✅ Diagnostic codes saved for appointment: ${id} by doctor: ${req.user.name}`);

    res.json({
      success: true,
      message: 'Diagnostic codes saved successfully'
    });

  } catch (error) {
    console.error('Error saving diagnostic codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save diagnostic codes',
      error: error.message
    });
  }
});

// Save visit data for appointment (doctor only)
router.post('/:id/visit-data', async (req, res) => {
  try {
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { id } = req.params;
    const { clinicId, userId, role } = req.user;

    // Only allow doctors to save visit data
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const appointment = await Appointment.findOne({ _id: id, clinicId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor is assigned to this appointment (allow if no doctor assigned yet)
    if (appointment.assignedDoctor && appointment.assignedDoctor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this appointment.'
      });
    }

    // If no doctor assigned yet, assign current doctor
    if (!appointment.assignedDoctor) {
      appointment.assignedDoctor = userId;
      console.log(`✅ Doctor ${userId} auto-assigned to appointment ${id}`);
    }

    const {
      diagnoses,
      procedureCodes,
      notes,
      physicalExam,
      doctorSignature,
      soapNotes,
      providerId,
      providerSignature,
      completedAt,
      completedBy,
      signatureConfirmed
    } = req.body;

    // Update appointment with visit data
    appointment.visitData = {
      diagnoses: diagnoses || [],
      procedureCodes: procedureCodes || [],
      notes: notes || '',
      physicalExam: physicalExam || {},
      doctorSignature: doctorSignature || providerSignature || null,
      soapNotes: soapNotes || {},
      providerId: providerId || userId,
      providerSignature: providerSignature || doctorSignature || null,
      signatureConfirmed: signatureConfirmed || false,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      completedBy: completedBy || req.user.name || req.user.email
    };

    // If doctor signature is provided, mark as ready for checkout
    if (doctorSignature || providerSignature) {
      appointment.treatmentStatus = 'Ready for Checkout';
      appointment.readyForCheckoutAt = new Date();
      appointment.readyForCheckoutBy = req.user.name || req.user.email;
      console.log(`✅ Appointment marked as Ready for Checkout due to doctor signature`);
    }

    // Save the appointment with validation error handling
    try {
      await appointment.save();
      console.log(`✅ Visit data saved for appointment: ${id} by doctor: ${req.user.name}`);
    } catch (validationError) {
      // If there's a validation error, try to fix the history entries and save again
      if (validationError.name === 'ValidationError' && validationError.errors) {
        console.log('🔧 Fixing appointment history validation errors...');

        // Fix invalid history action values
        if (appointment.history && appointment.history.length > 0) {
          appointment.history.forEach(entry => {
            if (entry.action === 'checkedin') {
              entry.action = 'checked-in';
            } else if (entry.action === 'in progress') {
              // Remove invalid 'in progress' entries or convert to valid action
              entry.action = 'checked-in';
            }
          });
        }

        // Try to save again after fixing
        await appointment.save();
        console.log(`✅ Visit data saved after fixing history for appointment: ${id} by doctor: ${req.user.name}`);
      } else {
        throw validationError; // Re-throw if it's not a history validation error
      }
    }

    res.json({
      success: true,
      message: 'Visit data saved successfully'
    });

  } catch (error) {
    console.error('Error saving visit data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save visit data',
      error: error.message
    });
  }
});

// Get appointment history with filters
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { startDate, endDate, patientName, status, provider } = req.query;

    // Build filter query
    let filter = { clinicId };

    // Date range filter
    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Provider filter
    if (provider) {
      filter.assignedDoctor = provider;
    }

    // Get appointments with patient data
    let appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName fullName recordNumber')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(1000); // Limit to prevent performance issues

    // Filter by patient name if provided
    if (patientName) {
      appointments = appointments.filter(apt =>
        apt.patientId?.fullName?.toLowerCase().includes(patientName.toLowerCase()) ||
        apt.patientId?.firstName?.toLowerCase().includes(patientName.toLowerCase()) ||
        apt.patientId?.lastName?.toLowerCase().includes(patientName.toLowerCase())
      );
    }

    // Format appointments for display
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      patient: apt.patientId,
      visitType: apt.visitType,
      status: apt.status,
      assignedDoctor: apt.assignedDoctor,
      actionTaken: apt.actionTaken || getActionFromStatus(apt.status),
      notes: apt.notes,
      cancellationReason: apt.cancellationReason,
      rescheduleReason: apt.rescheduleReason,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt
    }));

    res.json({
      success: true,
      appointments: formattedAppointments,
      total: formattedAppointments.length
    });

  } catch (error) {
    console.error('Error fetching appointment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment history',
      error: error.message
    });
  }
});

// Update appointment (for rescheduling)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicId } = req.user;
    const updatedBy = req.user.name || req.user.email;

    const {
      appointmentDate,
      appointmentTime,
      duration,
      visitType,
      colorTag,
      notes,
      rescheduleReason,
      actionTaken
    } = req.body;

    // Get current appointment for history tracking
    const currentAppointment = await Appointment.findOne({ _id: id, clinicId });
    if (!currentAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Handle date parsing consistently (same as appointment creation)
    let parsedAppointmentDate;
    if (appointmentDate && typeof appointmentDate === 'string') {
      // Parse the date string as local date (YYYY-MM-DD)
      const [year, month, day] = appointmentDate.split('-');
      parsedAppointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      console.log(`🔄 Reschedule date parsing: ${appointmentDate} -> ${parsedAppointmentDate} (${parsedAppointmentDate.toISOString()})`);
    } else {
      parsedAppointmentDate = new Date(appointmentDate);
    }

    // Prepare update data
    const updateData = {
      appointmentDate: parsedAppointmentDate,
      appointmentTime,
      duration,
      visitType,
      colorTag,
      notes,
      rescheduleReason,
      actionTaken: actionTaken || 'Appointment Rescheduled',
      status: 'Scheduled', // Reset status to Scheduled when rescheduling
      updatedBy,
      updatedAt: new Date()
    };

    // Add to history
    const historyEntry = {
      action: 'rescheduled',
      timestamp: new Date(),
      performedBy: updatedBy,
      reason: rescheduleReason || '',
      previousData: {
        appointmentDate: currentAppointment.appointmentDate,
        appointmentTime: currentAppointment.appointmentTime,
        status: currentAppointment.status
      },
      newData: {
        appointmentDate: parsedAppointmentDate,
        appointmentTime: appointmentTime,
        status: 'Scheduled'
      }
    };

    updateData.$push = { history: historyEntry };

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: id, clinicId },
      updateData,
      { new: true }
    ).populate('patientId', 'firstName lastName fullName recordNumber');

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log(`✅ Appointment rescheduled: ${updatedAppointment.patientId.fullName}`);
    console.log(`   📅 Old date: ${currentAppointment.appointmentDate} at ${currentAppointment.appointmentTime}`);
    console.log(`   📅 New date: ${parsedAppointmentDate} (${parsedAppointmentDate.toISOString()}) at ${appointmentTime}`);
    console.log(`   👤 Updated by: ${updatedBy}`);
    console.log(`   🆔 Appointment ID: ${id}`);

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
});

// Helper function to determine action from status
function getActionFromStatus(status) {
  switch (status) {
    case 'Cancelled': return 'Appointment Cancelled';
    case 'Rescheduled': return 'Appointment Rescheduled';
    case 'Checked-Out': return 'Visit Completed';
    case 'Completed': return 'Visit Completed';
    case 'No-Show': return 'Patient No-Show';
    default: return 'Scheduled';
  }
}

// Get doctor's patient visits
router.get('/doctor/visits', verifyToken, async (req, res) => {
  try {
    const { userId, clinicId } = req.user;

    console.log(`🔍 Getting doctor visits for doctor: ${userId} in clinic: ${clinicId}`);

    // Get all appointments for this doctor
    const appointments = await Appointment.find({
      clinicId: clinicId,
      assignedDoctor: userId
    })
    .populate('patientId', 'firstName lastName fullName recordNumber')
    .sort({ appointmentDate: -1, appointmentTime: -1 }); // Most recent first

    console.log(`📊 Found ${appointments.length} visits for doctor`);

    // Format appointments with patient data
    const formattedVisits = appointments.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      visitType: apt.visitType,
      status: apt.status,
      duration: apt.duration,
      notes: apt.notes,
      chiefComplaint: apt.chiefComplaint,
      soapNotes: apt.soapNotes,
      procedureCodes: apt.procedureCodes,
      diagnosticCodes: apt.diagnosticCodes,
      physicalExam: apt.physicalExam,
      doctorSignature: apt.doctorSignature,
      patientSignature: apt.patientSignature,
      checkoutData: apt.checkoutData,
      patient: apt.patientId,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt
    }));

    res.json({
      success: true,
      visits: formattedVisits
    });

  } catch (error) {
    console.error('Get doctor visits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get doctor visits'
    });
  }
});

module.exports = router;
