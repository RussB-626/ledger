// Main Express application entry point
// Per CLAUDE.md: TypeScript strict mode, all routes use { data, error } format

import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/users';
import transactionRoutes from './routes/transactions';
import referenceRoutes from './routes/references';
import backupRoutes from './routes/backups';
import { initializeBackupScheduler } from './scheduler/backupScheduler';
import { initializeDatabase } from './database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/users', transactionRoutes);
app.use('/api/users', referenceRoutes);
app.use('/api/users', backupRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database schema if needed
    await initializeDatabase();

    app.listen(PORT, async () => {
      console.log(`✓ Express server running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);

      // Initialize backup scheduler
      await initializeBackupScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
