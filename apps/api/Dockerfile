# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/common/package.json ./packages/common/
COPY packages/otlp/package.json ./packages/otlp/

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM gcr.io/distroless/nodejs18-debian12:latest

# Create app user
USER 1000:1000

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=1000:1000 /app/apps/api/dist ./dist
COPY --from=builder --chown=1000:1000 /app/packages/common/dist ./node_modules/@fusionflow/common
COPY --from=builder --chown=1000:1000 /app/packages/otlp/dist ./node_modules/@fusionflow/otlp

# Copy package.json for runtime dependencies
COPY --from=builder --chown=1000:1000 /app/apps/api/package.json ./

# Install only production dependencies
RUN npm install --only=production --ignore-scripts

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dist/index.js"] 