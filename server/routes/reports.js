const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { Patient, Appointment } = require('../models');
const { isConnected } = require('../config/db');

// Get reports summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    // Check database connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const { clinicId } = req.user;
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // Get appointments from database
    const appointments = await Appointment.find({
      clinicId,
      ...dateFilter
    })
    .populate('patientId', 'firstName lastName')
    .select('appointmentDate appointmentTime status visitType treatmentCodes checkoutData totalAmount patientResponsibility');

    // Calculate appointment statistics
    const appointmentStats = {
      total: appointments.length,
      scheduled: appointments.filter(apt => apt.status === 'Scheduled').length,
      checkedIn: appointments.filter(apt => apt.status === 'Checked-In').length,
      completed: appointments.filter(apt => apt.status === 'Completed' || apt.status === 'Checked-Out').length,
      noShows: appointments.filter(apt => apt.status === 'No-Show').length,
      visitTypes: [
        { name: 'Regular', count: appointments.filter(apt => apt.visitType === 'Regular').length },
        { name: 'Re-evaluation', count: appointments.filter(apt => apt.visitType === 'Re-evaluation').length },
        { name: 'New Patient', count: appointments.filter(apt => apt.visitType === 'New Patient').length }
      ]
    };

    // Calculate billing statistics
    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.checkoutData?.amountPaid || 0), 0);

    // Get top treatment codes
    const serviceCodeCounts = {};
    appointments.forEach(apt => {
      apt.treatmentCodes?.forEach(code => {
        if (serviceCodeCounts[code.code]) {
          serviceCodeCounts[code.code].count++;
        } else {
          serviceCodeCounts[code.code] = {
            code: code.code,
            description: code.description || 'Treatment',
            count: 1
          };
        }
      });
    });

    const topServiceCodes = Object.values(serviceCodeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get payment method breakdown
    const paymentMethods = [
      {
        method: 'Cash',
        amount: appointments
          .filter(apt => apt.checkoutData?.paymentMethod === 'Cash')
          .reduce((sum, apt) => sum + (apt.checkoutData?.amountPaid || 0), 0)
          .toFixed(2)
      },
      {
        method: 'Credit Card',
        amount: appointments
          .filter(apt => apt.checkoutData?.paymentMethod === 'Credit Card')
          .reduce((sum, apt) => sum + (apt.checkoutData?.amountPaid || 0), 0)
          .toFixed(2)
      },
      {
        method: 'Insurance',
        amount: appointments
          .filter(apt => apt.checkoutData?.paymentMethod === 'Insurance')
          .reduce((sum, apt) => sum + (apt.checkoutData?.amountPaid || 0), 0)
          .toFixed(2)
      }
    ];

    // Get outstanding balances from appointments
    const outstandingAppointments = await Appointment.find({
      clinicId,
      $expr: {
        $gt: [
          { $subtract: ['$patientResponsibility', { $ifNull: ['$checkoutData.amountPaid', 0] }] },
          0
        ]
      }
    })
    .populate('patientId', 'firstName lastName')
    .select('patientId appointmentDate patientResponsibility checkoutData')
    .sort({ appointmentDate: -1 });

    // Group by patient and get latest visit
    const outstandingBalanceMap = {};
    outstandingAppointments.forEach(apt => {
      if (apt.patientId) {
        const patientId = apt.patientId._id.toString();
        const balance = (apt.patientResponsibility || 0) - (apt.checkoutData?.amountPaid || 0);

        if (balance > 0 && (!outstandingBalanceMap[patientId] ||
            new Date(apt.appointmentDate) > new Date(outstandingBalanceMap[patientId].lastVisit))) {
          outstandingBalanceMap[patientId] = {
            name: apt.patientId.fullName,
            lastVisit: apt.appointmentDate,
            balance: balance.toFixed(2)
          };
        }
      }
    });

    const outstandingBalances = Object.values(outstandingBalanceMap);

    const reportData = {
      appointments: appointmentStats,
      billing: {
        totalRevenue: totalRevenue.toFixed(2),
        topServiceCodes,
        paymentMethods
      },
      outstandingBalances
    };

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error generating report summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating report summary'
    });
  }
});

// Export report as CSV
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { startDate, endDate } = req.query;

    // Filter appointments by clinic and date range
    const filteredAppointments = mockAppointments.filter(apt => {
      if (apt.clinicId !== clinicId) return false;

      if (startDate && endDate) {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDate >= startDate && aptDate <= endDate;
      }

      return true;
    });

    // Generate CSV content
    const csvHeader = 'Date,Time,Patient,Visit Type,Status,Service Codes,Payment Method,Amount Paid,Signature\n';
    const csvRows = filteredAppointments.map(apt => {
      const serviceCodes = apt.serviceCodes?.map(code => code.code).join(';') || '';
      return [
        new Date(apt.appointmentDate).toLocaleDateString(),
        apt.appointmentTime,
        apt.patientId.fullName,
        apt.visitType,
        apt.status,
        serviceCodes,
        apt.paymentMethod || '',
        apt.totalPaid || 0,
        apt.signature ? 'Yes' : 'No'
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting CSV'
    });
  }
});

// Export report as PDF
router.get('/export/pdf', verifyToken, async (req, res) => {
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

// Email report
router.post('/email', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // In production, you would implement email functionality here
    console.log(`Email report requested for ${startDate} to ${endDate}`);

    res.json({
      success: true,
      message: 'Report emailed successfully'
    });

  } catch (error) {
    console.error('Error emailing report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error emailing report'
    });
  }
});

