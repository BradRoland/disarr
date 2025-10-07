FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discord -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R discord:nodejs /app
USER discord

# Health check - Discord bots don't need HTTP health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f "node.*src/index.js" || exit 1

# Start the bot
CMD ["node", "src/index.js"]


