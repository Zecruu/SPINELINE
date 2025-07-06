# Ultra-simple build for Railway
FROM node:18-alpine

WORKDIR /app

# Install dependencies in separate steps to use Docker cache better
COPY package*.json ./
RUN npm install --production

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY client/package*.json ./client/
RUN cd client && npm install

# Copy source code
COPY . .

# Build client with memory limit
RUN cd client && NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Create uploads directory
RUN mkdir -p server/uploads/patient-photos server/uploads/patient-documents

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the application
CMD ["node", "server/server.js"]
