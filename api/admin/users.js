import { connectToDatabase } from '../../lib/mongodb.js';
import bcrypt from 'bcrypt';

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
      const users = await db.collection('users')
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json({
        success: true,
        users
      });
    }

    if (req.method === 'POST') {
      const { name, email, password, role, clinicId } = req.body;

      if (!name || !email || !password || !role || !clinicId) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const existingUser = await db.collection('users').findOne({
        email: email.toLowerCase(),
        clinicId: clinicId.toUpperCase()
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists in this clinic'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        clinicId: clinicId.toUpperCase(),
        isActive: true,
        createdAt: new Date()
      };

      await db.collection('users').insertOne(newUser);

      return res.json({
        success: true,
        message: 'User created successfully',
        user: { ...newUser, password: undefined }
      });
    }

    if (req.method === 'DELETE') {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const { ObjectId } = await import('mongodb');
      await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
