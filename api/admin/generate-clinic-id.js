import { connectToDatabase } from '../../lib/mongodb.js';

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
    const { db } = await connectToDatabase();
    
    let clinicId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const prefix = 'DCC';
      const number = Math.floor(Math.random() * 900) + 100;
      clinicId = `${prefix}${number}`;

      const existingClinic = await db.collection('clinics').findOne({ clinicId });
      if (!existingClinic) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Unable to generate unique clinic ID. Please try again.'
      });
    }

    res.json({
      success: true,
      clinicId
    });

  } catch (error) {
    console.error('Generate clinic ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
