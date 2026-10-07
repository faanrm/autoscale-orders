# ==========================================
# Stage 1: TypeScript Build (Builder)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./

# Install all dependencies including devDependencies (TypeScript & types)
RUN npm ci

COPY src/ ./src/

# Compile TypeScript -> JavaScript into ./dist
RUN npm run build

# ==========================================
# Stage 2: Minimal Runtime Image (Runner)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Security: run under non-root standard user 'node' (UID 1000)
USER node

# Worker continuously consumes the Redis queue
CMD ["node", "dist/index.js"]
