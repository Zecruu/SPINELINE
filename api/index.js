// SpineLine API - Main Entry Point
// This file serves as the main API entry point for Vercel deployment

export default function handler(req, res) {
  res.status(200).json({
    message: 'SpineLine API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/auth/login',
      '/api/patients',
      '/api/appointments',
      '/api/import-export',
      '/api/secret-admin'
    ]
  });
}
