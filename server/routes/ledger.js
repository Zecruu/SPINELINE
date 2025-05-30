const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Patient, Appointment, Ledger } = require('../models');
const { isConnected } = require('../config/db');

// Test endpoint
router.get('/test', verifyToken, (req, res) => {
  console.log('🧪 Ledger test endpoint called');
  res.json({
    success: true,
    message: 'Ledger API is working',
    user: {
      clinicId: req.user.clinicId,
      role: req.user.role,
      email: req.user.email
    }
  });
});

// Log appointment actions (cancel, reschedule) for audit trail
router.post('/appointment-action', verifyToken, async (req, res) => {
  try {
    console.log('📝 Ledger appointment-action request received');
    console.log('📋 Request body:', req.body);
    console.log('👤 User:', req.user);

    const { appointmentId, action, reason, originalDate, originalTime, newDate, newTime } = req.body;
    const { clinicId, userId, name, email } = req.user;

    // Get appointment and patient details
    console.log('🔍 Looking for appointment:', appointmentId);
    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) {
      console.log('❌ Appointment not found:', appointmentId);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment found:', appointment._id);
    console.log('👤 Patient:', appointment.patientId);

    // Create ledger entry for appointment action
    const ledgerEntry = new Ledger({
      clinicId,
      patientId: appointment.patientId._id,
      appointmentId,
      transactionType: 'Adjustment',
      transactionDate: new Date(),
      description: `Appointment ${action}: ${reason}`,
      notes: action === 'rescheduled'
        ? `Original: ${originalDate} at ${originalTime}, New: ${newDate} at ${newTime}`
        : `Cancelled appointment on ${originalDate} at ${originalTime}`,
      internalNotes: `Action performed by: ${name || email}`,
      status: 'Completed',
      createdBy: name || email,
      processedBy: name || email,
      // Add required payment details for adjustment type
      paymentDetails: {
        paymentMethod: 'Other',
        amountPaid: 0
      },
      totalAmount: 0,
      appointmentAction: {
        action,
        reason,
        originalDate,
        originalTime,
        newDate: newDate || null,
        newTime: newTime || null,
        actionDate: new Date()
      }
    });

    console.log('💾 Saving ledger entry...');
    await ledgerEntry.save();
    console.log('✅ Ledger entry saved successfully:', ledgerEntry._id);

    res.json({
      success: true,
      message: `Appointment ${action} logged successfully`,
      ledgerEntryId: ledgerEntry._id
    });

  } catch (error) {
    console.error('❌ Error logging appointment action:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to log appointment action',
      error: error.message
    });
  }
});

// Mock transaction data
let mockTransactions = {
  '1': [ // John Smith
    {
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 85.00,
      paymentMethod: 'Cash',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      serviceCode: '97110',
      description: 'Therapeutic Exercise',
      charge: 75.00,
      paid: 75.00,
      paymentMethod: 'Card',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 85.00,
      paymentMethod: 'Insurance',
      balance: 0.00
    }
  ],
  '2': [ // Sarah Johnson
    {
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 85.00,
      paymentMethod: 'Cash',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      serviceCode: '97112',
      description: 'Neuromuscular Re-education',
      charge: 95.00,
      paid: 95.00,
      paymentMethod: 'Card',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 0.00,
      paymentMethod: null,
      balance: 85.00
    }
  ],
  '3': [ // Mike Wilson
    {
      date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      serviceCode: '99203',
      description: 'New Patient Evaluation',
      charge: 150.00,
      paid: 150.00,
      paymentMethod: 'Insurance',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 10.00,
      paymentMethod: 'Cash',
      balance: 75.00
    },
    {
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      serviceCode: '97110',
      description: 'Therapeutic Exercise',
      charge: 75.00,
      paid: 0.00,
      paymentMethod: null,
      balance: 50.50
    }
  ],
  '4': [ // Emily Chen
    {
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      serviceCode: '99203',
      description: 'New Patient Evaluation',
      charge: 150.00,
      paid: 150.00,
      paymentMethod: 'Insurance',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 85.00,
      paymentMethod: 'Card',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      serviceCode: '97112',
      description: 'Neuromuscular Re-education',
      charge: 95.00,
      paid: 95.00,
      paymentMethod: 'Cash',
      balance: 0.00
    },
    {
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      serviceCode: '98941',
      description: 'Chiropractic Adjustment',
      charge: 85.00,
      paid: 85.00,
      paymentMethod: 'Insurance',
      balance: 0.00
    }
  ]
};

