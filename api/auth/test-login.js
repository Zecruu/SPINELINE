// Test login endpoint without database to isolate issues
module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    console.log('Test login request received:', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });

    const { email, password, clinicId } = req.body;

    // Validate input
    if (!email || !password || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and clinic ID are required',
        received: { email: !!email, password: !!password, clinicId: !!clinicId }
      });
    }

    // Mock successful login for testing
    if (email === 'test@test.com' && password === 'test123' && clinicId === 'DRAAIV') {
      return res.json({
        success: true,
        message: 'Test login successful',
        token: 'test-token-123',
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: email,
          role: 'doctor',
          clinicId: clinicId,
          clinicName: 'Test Clinic'
        }
      });
    }

    // Return the received data for debugging
    res.json({
      success: false,
      message: 'Test endpoint - credentials received',
      debug: {
        email,
        password: password ? '[HIDDEN]' : null,
        clinicId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during test login',
      error: error.message,
      stack: error.stack
    });
  }
}
