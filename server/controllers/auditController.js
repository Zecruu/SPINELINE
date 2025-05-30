const { Appointment, Patient, User, Checkout } = require('../models');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Get audit records with filtering
const getAuditRecords = async (req, res) => {
  try {
    const { clinicId } = req.user;
    const {
      date,
      startDate,
      endDate,
      provider,
      patient,
      visitType
    } = req.query;

    console.log('🔍 Getting audit records for clinic:', clinicId);
    console.log('📅 Filters:', { date, startDate, endDate, provider, patient, visitType });

    // Build date filter
    let dateFilter = {};
    if (date) {
      // Single date
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
      dateFilter = {
        appointmentDate: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      };
    } else if (startDate && endDate) {
      // Date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter = {
        appointmentDate: {
          $gte: start,
          $lte: end
        }
      };
    }

    // Build query
    let query = { clinicId };
    if (Object.keys(dateFilter).length > 0) {
      query = { ...query, ...dateFilter };
    }
    if (provider) query.providerId = provider;
    if (patient) query.patientId = patient;
    if (visitType) query.visitType = visitType;

    // Get appointments with populated patient and checkout data
    const appointments = await Appointment.find(query)
      .populate('patientId', 'firstName lastName recordNumber')
      .populate('providerId', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .lean();

    console.log(`📊 Found ${appointments.length} appointments`);

    // Get checkout records for these appointments
    const appointmentIds = appointments.map(apt => apt._id);
    const checkouts = await Checkout.find({
      appointmentId: { $in: appointmentIds },
      clinicId
    }).lean();

    // Create a map of checkout data by appointment ID
    const checkoutMap = {};
    checkouts.forEach(checkout => {
      checkoutMap[checkout.appointmentId.toString()] = checkout;
    });

    // Format the audit records
    const auditRecords = appointments.map(appointment => {
      const checkout = checkoutMap[appointment._id.toString()];

      return {
        _id: appointment._id,
        patientName: appointment.patientId ?
          `${appointment.patientId.firstName} ${appointment.patientId.lastName}` :
          'Unknown Patient',
        recordNumber: appointment.patientId?.recordNumber || 'N/A',
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        visitType: appointment.visitType,
        providerName: appointment.providerId?.name || appointment.providerName || 'N/A',
        notes: appointment.notes || appointment.chiefComplaint || 'No notes available',
        signature: checkout?.paymentDetails?.signature || appointment.checkoutData?.signature || null,
        serviceCodes: checkout?.serviceCodes || appointment.treatmentCodes || [],
        diagnosticCodes: checkout?.diagnosticCodes || appointment.diagnosticCodes || [],
        totalAmount: checkout?.totalAmount || appointment.totalAmount || 0,
        paymentMethod: checkout?.paymentDetails?.paymentMethod || appointment.checkoutData?.paymentMethod || 'N/A',
        checkedOutAt: checkout?.checkedOutAt || appointment.completedAt || null,
        checkedOutBy: checkout?.checkedOutBy || appointment.checkedOutBy || 'N/A'
      };
    });

    res.json({
      success: true,
      records: auditRecords,
      total: auditRecords.length
    });

  } catch (error) {
    console.error('Error getting audit records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit records',
      error: error.message
    });
  }
};

// Get providers for filter dropdown
const getProviders = async (req, res) => {
  try {
    const { clinicId } = req.user;

    const providers = await User.find({
      clinicId,
      role: { $in: ['doctor', 'provider'] },
      isActive: true
    }).select('_id name').lean();

    res.json({
      success: true,
      providers
    });

  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve providers',
      error: error.message
    });
  }
};

