# Simple Dockerfile for Railway deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies using npm install instead of npm ci
RUN npm install
RUN cd server && npm install
RUN cd ../client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]
