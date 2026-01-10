import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { checkConnection } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import decksRoutes from './routes/decks.js';
import studySessionsRoutes from './routes/studySessions.js';
import importExportRoutes from './routes/import-export.js';
import dailyChallengesRoutes from './routes/dailyChallenges.js';
import achievementsRoutes from './routes/achievements.js';
import reviewsRoutes from './routes/reviews.js';
import flagsRoutes from './routes/flags.js';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers - configured for SPA
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealthy = await checkConnection();
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/decks', decksRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/daily-challenges', dailyChallengesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/import', importExportRoutes);
app.use('/api/export', importExportRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/flags', flagsRoutes);

// ============================================
// STATIC FILES (Production)
// ============================================

if (config.nodeEnv === 'production') {
  // Serve static files from the React build
  const clientBuildPath = path.join(__dirname, '../client');
  app.use(express.static(clientBuildPath));

  // Handle React routing - send all non-API requests to index.html
  // Note: Express 5 requires {*path} syntax instead of *
  app.get('/{*path}', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler (only for API routes in production)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.method} ${req.path} nu există`,
    },
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Eroare internă de server',
    },
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🎴 Flashcards API Server              ║
╠════════════════════════════════════════════╣
║  Status:    Running                        ║
║  Port:      ${PORT}                            ║
║  Env:       ${config.nodeEnv.padEnd(28)}║
║  Database:  PostgreSQL                     ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
