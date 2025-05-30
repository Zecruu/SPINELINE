import { connectToDatabase } from '../../lib/mongodb.js';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const clinics = await db.collection('clinics')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.json({
        success: true,
        clinics
      });
    }

    if (req.method === 'POST') {
      const { clinicName, clinicId } = req.body;

      if (!clinicName || !clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic name and ID are required'
        });
      }

      const existingClinic = await db.collection('clinics').findOne({
        clinicId: clinicId.toUpperCase()
      });

      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID already exists'
        });
      }

      const newClinic = {
        clinicName,
        clinicId: clinicId.toUpperCase(),
        isActive: true,
        createdAt: new Date()
      };

      await db.collection('clinics').insertOne(newClinic);

      return res.json({
        success: true,
        message: 'Clinic created successfully',
        clinic: newClinic
      });
    }

    if (req.method === 'DELETE') {
      const { clinicId } = req.body;

      if (!clinicId) {
        return res.status(400).json({
          success: false,
          message: 'Clinic ID is required'
        });
      }

      await db.collection('clinics').deleteOne({ clinicId: clinicId.toUpperCase() });
      await db.collection('users').deleteMany({ clinicId: clinicId.toUpperCase() });

      return res.json({
        success: true,
        message: 'Clinic and associated users deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Clinics API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
