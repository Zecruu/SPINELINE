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
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get appointments with patient data
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

    res.json({
      success: true,
      appointments: appointments.map(apt => ({
        ...apt,
        patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown Patient',
        doctorName: apt.doctor ? apt.doctor.name : 'Unassigned'
      }))
    });

  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
}
