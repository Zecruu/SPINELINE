import { connectToDatabase } from '../../lib/mongodb.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    // Process appointments and checkouts
    const processedAppointments = new Set();
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
          deductible: '0',
          plan: 'MISC',
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

    // Calculate totals
    const totalPatients = allVisits.length;
    const newPatients = allVisits.filter(v => v.visitType === 'NEW' || v.visitType === 'NP').length;
    const regularPatients = allVisits.filter(v => v.visitType === 'REG' || v.visitType === 'FU').length;
    const privatePatients = allVisits.filter(v => v.plan === 'PRIVATE' || v.plan === 'CASH').length;

    // Return data for frontend PDF generation
    res.json({
      success: true,
      reportData: {
        clinic: {
          name: clinic.clinicName,
          id: clinic.clinicId
        },
        date: reportDate.toLocaleDateString('es-ES'),
        visits: allVisits.map((visit, index) => ({
          number: index + 1,
          patientName: visit.patient.fullName || `${visit.patient.firstName} ${visit.patient.lastName}`,
          recordNumber: visit.recordNumber,
          deductible: visit.deductible,
          visitType: visit.visitType,
          plan: visit.plan,
          comments: visit.serviceCodes && visit.serviceCodes.length > 0 
            ? visit.serviceCodes.map(sc => sc.code).join(', ') + (visit.comments ? ` - ${visit.comments}` : '')
            : visit.comments
        })),
        summary: {
          totalPatients,
          newPatients,
          regularPatients,
          privatePatients
        }
      }
    });

  } catch (error) {
    console.error('Production report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate production report' });
  }
}
