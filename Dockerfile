# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production && \
    npx prisma generate

# Copy source
COPY backend/src ./src/

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc --outDir dist

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Copy built app
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package.json ./package.json

# Create logs directory
RUN mkdir -p logs && chown -R appuser:nodejs /app

USER appuser

EXPOSE 3001

ENV NODE_ENV=production

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
