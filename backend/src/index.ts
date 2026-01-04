import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, closeConnection } from './database/connection';
import authRoutes from './routes/auth';
import shopRoutes from './routes/shops';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req, res) => {
  const dbStatus = await testConnection();
  
  res.status(dbStatus ? 200 : 503).json({
    status: dbStatus ? 'ok' : 'degraded',
    message: 'Shopping Planner API is running',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);

app.get('/api', (_req, res) => {
  res.json({
    message: 'Shopping Planner API',
    version: '1.0.0',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeConnection();
  process.exit(0);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    
    // Test database connection on startup
    await testConnection();
  });
}

export default app;