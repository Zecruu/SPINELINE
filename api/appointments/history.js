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
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { clinicId } = decoded;

    const { db } = await connectToDatabase();
    const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const matchConditions = { clinicId };

    // Add patient filter if provided
    if (patientId) {
      const { ObjectId } = await import('mongodb');
      matchConditions.patientId = new ObjectId(patientId);
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      matchConditions.appointmentDate = {};
      if (startDate) {
        matchConditions.appointmentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        matchConditions.appointmentDate.$lte = new Date(endDate);
      }
    }

    // Get appointments with patient data
    const appointments = await db.collection('appointments').aggregate([
      { $match: matchConditions },
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
      { $sort: { appointmentDate: -1, appointmentTime: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ]).toArray();

    // Get total count for pagination
    const totalCount = await db.collection('appointments').countDocuments(matchConditions);

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        ...apt,
        patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown Patient',
        doctorName: apt.doctor ? apt.doctor.name : 'Unassigned'
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: parseInt(page) * parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching appointment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment history'
    });
  }
}
