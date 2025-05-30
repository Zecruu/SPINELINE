// Test auth endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'Auth test endpoint working!',
    method: req.method,
    url: req.url,
    path: req.query,
    timestamp: new Date().toISOString()
  });
}
