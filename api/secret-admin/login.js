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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Admin credentials from environment variables
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'spineline_admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CHANGE_ME_IN_PRODUCTION';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Generate JWT token for admin
    const token = jwt.sign(
      {
        userId: 'admin',
        role: 'super_admin',
        clinicId: 'ADMIN'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: 'admin',
        name: 'SpineLine Administrator',
        role: 'super_admin',
        clinicId: 'ADMIN'
      }
    });

  } catch (error) {
    console.error('Secret admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate admin'
    });
  }
}
