// User login endpoint
import { connectToDatabase } from '../../lib/mongodb.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email, password, clinicId } = req.body;

    if (!email || !password || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and clinic ID are required'
      });
    }

    const { db } = await connectToDatabase();

    // Find user
    const user = await db.collection('users').findOne({
      email: email.toLowerCase(),
      clinicId: clinicId.toUpperCase(),
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or clinic ID'
      });
    }

    // Check clinic
    const clinic = await db.collection('clinics').findOne({
      clinicId: clinicId.toUpperCase(),
      isActive: true
    });

    if (!clinic) {
      return res.status(401).json({
        success: false,
        message: 'Clinic is inactive. Please contact your administrator.'
      });
    }

    // Check password
    let isPasswordValid;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.log('Password comparison error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Generate token
    const token = jwt.sign({
      userId: user._id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      name: user.name
    }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: clinic.clinicName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
