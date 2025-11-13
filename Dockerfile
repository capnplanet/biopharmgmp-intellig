# Multi-stage build for production deployment
# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Create directories for data persistence
RUN mkdir -p /app/data/audit /app/data/metrics /app/data/archive && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose ports
# 4000: Frontend (if running preview)
# 5000: Backend API
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error('Health check failed')})"

# Default environment variables
ENV NODE_ENV=production \
    PORT=5000

# Start the backend API server
CMD ["node", "server/index.mjs"]
