# ============================================
# FLASHCARDS - Multi-stage Dockerfile
# ============================================
# Optimizat pentru Google Cloud Run
# ============================================

# ============================================
# STAGE 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiem package files pentru caching eficient
COPY package*.json ./

# Instalăm toate dependențele (inclusiv devDependencies pentru build)
RUN npm install

# Copiem restul codului sursă
COPY . .

# Build frontend (Vite)
RUN npm run build

# Build server (TypeScript)
RUN npm run build:server

# ============================================
# STAGE 2: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Variabile de mediu default
ENV NODE_ENV=production
ENV PORT=8080

# Copiem package files
COPY package*.json ./

# Instalăm DOAR dependențele de producție
RUN npm install --omit=dev && npm cache clean --force

# Copiem build-urile din stage-ul anterior
COPY --from=builder /app/dist ./dist

# Copiem schema bazei de date (pentru inițializare)
COPY --from=builder /app/server/db ./server/db

# Security: rulăm ca user non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S flashcards -u 1001 -G nodejs

USER flashcards

# Expunem portul
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Pornim serverul
CMD ["node", "dist/server/index.js"]
