# Simple single-stage build for Railway
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies
RUN npm install && \
    cd server && npm install && \
    cd ../client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Create uploads directory
RUN mkdir -p server/uploads/patient-photos server/uploads/patient-documents

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the application
CMD ["node", "server/server.js"]
