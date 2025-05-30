const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getAuditRecords,
  getProviders,
  generatePDF,
  generateAllPDFs,
  emailPDF,
  getDailyReport,
  generateDailyReportPDF,
  emailDailyReport
} = require('../controllers/auditController');

// Test endpoint
router.get('/test', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Audit API is working',
    user: {
      clinicId: req.user.clinicId,
      role: req.user.role,
      email: req.user.email
    }
  });
});

// Test HTML template endpoint
router.get('/test-html', verifyToken, async (req, res) => {
  try {
    const { generateHTMLTemplate } = require('../controllers/auditController');

    // Create sample data
    const sampleRecords = [
      {
        patientName: 'John Doe',
        recordNumber: 'P001',
        date: new Date(),
        time: '09:00 AM',
        visitType: 'Regular Visit',
        providerName: 'Dr. Smith',
        notes: 'Patient complained of lower back pain',
        signature: true,
        totalAmount: 150.00,
        paymentMethod: 'Insurance'
      }
    ];

    const clinicInfo = {
      clinicId: req.user.clinicId,
      npi: 'NPI-' + req.user.clinicId
    };

    const html = generateHTMLTemplate(sampleRecords, clinicInfo, 'Test Date Range');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate test HTML',
      error: error.message
    });
  }
});

// Get audit records with filtering
router.get('/records', verifyToken, getAuditRecords);

// Get providers for filter dropdown
router.get('/providers', verifyToken, getProviders);

// Test PDF generation
router.get('/test-pdf', verifyToken, async (req, res) => {
  try {
    const puppeteer = require('puppeteer');

    console.log('🧪 Testing basic PDF generation...');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test PDF</title>
      </head>
      <body>
        <h1>Test PDF Generation</h1>
        <p>This is a test PDF generated at ${new Date().toLocaleString()}</p>
        <p>User: ${req.user.email}</p>
        <p>Clinic: ${req.user.clinicId}</p>
      </body>
      </html>
    `;

    await page.setContent(testHtml);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.send(pdf);

  } catch (error) {
    console.error('❌ Test PDF generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test PDF generation failed',
      error: error.message
    });
  }
});

// Generate PDF for specific date/range
router.post('/generate-pdf', verifyToken, generatePDF);

// Generate PDF for download (GET request for easier testing)
router.get('/download-pdf', verifyToken, async (req, res) => {
  try {
    // Call the generatePDF function but force download
    const originalSend = res.send;
    const originalSetHeader = res.setHeader;

    // Override setHeader to force attachment
    res.setHeader = function(name, value) {
      if (name === 'Content-Disposition') {
        value = value.replace('inline', 'attachment');
      }
      return originalSetHeader.call(this, name, value);
    };

    // Call the original generatePDF function
    const { generatePDF } = require('../controllers/auditController');
    await generatePDF(req, res);

  } catch (error) {
    console.error('❌ Download PDF failed:', error);
    res.status(500).json({
      success: false,
      message: 'Download PDF failed',
      error: error.message
    });
  }
});

// Generate ZIP file with all PDFs
router.post('/download-all-pdfs', verifyToken, generateAllPDFs);

// Email PDF
router.post('/email-pdf', verifyToken, emailPDF);

// Daily Report endpoints
router.get('/daily-report', verifyToken, getDailyReport);
router.get('/daily-report/pdf', verifyToken, generateDailyReportPDF);
router.post('/daily-report/email', verifyToken, emailDailyReport);

module.exports = router;
