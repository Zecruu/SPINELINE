// Simple test API endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'SpineLine API Test Endpoint',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}
