// Simple test endpoint for Vercel
module.exports = function handler(req, res) {
  res.status(200).json({
    message: 'Test endpoint working!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
