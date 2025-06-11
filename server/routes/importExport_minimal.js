const express = require('express');
const router = express.Router();

console.log('✅ MINIMAL ImportExport route loading...');

// Minimal test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'MINIMAL Import/Export API working', 
    version: '8.0.0',
    timestamp: new Date().toISOString()
  });
});

// Minimal upload route
router.post('/upload', (req, res) => {
  res.json({ 
    message: 'MINIMAL upload working', 
    version: '8.0.0' 
  });
});

console.log('✅ MINIMAL ImportExport route loaded successfully');

module.exports = router;