// Generate HTML template for PDF
const generateHTMLTemplate = (records, clinicInfo, dateRange) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    try {
      // Handle both string and time formats
      if (typeof time === 'string') {
        return time;
      }
      return time.toString();
    } catch (error) {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    } catch (error) {
      return '$0.00';
    }
  };

  // Ensure we have valid records array
  const validRecords = Array.isArray(records) ? records : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpineLine Audit Records</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header h2 {
      color: #666;
      margin: 0 0 15px 0;
      font-size: 18px;
      font-weight: normal;
    }
    .clinic-info div {
      margin: 5px 0;
      font-size: 14px;
    }
    .date-range {
      background: #f3f4f6;
      padding: 10px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
      font-weight: bold;
    }
    .summary {
      margin: 20px 0;
      padding: 15px;
      background: #f8fafc;
      border-radius: 5px;
    }
    .summary-item {
      display: inline-block;
      margin-right: 30px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #2563eb;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SpineLine Chiropractic</h1>
    <h2>Audit Records</h2>
    <div class="clinic-info">
      <div>Clinic ID: ${clinicInfo.clinicId || 'N/A'}</div>
      <div>Doctor NPI: ${clinicInfo.npi || 'Not Available'}</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  ${dateRange ? `<div class="date-range">Report Period: ${dateRange}</div>` : ''}

  <div class="summary">
    <div class="summary-item">Total Records: ${validRecords.length}</div>
    <div class="summary-item">Signed Records: ${validRecords.filter(r => r.signature).length}</div>
    <div class="summary-item">Total Revenue: ${formatCurrency(validRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Patient Name</th>
        <th>Record #</th>
        <th>Date</th>
        <th>Time</th>
        <th>Visit Type</th>
        <th>Provider</th>
        <th>Notes</th>
        <th>Amount</th>
        <th>Payment</th>
        <th>Signature</th>
      </tr>
    </thead>
    <tbody>
      ${validRecords.length > 0 ? validRecords.map(record => `
        <tr>
          <td>${record.patientName || 'N/A'}</td>
          <td>${record.recordNumber || 'N/A'}</td>
          <td>${formatDate(record.date)}</td>
          <td>${formatTime(record.time)}</td>
          <td>${record.visitType || 'Regular Visit'}</td>
          <td>${record.providerName || 'N/A'}</td>
          <td>${(record.notes || 'No notes').substring(0, 100)}${record.notes && record.notes.length > 100 ? '...' : ''}</td>
          <td>${formatCurrency(record.totalAmount)}</td>
          <td>${record.paymentMethod || 'N/A'}</td>
          <td>${record.signature ? 'Signed' : 'Not Signed'}</td>
        </tr>
      `).join('') : '<tr><td colspan="10" style="text-align: center; padding: 20px;">No records found for the selected criteria.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>This document contains confidential patient information and is protected by HIPAA regulations.</p>
    <p>Generated by SpineLine Chiropractic Management System - ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
};

// Generate PDF
const generatePDF = async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { date, startDate, endDate } = req.query;

    console.log('📄 Generating PDF for clinic:', clinicId);

    // Only allow doctors and admins to generate PDFs
    if (role !== 'doctor' && role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to generate audit PDFs'
      });
    }

    // Get audit records directly
    let auditData;
    try {
      console.log('🔍 Getting audit data for PDF generation...');

      // Build date filter
      let dateFilter = {};
      if (date) {
        // Single date
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
        dateFilter = {
          appointmentDate: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };
      } else if (startDate && endDate) {
        // Date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter = {
          appointmentDate: {
            $gte: start,
            $lte: end
          }
        };
      }

      // Build query
      let query = { clinicId };
      if (Object.keys(dateFilter).length > 0) {
        query = { ...query, ...dateFilter };
      }

      console.log('📊 Query for audit data:', JSON.stringify(query, null, 2));

      // Get appointments with populated data
      const appointments = await Appointment.find(query)
        .populate('patientId', 'firstName lastName recordNumber')
        .populate('providerId', 'name')
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .lean();

      console.log(`📋 Found ${appointments.length} appointments for PDF`);

      // Get checkout records
      const appointmentIds = appointments.map(apt => apt._id);
      const checkouts = await Checkout.find({
        appointmentId: { $in: appointmentIds },
        clinicId
      }).lean();

      console.log(`💰 Found ${checkouts.length} checkout records`);

      // Create checkout map
      const checkoutMap = {};
      checkouts.forEach(checkout => {
        checkoutMap[checkout.appointmentId.toString()] = checkout;
      });

      // Format audit records
      const auditRecords = appointments.map(appointment => {
        const checkout = checkoutMap[appointment._id.toString()];

        return {
          _id: appointment._id,
          patientName: appointment.patientId ?
            `${appointment.patientId.firstName} ${appointment.patientId.lastName}` :
            'Unknown Patient',
          recordNumber: appointment.patientId?.recordNumber || 'N/A',
          date: appointment.appointmentDate,
          time: appointment.appointmentTime,
          visitType: appointment.visitType || 'Regular Visit',
          providerName: appointment.providerId?.name || appointment.providerName || 'N/A',
          notes: appointment.notes || appointment.chiefComplaint || 'No notes available',
          signature: checkout?.paymentDetails?.signature || appointment.checkoutData?.signature || null,
          serviceCodes: checkout?.serviceCodes || appointment.treatmentCodes || [],
          diagnosticCodes: checkout?.diagnosticCodes || appointment.diagnosticCodes || [],
          totalAmount: checkout?.totalAmount || appointment.totalAmount || 0,
          paymentMethod: checkout?.paymentDetails?.paymentMethod || appointment.checkoutData?.paymentMethod || 'N/A',
          checkedOutAt: checkout?.checkedOutAt || appointment.completedAt || null,
          checkedOutBy: checkout?.checkedOutBy || appointment.checkedOutBy || 'N/A'
        };
      });

      auditData = {
        success: true,
        records: auditRecords
      };

      console.log(`✅ Prepared ${auditRecords.length} audit records for PDF`);

    } catch (error) {
      console.error('❌ Error getting audit data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit data for PDF generation',
        error: error.message
      });
    }

    // Validate audit data
    if (!auditData || !auditData.success) {
      console.error('❌ Invalid audit data structure');
      return res.status(500).json({
        success: false,
        message: 'Invalid audit data structure'
      });
    }

    console.log(`📊 Audit data summary: ${auditData.records.length} records`);

    // Get clinic info
    const clinicInfo = {
      clinicId: clinicId || 'Unknown',
      npi: 'NPI-' + (clinicId || 'Unknown')
    };

    // Determine date range for header
    let dateRange = '';
    try {
      if (date) {
        dateRange = new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else if (startDate && endDate) {
        const start = new Date(startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const end = new Date(endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        dateRange = `${start} - ${end}`;
      } else {
        dateRange = 'All Dates';
      }
    } catch (dateError) {
      console.warn('⚠️ Error formatting date range:', dateError);
      dateRange = 'Date Range';
    }

    console.log(`📅 Date range: ${dateRange}`);

    // Generate HTML
    let html;
    try {
      html = generateHTMLTemplate(auditData.records, clinicInfo, dateRange);
      console.log(`📝 HTML template generated (${html.length} characters)`);

      // Log first 500 characters for debugging
      console.log('📄 HTML preview:', html.substring(0, 500) + '...');

    } catch (htmlError) {
      console.error('❌ Error generating HTML template:', htmlError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate HTML template',
        error: htmlError.message
      });
    }

    // Generate PDF using Puppeteer with simplified approach
    let browser;
    let pdf;
    try {
      console.log('🚀 Launching Puppeteer browser...');

      // Create official SpineLine audit report HTML matching the reference design
      const officialHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>SpineLine Audit Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000;
              font-size: 11px;
              line-height: 1.3;
            }

            .header {
              margin-bottom: 20px;
            }

            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              text-align: left;
            }

            .clinic-info {
              margin-bottom: 15px;
              font-size: 11px;
            }

            .clinic-info div {
              margin-bottom: 3px;
            }

            .date-section {
              margin-bottom: 15px;
              font-size: 11px;
            }

            .date-section div {
              margin-bottom: 3px;
            }

            .date-header {
              background-color: #f0f0f0;
              padding: 8px;
              margin: 15px 0 5px 0;
              font-weight: bold;
              border: 1px solid #ccc;
              font-size: 12px;
            }

            .patient-entry {
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              margin-bottom: 8px;
              padding: 8px;
            }

            .patient-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }

            .patient-name {
              font-weight: bold;
              flex: 2;
            }

            .record-id {
              flex: 1;
              text-align: center;
            }

            .time {
              flex: 1;
              text-align: center;
            }

            .visit-type {
              flex: 1.5;
              text-align: center;
            }

            .service-codes {
              flex: 1.5;
              text-align: center;
            }

            .icd-codes {
              flex: 1.5;
              text-align: center;
            }

            .copay {
              flex: 1;
              text-align: center;
            }

            .payment-type {
              flex: 1.5;
              text-align: center;
            }

            .signature {
              flex: 1.5;
              text-align: center;
            }

            .table-header {
              display: flex;
              justify-content: space-between;
              background-color: #e0e0e0;
              padding: 6px 8px;
              border: 1px solid #ccc;
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 5px;
            }

            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }

            .divider {
              height: 1px;
              background-color: #ccc;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Audit Report</div>

            <div class="clinic-info">
              <div><strong>Clinic:</strong> SpineLine Chiropractic</div>
              <div><strong>Clinic ID:</strong> ${clinicInfo.clinicId}</div>
              ${auditData.records.length > 0 && auditData.records[0].providerName ?
                `<div><strong>Provider:</strong> ${auditData.records[0].providerName}</div>` : ''}
            </div>

            <div class="date-section">
              <div><strong>Report Date Range:</strong> ${dateRange}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}</div>
            </div>
          </div>

          ${generatePatientEntries(auditData.records)}

          <div class="footer">
            <p>Generated by SpineLine | Confidential Patient Data | HIPAA Compliant</p>
          </div>
        </body>
        </html>
      `;

      // Helper function to generate patient entries grouped by date
      function generatePatientEntries(records) {
        if (!records || records.length === 0) {
          return '<div class="date-header">No records found for the selected criteria</div>';
        }

        // Group records by date
        const recordsByDate = {};
        records.forEach(record => {
          const dateKey = record.date ? new Date(record.date).toLocaleDateString('en-US') : 'Unknown Date';
          if (!recordsByDate[dateKey]) {
            recordsByDate[dateKey] = [];
          }
          recordsByDate[dateKey].push(record);
        });

        let html = '';

        // Add table header
        html += `
          <div class="table-header">
            <div class="patient-name">Patient Name</div>
            <div class="record-id">Record ID</div>
            <div class="time">Time</div>
            <div class="visit-type">Visit Type</div>
            <div class="service-codes">Service Codes</div>
            <div class="icd-codes">ICD Codes</div>
            <div class="copay">Copay</div>
            <div class="payment-type">Payment Type</div>
            <div class="signature">Signature</div>
          </div>
        `;

        // Generate entries for each date
        Object.keys(recordsByDate).sort().forEach(dateKey => {
          html += `<div class="date-header">${dateKey}</div>`;

          recordsByDate[dateKey].forEach(record => {
            const serviceCodes = Array.isArray(record.serviceCodes) ?
              record.serviceCodes.map(sc => sc.code || sc).join(', ') :
              (record.serviceCodes || 'N/A');

            const icdCodes = Array.isArray(record.diagnosticCodes) ?
              record.diagnosticCodes.map(dc => dc.code || dc).join(', ') :
              (record.diagnosticCodes || 'N/A');

            html += `
              <div class="patient-entry">
                <div class="patient-row">
                  <div class="patient-name">${record.patientName || 'N/A'}</div>
                  <div class="record-id">${record.recordNumber || 'N/A'}</div>
                  <div class="time">${record.time || 'N/A'}</div>
                  <div class="visit-type">${record.visitType || 'Regular Visit'}</div>
                  <div class="service-codes">${serviceCodes}</div>
                  <div class="icd-codes">${icdCodes}</div>
                  <div class="copay">$${(record.totalAmount || 0).toFixed(2)}</div>
                  <div class="payment-type">${record.paymentMethod || 'N/A'}</div>
                  <div class="signature">${record.signature ? 'Signed' : 'Not Signed'}</div>
                </div>
              </div>
            `;
          });

          html += '<div class="divider"></div>';
        });

        return html;
      }

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      console.log('📄 Creating new page...');
      const page = await browser.newPage();

      console.log('🎨 Setting HTML content...');
      await page.setContent(officialHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      console.log('📋 Generating PDF...');
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      console.log('✅ PDF generated successfully');

    } catch (pdfError) {
      console.error('❌ Error during PDF generation:', pdfError);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed');
        } catch (closeError) {
          console.warn('⚠️ Error closing browser:', closeError);
        }
      }
    }

    // Validate PDF was generated
    if (!pdf || pdf.length === 0) {
      console.error('❌ PDF generation resulted in empty file');
      return res.status(500).json({
        success: false,
        message: 'PDF generation resulted in empty file'
      });
    }

    console.log(`📄 PDF generated successfully (${pdf.length} bytes)`);

    // Set response headers for PDF download
    const filename = `audit-records-${date || 'range'}-${Date.now()}.pdf`;

    // Try inline display first, then fallback to attachment
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    console.log(`📤 Sending PDF file: ${filename}`);
    res.end(pdf, 'binary');

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

// Generate ZIP file with all PDFs
const generateAllPDFs = async (req, res) => {
  try {
    const { clinicId, role } = req.user;

    console.log('📦 Generating ZIP with all PDFs for clinic:', clinicId);

    // Only allow doctors and admins to generate PDFs
    if (role !== 'doctor' && role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to generate audit PDFs'
      });
    }

    // Get all unique dates with appointments
    const appointments = await Appointment.find({ clinicId })
      .select('appointmentDate')
      .sort({ appointmentDate: 1 })
      .lean();

    // Get unique dates
    const uniqueDates = [...new Set(
      appointments.map(apt => apt.appointmentDate.toISOString().split('T')[0])
    )];

    console.log(`📅 Found ${uniqueDates.length} unique dates with appointments`);

    if (uniqueDates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No appointment dates found for this clinic'
      });
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers for ZIP download
    const filename = `audit-records-all-dates-${clinicId}-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive to response
    archive.pipe(res);

    // Generate PDF for each date
    for (const date of uniqueDates) {
      try {
        console.log(`📄 Generating PDF for date: ${date}`);

        // Create a mock request for this date
        const dateReq = {
          user: req.user,
          query: { date }
        };

        // Get audit data for this date
        let auditData;
        try {
          await new Promise((resolve, reject) => {
            const auditRes = {
              json: (data) => {
                auditData = data;
                resolve();
              },
              status: (code) => ({ json: (data) => reject(new Error(data.message || 'Failed to get audit data')) })
            };
            getAuditRecords(dateReq, auditRes).catch(reject);
          });
        } catch (error) {
          console.warn(`⚠️ Failed to get audit data for ${date}:`, error.message);
          continue; // Skip this date
        }

        if (!auditData.success || auditData.records.length === 0) {
          console.log(`📭 No records found for ${date}, skipping`);
          continue;
        }

        // Get clinic info
        const clinicInfo = {
          clinicId,
          npi: 'NPI-' + clinicId
        };

        const dateRange = new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Generate HTML and PDF
        const html = generateHTMLTemplate(auditData.records, clinicInfo, dateRange);

        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });

        await browser.close();

        // Add PDF to archive
        const pdfFilename = `${date}.pdf`;
        archive.append(pdf, { name: pdfFilename });

        console.log(`✅ Added ${pdfFilename} to ZIP`);

      } catch (error) {
        console.error(`❌ Error generating PDF for ${date}:`, error);
        // Continue with other dates
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Error generating ZIP file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ZIP file',
      error: error.message
    });
  }
};

