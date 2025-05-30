// Admin login endpoint for Vercel
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check against hardcoded admin credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@spineline.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SpineLine2024!';

    if (email === adminEmail && password === adminPassword) {
      // Generate admin token
      const token = jwt.sign({
        id: 'admin',
        email: adminEmail,
        role: 'admin',
        name: 'SpineLine Admin'
      }, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '2h'
      });

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: 'admin',
          email: adminEmail,
          role: 'admin',
          name: 'SpineLine Admin'
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
}
