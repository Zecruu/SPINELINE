// Environment test endpoint
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    res.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        MONGO_URI_EXISTS: !!process.env.MONGO_URI,
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        ADMIN_EMAIL_EXISTS: !!process.env.ADMIN_EMAIL,
        ADMIN_PASSWORD_EXISTS: !!process.env.ADMIN_PASSWORD,
        // Show first few characters of connection string for debugging
        MONGODB_URI_PREFIX: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : null,
        MONGO_URI_PREFIX: process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Env test error:', error);
    res.status(500).json({
      success: false,
      message: 'Environment test failed',
      error: error.message
    });
  }
}