// Email PDF
const emailPDF = async (req, res) => {
  try {
    const { clinicId, role } = req.user;
    const { date, startDate, endDate, email } = req.query;

    console.log('📧 Emailing PDF for clinic:', clinicId);

    // Only allow doctors, admins, and secretaries to email PDFs
    if (role !== 'doctor' && role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to email audit PDFs'
      });
    }

    // For now, return a message that email functionality needs to be configured
    // In a production environment, you would:
    // 1. Generate the PDF (similar to generatePDF function)
    // 2. Configure nodemailer with your email service
    // 3. Send the PDF as an attachment

    res.json({
      success: false,
      message: 'Email functionality is not yet configured. Please contact your system administrator to set up email services for PDF delivery.'
    });

  } catch (error) {
    console.error('Error emailing PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email PDF',
      error: error.message
    });
  }
};

// Get daily report data
const getDailyReport = async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { date } = req.query;

    // Default to today if no date provided
    const reportDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
    const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1);

    console.log(`📊 Generating daily report for ${reportDate.toLocaleDateString()} - Clinic: ${clinicId}`);

    // Get all appointments for the day
    const appointments = await Appointment.find({
      clinicId,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    })
    .populate('patientId', 'firstName lastName recordNumber')
    .populate('checkedOutBy', 'name')
    .sort({ appointmentTime: 1 })
    .lean();

    // Get checkout records for signature status
    const checkouts = await Checkout.find({
      clinicId,
      checkedOutAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).lean();

    // Create checkout map for quick lookup
    const checkoutMap = {};
    checkouts.forEach(checkout => {
      checkoutMap[checkout.appointmentId.toString()] = checkout;
    });

    // Format appointment data
    const formattedAppointments = appointments.map(apt => {
      const checkout = checkoutMap[apt._id.toString()];
      return {
        patientName: apt.patientId ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : 'Unknown Patient',
        recordNumber: apt.patientId?.recordNumber || 'N/A',
        appointmentTime: apt.appointmentTime,
        visitType: apt.visitType || 'Regular Visit',
        provider: apt.checkedOutBy?.name || 'N/A',
        status: apt.status,
        hasSignature: checkout?.paymentDetails?.signature ? true : false,
        totalAmount: checkout?.totalAmount || apt.totalAmount || 0,
        paymentMethod: checkout?.paymentDetails?.paymentMethod || apt.checkoutData?.paymentMethod || 'N/A'
      };
    });

    // Calculate summary statistics
    const totalAppointments = appointments.length;
    const activePatients = new Set(appointments.map(apt => apt.patientId?._id?.toString())).size;
    const signedRecords = formattedAppointments.filter(apt => apt.hasSignature).length;
    const checkedOutAppointments = appointments.filter(apt => apt.status === 'Checked-Out').length;

    // Check for alerts
    const alerts = [];

    // Missing signatures
    const unsignedRecords = formattedAppointments.filter(apt => apt.status === 'Checked-Out' && !apt.hasSignature);
    if (unsignedRecords.length > 0) {
      alerts.push({
        type: 'missing_signatures',
        message: `${unsignedRecords.length} checked-out record(s) missing patient signature`
      });
    }

    // Get patients with expired/expiring referrals and insurance
    const patientIds = appointments.map(apt => apt.patientId?._id).filter(Boolean);
    const patients = await Patient.find({
      _id: { $in: patientIds },
      clinicId
    }).lean();

    patients.forEach(patient => {
      // Check referrals
      if (patient.referrals) {
        patient.referrals.forEach(referral => {
          if (referral.isActive && referral.remainingDays <= 7) {
            alerts.push({
              type: 'referral_expiring',
              message: `${patient.firstName} ${patient.lastName} - Referral expires in ${referral.remainingDays} days`
            });
          }
        });
      }

      // Check insurance
      if (patient.insurances) {
        const primaryInsurance = patient.insurances.find(ins => ins.isPrimary);
        if (primaryInsurance?.expirationDate) {
          const daysUntilExpiry = Math.ceil((new Date(primaryInsurance.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
            alerts.push({
              type: 'insurance_expiring',
              message: `${patient.firstName} ${patient.lastName} - Insurance expires in ${daysUntilExpiry} days`
            });
          }
        }
      }
    });

    const pendingTasks = alerts.length;

    const reportData = {
      date: reportDate.toISOString().split('T')[0],
      totalAppointments,
      activePatients,
      signedRecords,
      pendingTasks,
      appointments: formattedAppointments
    };

    res.json({
      success: true,
      report: reportData,
      alerts
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: error.message
    });
  }
};

// Generate daily report PDF
const generateDailyReportPDF = async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { date } = req.query;

    // Get daily report data
    const reportReq = { user: req.user, query: { date } };
    let reportData;

    await new Promise((resolve, reject) => {
      const reportRes = {
        json: (data) => {
          reportData = data;
          resolve();
        },
        status: (code) => ({ json: (data) => reject(new Error(data.message || 'Failed to get report data')) })
      };
      getDailyReport(reportReq, reportRes).catch(reject);
    });

    if (!reportData.success) {
      throw new Error('Failed to get daily report data');
    }

    const report = reportData.report;
    const alerts = reportData.alerts || [];

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Daily Report - ${report.date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .date { font-size: 16px; color: #666; }
            .summary { display: flex; justify-content: space-around; margin: 30px 0; }
            .summary-card { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .summary-number { font-size: 32px; font-weight: bold; color: #2563eb; }
            .summary-label { font-size: 14px; color: #666; margin-top: 5px; }
            .alerts { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .alerts h3 { color: #92400e; margin: 0 0 10px 0; }
            .alerts ul { margin: 0; padding-left: 20px; }
            .alerts li { color: #92400e; margin: 5px 0; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f8f9fa; font-weight: bold; }
            .table tr:nth-child(even) { background-color: #f8f9fa; }
            .status-scheduled { color: #f59e0b; }
            .status-checked-in { color: #3b82f6; }
            .status-checked-out { color: #10b981; }
            .signature-yes { color: #10b981; }
            .signature-no { color: #ef4444; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">📄 Daily Report</div>
            <div class="date">${new Date(report.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</div>
            <div style="margin-top: 10px; font-size: 14px;">Clinic ID: ${clinicId}</div>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-number">${report.totalAppointments}</div>
              <div class="summary-label">Total Appointments</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.activePatients}</div>
              <div class="summary-label">Active Patients</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.signedRecords}</div>
              <div class="summary-label">Signed Records</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${report.pendingTasks}</div>
              <div class="summary-label">Pending Tasks</div>
            </div>
          </div>

          ${alerts.length > 0 ? `
            <div class="alerts">
              <h3>⚠️ Attention Required</h3>
              <ul>
                ${alerts.map(alert => `<li>${alert.message}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <table class="table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Time</th>
                <th>Visit Type</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Signature</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${report.appointments.map(apt => `
                <tr>
                  <td>${apt.patientName}</td>
                  <td>${apt.appointmentTime}</td>
                  <td>${apt.visitType}</td>
                  <td>${apt.provider}</td>
                  <td class="status-${apt.status.toLowerCase().replace('-', '-')}">${apt.status}</td>
                  <td class="${apt.hasSignature ? 'signature-yes' : 'signature-no'}">
                    ${apt.hasSignature ? '✓ Signed' : '✗ Unsigned'}
                  </td>
                  <td>$${apt.totalAmount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by SpineLine | ${new Date().toLocaleString()} | Confidential Patient Data | HIPAA Compliant</p>
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Send PDF
    const filename = `daily-report-${report.date}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(pdf, 'binary');

  } catch (error) {
    console.error('Error generating daily report PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report PDF',
      error: error.message
    });
  }
};

// Email daily report
const emailDailyReport = async (req, res) => {
  try {
    res.json({
      success: false,
      message: 'Email functionality is not yet configured. Please contact your system administrator to set up email services for daily report delivery.'
    });
  } catch (error) {
    console.error('Error emailing daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email daily report',
      error: error.message
    });
  }
};

module.exports = {
  getAuditRecords,
  getProviders,
  generatePDF,
  generateAllPDFs,
  emailPDF,
  generateHTMLTemplate,
  getDailyReport,
  generateDailyReportPDF,
  emailDailyReport
};
