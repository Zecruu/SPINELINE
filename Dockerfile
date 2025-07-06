# Minimal build for Railway - Skip client build for now
FROM node:18-alpine

WORKDIR /app

# Only install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server code only
COPY server/ ./server/

# Create a minimal client dist directory with basic HTML
RUN mkdir -p client/dist
RUN echo '<!DOCTYPE html><html><head><title>SpineLine</title></head><body><h1>SpineLine Server Running</h1><p>API available at /api/health</p></body></html>' > client/dist/index.html

# Create uploads directory
RUN mkdir -p server/uploads/patient-photos server/uploads/patient-documents

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the application
CMD ["node", "server/server.js"]
