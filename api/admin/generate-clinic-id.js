// Generate clinic ID endpoint
const jwt = require('jsonwebtoken');

// Verify admin token
const verifyAdmin = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  
  if (decoded.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return decoded;
};

// Function to generate clinic ID from clinic name
const generateClinicId = (clinicName) => {
  if (!clinicName) return '';
  
  // Remove common words and clean the name
  const cleanName = clinicName
    .replace(/\b(dr|dra|doctor|doctora|clinic|clinica|medical|center|centro)\b/gi, '')
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .trim()
    .split(/\s+/) // Split by spaces
    .filter(word => word.length > 0); // Remove empty strings
  
  if (cleanName.length === 0) {
    return 'CLINIC001';
  }
  
  // Take first 3 letters of each significant word, up to 6 characters total
  let id = '';
  for (let i = 0; i < cleanName.length && id.length < 6; i++) {
    const word = cleanName[i];
    const lettersToTake = Math.min(3, 6 - id.length);
    id += word.substring(0, lettersToTake).toUpperCase();
  }
  
  // Ensure minimum length of 3 characters
  if (id.length < 3) {
    id = id.padEnd(3, 'X');
  }
  
  return id;
};

module.exports = async function handler(req, res) {
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
    // Verify admin access
    verifyAdmin(req);
    
    const { clinicName } = req.query;
    
    if (!clinicName) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name is required'
      });
    }

    const generatedId = generateClinicId(clinicName);
    
    res.json({
      success: true,
      clinicId: generatedId,
      originalName: clinicName
    });

  } catch (error) {
    console.error('Generate clinic ID error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Admin access required') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
