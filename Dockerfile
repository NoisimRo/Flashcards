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
RUN npm ci

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

# --- MODIFICARE 1: Nu setam NODE_ENV aici ---
# Il setam mai jos, pentru ca npm install sa nu fie afectat de el.

# Copiem package files
COPY package*.json ./

# --- MODIFICARE 2: Instalarea ---
# Adaugam --ignore-scripts pentru a nu rula scripturi care cer 'bash' sau 'python'
# npm ci --omit=dev face oricum treaba, indiferent de variabila NODE_ENV
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- MODIFICARE 3: Setam variabilele ACUM ---
# Acum e sigur sa trecem in modul productie
ENV NODE_ENV=production
ENV PORT=8080

# Copiem build-urile din stage-ul anterior
COPY --from=builder /app/dist ./dist

# Copiem schema bazei de date
COPY --from=builder /app/server/db ./server/db

# Security: rulăm ca user non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S flashcards -u 1001 -G nodejs

USER flashcards

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "dist/server/index.js"]
