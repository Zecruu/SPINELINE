#!/bin/bash

# SpineLine Deployment Script
# This script prepares the application for deployment

set -e

echo "🚀 Starting SpineLine deployment preparation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm ci --only=production
cd ..

# Install client dependencies and build
echo "📦 Installing client dependencies..."
cd client
npm ci
echo "🏗️  Building client application..."
npm run build
cd ..

# Create production environment file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating production environment file..."
    cp server/.env.example server/.env
    echo "⚠️  Please update server/.env with your production values!"
fi

# Create uploads directories
echo "📁 Creating upload directories..."
mkdir -p server/uploads/patient-photos
mkdir -p server/uploads/patient-documents

# Set proper permissions for uploads
chmod 755 server/uploads
chmod 755 server/uploads/patient-photos
chmod 755 server/uploads/patient-documents

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your production environment variables"
echo "2. Deploy to your chosen platform:"
echo "   - Render: Push to GitHub and connect your repository"
echo "   - Vercel: Run 'vercel --prod' or connect your GitHub repository"
echo "   - Docker: Run 'docker build -t spineline .' then deploy the image"
echo ""
echo "🔗 Important URLs to configure:"
echo "   - MONGO_URI: Your MongoDB Atlas connection string"
echo "   - JWT_SECRET: A secure random string for JWT signing"
echo "   - CORS_ORIGIN: Your frontend domain URL"