// Get all patients with financial overview
router.get('/patients', verifyToken, async (req, res) => {
  try {
    console.log('📊 Ledger patients request received');
    console.log('👤 User:', req.user);

    // Check database connection
    if (!isConnected()) {
      console.log('❌ Database connection unavailable');
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { clinicId } = req.user;
    const { search } = req.query;

    console.log('🏥 Clinic ID:', clinicId);
    console.log('🔍 Search term:', search);

    // Build query for patients
    let query = { clinicId, status: 'Active' };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { recordNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔍 Query:', JSON.stringify(query));

    // Get patients from database
    const patients = await Patient.find(query)
      .select('firstName lastName recordNumber phone email lastVisit')
      .sort({ lastName: 1, firstName: 1 });

    console.log(`👥 Found ${patients.length} patients`);

    // For now, return simplified data without financial calculations to test
    const simplifiedPatients = patients.map(patient => ({
      _id: patient._id,
      fullName: `${patient.firstName} ${patient.lastName}`,
      recordNumber: patient.recordNumber,
      phone: patient.phone,
      email: patient.email,
      lastVisitDate: patient.lastVisit,
      outstandingBalance: 0, // Placeholder
      totalPaid: 0 // Placeholder
    }));

    console.log('✅ Returning simplified patient data');

    res.json({
      success: true,
      data: simplifiedPatients
    });

  } catch (error) {
    console.error('❌ Error fetching patients for ledger:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error fetching patients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get individual patient ledger
router.get('/patient/:patientId', verifyToken, async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { clinicId } = req.user;
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify patient belongs to clinic
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build date filter for appointments
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // Get appointments for this patient with financial data
    const appointments = await Appointment.find({
      patientId,
      clinicId,
      status: { $in: ['Completed', 'Checked-Out'] },
      ...dateFilter
    })
    .select('appointmentDate treatmentCodes checkoutData totalAmount patientResponsibility')
    .sort({ appointmentDate: -1 });

    // Transform appointments into ledger transactions
    const transactions = [];

    appointments.forEach(appointment => {
      if (appointment.treatmentCodes && appointment.treatmentCodes.length > 0) {
        appointment.treatmentCodes.forEach(treatmentCode => {
          const charge = treatmentCode.rate || 0;
          const paid = appointment.checkoutData?.amountPaid || 0;
          const balance = (appointment.patientResponsibility || 0) - paid;

          transactions.push({
            date: appointment.appointmentDate,
            serviceCode: treatmentCode.code,
            description: treatmentCode.description || 'Treatment',
            charge: charge,
            paid: paid / appointment.treatmentCodes.length, // Distribute payment across treatment codes
            paymentMethod: appointment.checkoutData?.paymentMethod,
            balance: Math.max(0, balance)
          });
        });
      } else {
        // If no treatment codes, create a general entry
        const charge = appointment.totalAmount || 0;
        const paid = appointment.checkoutData?.amountPaid || 0;
        const balance = charge - paid;

        transactions.push({
          date: appointment.appointmentDate,
          serviceCode: 'VISIT',
          description: 'General Visit',
          charge: charge,
          paid: paid,
          paymentMethod: appointment.checkoutData?.paymentMethod,
          balance: Math.max(0, balance)
        });
      }
    });

    res.json({
      success: true,
      data: transactions
    });

  } catch (error) {
    console.error('Error fetching patient ledger:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching patient ledger',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Export ledger as CSV
router.get('/export/csv/:patientId?', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    let csvContent = 'Patient,Date,Service Code,Description,Charge,Paid,Payment Method,Balance\n';

    if (patientId) {
      // Export single patient ledger
      const patient = mockPatients.find(p => p._id === patientId && p.clinicId === clinicId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      let transactions = mockTransactions[patientId] || [];

      // Filter by date range if provided
      if (startDate && endDate) {
        transactions = transactions.filter(transaction => {
          const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
          return transactionDate >= startDate && transactionDate <= endDate;
        });
      }

      transactions.forEach(transaction => {
        csvContent += [
          patient.fullName,
          new Date(transaction.date).toLocaleDateString(),
          transaction.serviceCode,
          transaction.description,
          transaction.charge.toFixed(2),
          transaction.paid.toFixed(2),
          transaction.paymentMethod || '',
          transaction.balance.toFixed(2)
        ].join(',') + '\n';
      });

    } else {
      // Export all patients' ledgers
      const clinicPatients = mockPatients.filter(patient => patient.clinicId === clinicId);

      clinicPatients.forEach(patient => {
        let transactions = mockTransactions[patient._id] || [];

        // Filter by date range if provided
        if (startDate && endDate) {
          transactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
            return transactionDate >= startDate && transactionDate <= endDate;
          });
        }

        transactions.forEach(transaction => {
          csvContent += [
            patient.fullName,
            new Date(transaction.date).toLocaleDateString(),
            transaction.serviceCode,
            transaction.description,
            transaction.charge.toFixed(2),
            transaction.paid.toFixed(2),
            transaction.paymentMethod || '',
            transaction.balance.toFixed(2)
          ].join(',') + '\n';
        });
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting ledger CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting ledger'
    });
  }
});

// Export ledger as PDF
router.get('/export/pdf/:patientId?', verifyToken, async (req, res) => {
  try {
    // For now, return a simple response
    // In production, you would use a PDF library like puppeteer or jsPDF
    res.json({
      success: true,
      message: 'PDF export functionality would be implemented here'
    });

  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting PDF'
    });
  }
});

module.exports = router;
