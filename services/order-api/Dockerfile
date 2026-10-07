
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./


RUN npm ci

COPY src/ ./src/

RUN npm run build

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

EXPOSE 8080

CMD ["node", "dist/index.js"]
