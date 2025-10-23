import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import logger from './utils/logger.js';
import { initDatabase } from './utils/database.js';

// Import routes
import cameraRoutes from './routes/cameras.js';
import streamRoutes from './routes/stream.js';
import ptzRoutes from './routes/ptz.js';
import recordingRoutes from './routes/recordings.js';
import discoveryRoutes from './routes/discovery.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/ptz', ptzRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/discovery', discoveryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized successfully');

    // Start HTTP server
    const server = createServer(app);
    server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
      logger.info(`🚀 VMS Backend Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api`);
    });

    // Start WebSocket server for real-time updates
    const wss = new WebSocketServer({ port: WS_PORT });
    wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');
      
      ws.on('message', (message) => {
        logger.debug('Received WebSocket message:', message.toString());
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }));
    });

    logger.info(`🔌 WebSocket Server running on port ${WS_PORT}`);

    // Store WebSocket server globally for broadcasting
    global.wss = wss;

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
