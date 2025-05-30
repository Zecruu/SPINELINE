# Multi-stage build for SpineLine application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && \
    cd server && npm ci --only=production && \
    cd ../client && npm ci --only=production

# Build the client application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm ci && \
    cd server && npm ci && \
    cd ../client && npm ci

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 spineline

# Copy built application
COPY --from=deps --chown=spineline:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=spineline:nodejs /app/server/node_modules ./server/node_modules
COPY --from=builder --chown=spineline:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=spineline:nodejs /app/server ./server
COPY --chown=spineline:nodejs package*.json ./

# Create uploads directory
RUN mkdir -p server/uploads/patient-photos server/uploads/patient-documents
RUN chown -R spineline:nodejs server/uploads

# Switch to non-root user
USER spineline

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node server/healthcheck.js || exit 1

# Start the application
CMD ["node", "server/server.js"]