// Get doctor dashboard report data
router.get('/doctor/dashboard', verifyToken, async (req, res) => {
  try {
    const { userId, clinicId, role } = req.user;

    // Only allow doctors to access this endpoint
    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    const { startDate, endDate, visitType } = req.query;

    console.log(`🔍 Getting doctor dashboard data for doctor: ${userId} in clinic: ${clinicId}`);

    // Set default date range if not provided
    const defaultStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = endDate || new Date().toISOString().split('T')[0];

    // Build filter for appointments
    let appointmentFilter = {
      clinicId: clinicId,
      assignedDoctor: userId,
      appointmentDate: {
        $gte: new Date(defaultStartDate),
        $lte: new Date(defaultEndDate + 'T23:59:59.999Z')
      }
    };

    if (visitType && visitType !== 'all') {
      appointmentFilter.visitType = visitType;
    }

    // Get appointments for the date range
    const appointments = await Appointment.find(appointmentFilter)
      .populate('patientId', 'firstName lastName fullName recordNumber insurances')
      .sort({ appointmentDate: -1 });

    // Calculate metrics
    const totalPatients = new Set(appointments.map(apt => apt.patientId?._id?.toString())).size;

    // Weekly patients (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyAppointments = appointments.filter(apt =>
      new Date(apt.appointmentDate) >= weekAgo
    );
    const weeklyPatients = new Set(weeklyAppointments.map(apt => apt.patientId?._id?.toString())).size;

    // Monthly patients (current month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyAppointments = appointments.filter(apt =>
      new Date(apt.appointmentDate) >= monthStart
    );
    const monthlyPatients = new Set(monthlyAppointments.map(apt => apt.patientId?._id?.toString())).size;

    // Top procedure codes
    const procedureCodeCounts = {};
    appointments.forEach(apt => {
      if (apt.procedureCodes && apt.procedureCodes.length > 0) {
        apt.procedureCodes.forEach(code => {
          if (!procedureCodeCounts[code.code]) {
            procedureCodeCounts[code.code] = {
              code: code.code,
              description: code.description,
              count: 0,
              revenue: 0
            };
          }
          procedureCodeCounts[code.code].count += 1;
          procedureCodeCounts[code.code].revenue += (code.rate || 0) * (code.units || 1);
        });
      }
    });

    const topProcedureCodes = Object.values(procedureCodeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Insurance breakdown
    const insuranceCounts = {};
    let totalPatientsWithInsurance = 0;

    appointments.forEach(apt => {
      if (apt.patientId?.insurances && apt.patientId.insurances.length > 0) {
        const primaryInsurance = apt.patientId.insurances.find(ins => ins.isPrimary) || apt.patientId.insurances[0];
        const insuranceName = primaryInsurance.provider || 'Unknown';

        if (!insuranceCounts[insuranceName]) {
          insuranceCounts[insuranceName] = 0;
        }
        insuranceCounts[insuranceName] += 1;
        totalPatientsWithInsurance += 1;
      } else {
        if (!insuranceCounts['Self-Pay']) {
          insuranceCounts['Self-Pay'] = 0;
        }
        insuranceCounts['Self-Pay'] += 1;
        totalPatientsWithInsurance += 1;
      }
    });

    const insuranceBreakdown = Object.entries(insuranceCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalPatientsWithInsurance > 0 ? ((count / totalPatientsWithInsurance) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Average visit length (estimate based on appointment duration)
    const completedAppointments = appointments.filter(apt => apt.status === 'Completed' || apt.status === 'Checked-Out');
    const averageVisitLength = completedAppointments.length > 0
      ? Math.round(completedAppointments.reduce((sum, apt) => sum + (apt.duration || 15), 0) / completedAppointments.length)
      : 15;

    // Recent activity (last 5 days)
    const recentActivity = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayAppointments = appointments.filter(apt =>
        apt.appointmentDate.toISOString().split('T')[0] === dateString
      );

      const dayRevenue = dayAppointments.reduce((sum, apt) => {
        if (apt.procedureCodes && apt.procedureCodes.length > 0) {
          return sum + apt.procedureCodes.reduce((codeSum, code) =>
            codeSum + ((code.rate || 0) * (code.units || 1)), 0
          );
        }
        return sum;
      }, 0);

      recentActivity.push({
        date: dateString,
        patients: new Set(dayAppointments.map(apt => apt.patientId?._id?.toString())).size,
        revenue: dayRevenue
      });
    }

    const reportData = {
      totalPatients,
      weeklyPatients,
      monthlyPatients,
      topProcedureCodes,
      insuranceBreakdown,
      averageVisitLength,
      recentActivity
    };

    console.log(`📊 Generated dashboard data: ${totalPatients} total patients, ${topProcedureCodes.length} procedure codes`);

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error generating doctor dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate dashboard data'
    });
  }
});

// Export PDF report for doctor
router.get('/doctor/export/pdf', verifyToken, async (req, res) => {
  try {
    const { userId, clinicId, role } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // For now, return a simple response
    // In a real implementation, you would generate a PDF using a library like puppeteer or pdfkit
    res.status(501).json({
      success: false,
      message: 'PDF export not yet implemented'
    });

  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF'
    });
  }
});

// Export CSV data for doctor
router.get('/doctor/export/csv', verifyToken, async (req, res) => {
  try {
    const { userId, clinicId, role } = req.user;

    if (role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctor role required.'
      });
    }

    // For now, return a simple response
    // In a real implementation, you would generate CSV data
    res.status(501).json({
      success: false,
      message: 'CSV export not yet implemented'
    });

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV'
    });
  }
});

module.exports = router;
