import { connectToDatabase } from '../../lib/mongodb.js';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { clinicId } = decoded;

    // Get date parameter (defaults to today)
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    // Set date range for the day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { db } = await connectToDatabase();

    // Get clinic info
    const clinic = await db.collection('clinics').findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Get appointments for the date with patient data
    const appointments = await db.collection('appointments').aggregate([
      {
        $match: {
          clinicId,
          appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedDoctor',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $unwind: { path: '$patient', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true }
      },
      {
        $sort: { appointmentTime: 1 }
      }
    ]).toArray();

    // Get checkout records for the date with patient data
    const checkouts = await db.collection('checkouts').aggregate([
      {
        $match: {
          clinicId,
          checkoutDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment'
        }
      },
      {
        $unwind: { path: '$patient', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="production-report-${reportDate.toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PRODUCTION REPORT', 50, 50);
    doc.fontSize(12).font('Helvetica').text(`FECHA: ${reportDate.toLocaleDateString('es-ES')}`, 50, 75);

    // Table headers
    let yPosition = 110;
    const leftMargin = 50;
    const columnWidths = [25, 120, 80, 25, 25, 25, 60, 80]; // Adjusted widths
    let xPosition = leftMargin;

    // Draw table headers
    doc.fontSize(8).font('Helvetica-Bold');
    const headers = ['#', 'Nombre del Paciente', 'Núm. de Record', 'Deductible', 'Tipo de Visita', 'Plan', 'Comentarios'];

    headers.forEach((header, index) => {
      if (index < columnWidths.length - 1) {
        doc.text(header, xPosition, yPosition, { width: columnWidths[index], align: 'left' });
        xPosition += columnWidths[index];
      }
    });

    // Draw header line
    yPosition += 15;
    doc.moveTo(leftMargin, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 5;

    // Process appointments and checkouts
    let rowNumber = 1;
    const processedAppointments = new Set();

    // Combine and sort all patient visits
    const allVisits = [];

    // Add appointments
    appointments.forEach(apt => {
      if (apt.patient && apt.status !== 'Cancelled') {
        allVisits.push({
          type: 'appointment',
          time: apt.appointmentTime,
          patient: apt.patient,
          recordNumber: apt.patient.recordNumber || apt.patient._id.toString().slice(-6).toUpperCase(),
          visitType: apt.visitType || 'REG',
          status: apt.status,
          appointmentId: apt._id,
          deductible: '0', // Default
          plan: 'MISC', // Default
          comments: apt.notes || ''
        });
      }
    });

    // Add checkout records
    checkouts.forEach(checkout => {
      if (checkout.patient && !processedAppointments.has(checkout.appointmentId?.toString())) {
        allVisits.push({
          type: 'checkout',
          time: checkout.checkoutTime || '00:00',
          patient: checkout.patient,
          recordNumber: checkout.patient.recordNumber || checkout.patient._id.toString().slice(-6).toUpperCase(),
          visitType: checkout.visitType || 'REG',
          status: 'Completed',
          deductible: checkout.copay || '0',
          plan: checkout.insuranceType || 'MISC',
          comments: checkout.notes || '',
          serviceCodes: checkout.serviceCodes || []
        });
        processedAppointments.add(checkout.appointmentId?.toString());
      }
    });

    // Sort by time
    allVisits.sort((a, b) => {
      const timeA = a.time.replace(':', '');
      const timeB = b.time.replace(':', '');
      return timeA.localeCompare(timeB);
    });

    // Draw rows
    doc.fontSize(7).font('Helvetica');

    allVisits.forEach(visit => {
      if (yPosition > 750) { // Start new page if needed
        doc.addPage();
        yPosition = 50;
      }

      xPosition = leftMargin;

      // Row number
      doc.text(rowNumber.toString(), xPosition, yPosition, { width: columnWidths[0], align: 'center' });
      xPosition += columnWidths[0];

      // Patient name
      const patientName = visit.patient.fullName || `${visit.patient.firstName} ${visit.patient.lastName}`;
      doc.text(patientName, xPosition, yPosition, { width: columnWidths[1], align: 'left' });
      xPosition += columnWidths[1];

      // Record number
      doc.text(visit.recordNumber, xPosition, yPosition, { width: columnWidths[2], align: 'left' });
      xPosition += columnWidths[2];

      // Deductible
      doc.text(visit.deductible, xPosition, yPosition, { width: columnWidths[3], align: 'center' });
      xPosition += columnWidths[3];

      // Visit type
      doc.text(visit.visitType, xPosition, yPosition, { width: columnWidths[4], align: 'center' });
      xPosition += columnWidths[4];

      // Plan
      doc.text(visit.plan, xPosition, yPosition, { width: columnWidths[5], align: 'center' });
      xPosition += columnWidths[5];

      // Comments/Service codes
      let comments = visit.comments;
      if (visit.serviceCodes && visit.serviceCodes.length > 0) {
        const codes = visit.serviceCodes.map(sc => sc.code).join(', ');
        comments = codes + (comments ? ` - ${comments}` : '');
      }
      doc.text(comments, xPosition, yPosition, { width: columnWidths[6], align: 'left' });

      yPosition += 12;
      rowNumber++;
    });

    // Summary section
    yPosition += 20;
    doc.moveTo(leftMargin, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    // Calculate totals
    const totalPatients = allVisits.length;
    const newPatients = allVisits.filter(v => v.visitType === 'NEW' || v.visitType === 'NP').length;
    const regularPatients = allVisits.filter(v => v.visitType === 'REG' || v.visitType === 'FU').length;
    const privatePatients = allVisits.filter(v => v.plan === 'PRIVATE' || v.plan === 'CASH').length;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`ORIENTADOS ACCU SPINA: ${totalPatients}`, leftMargin, yPosition);
    doc.text(`PACIENTES NUEVOS: ${newPatients}`, leftMargin + 200, yPosition);
    yPosition += 15;
    doc.text(`TOTAL PACIENTES FACTURACIÓN: ${regularPatients}`, leftMargin, yPosition);
    doc.text(`PACIENTES PRIVADOS: ${privatePatients}`, leftMargin + 200, yPosition);

    // Footer
    yPosition = 780;
    doc.fontSize(8).font('Helvetica');
    doc.text('Generated by SpineLine | Confidential Patient Data | HIPAA Compliant', leftMargin, yPosition, {
      width: 500,
      align: 'center'
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Production report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate production report' });
    }
  }
}
