// Main Express application entry point
// Per CLAUDE.md: TypeScript strict mode, all routes use { data, error } format

import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/users';
import transactionRoutes from './routes/transactions';
import referenceRoutes from './routes/references';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/users', transactionRoutes);
app.use('/api/users', referenceRoutes);

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
app.listen(PORT, () => {
  console.log(`✓ Express server running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
});
