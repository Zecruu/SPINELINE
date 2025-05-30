import { connectToDatabase } from '../../../lib/mongodb.js';

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
    const { clinicId } = req.query;

    if (!clinicId || clinicId.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Clinic ID must be at least 3 characters'
      });
    }

    const { db } = await connectToDatabase();

    const clinic = await db.collection('clinics').findOne({
      clinicId: clinicId.toUpperCase(),
      isActive: true
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found or inactive'
      });
    }

    res.json({
      success: true,
      clinic: {
        clinicId: clinic.clinicId,
        clinicName: clinic.clinicName
      }
    });

  } catch (error) {
    console.error('Clinic validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
