import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './utils/logger';
// import runMigrations from './scripts/run-migrations';

// Load environment variables
dotenv.config();

// // Run migrations on startup (idempotent)
// runMigrations().catch(err => {
//   console.error('⚠️  Migration warning (continuing anyway):', err.message);
// });

// Import middleware and routes
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { testDatabaseConnection, setDatabaseTimezone } from './config/database';
import authRoutes from './routes/auth';
import tokiRoutes from './routes/tokis';
import connectionRoutes from './routes/connections';
import ratingRoutes from './routes/ratings';
import blockRoutes from './routes/blocks';
import messageRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import savedTokiRoutes from './routes/saved-tokis';
import profileImageRoutes from './routes/profile-images';
import tokiImageRoutes from './routes/toki-images';
import mapsRoutes from './routes/maps';
import healthRoutes from './routes/health';
import activityRoutes from './routes/activity';
import waitlistRoutes from './routes/waitlist';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8081", "http://localhost:8082", "file://"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration (apply ONLY to API routes; do not interfere with static/admin)
const originFunction: cors.CorsOptions['origin'] = function (origin, callback) {
  const allowList: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:8081',
    'http://localhost:8082',
    'https://tokiapp.netlify.app',
    /https:\/\/.*\.netlify\.app$/,
    'https://toki-app.com',
    /https:\/\/.*\.railway\.app$/,
  ];
  if (!origin) return callback(null, true);
  const isAllowed = allowList.some(entry => {
    if (typeof entry === 'string') return origin === entry;
    return entry.test(origin);
  });
  if (isAllowed) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
};

const corsMiddleware = cors({
  origin: originFunction,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve admin panel static files (React build)
const adminBuildPath = path.join(__dirname, '../admin-panel/build');
app.use('/admin', express.static(adminBuildPath));

// Serve favicon for root requests (admin build's favicon)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'favicon.ico'));
});

// Serve admin panel HTML for all routes (React Router handles routing)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Make io available to routes
app.set('io', io);

// API routes
app.use('/api/auth', corsMiddleware, authRoutes);
app.use('/api/tokis', corsMiddleware, tokiRoutes);
app.use('/api/messages', corsMiddleware, messageRoutes);
app.use('/api/connections', corsMiddleware, connectionRoutes);
app.use('/api/blocks', corsMiddleware, blockRoutes);
app.use('/api/admin', corsMiddleware, adminRoutes);
app.use('/api/notifications', corsMiddleware, notificationRoutes);
app.use('/api/ratings', corsMiddleware, ratingRoutes);
app.use('/api/saved-tokis', corsMiddleware, savedTokiRoutes);
app.use('/api/profile-images', corsMiddleware, profileImageRoutes);
app.use('/api/toki-images', corsMiddleware, tokiImageRoutes);
app.use('/api/maps', corsMiddleware, mapsRoutes);
app.use('/api/health', corsMiddleware, healthRoutes);
app.use('/api/activity', corsMiddleware, activityRoutes);
app.use('/api/waitlist', corsMiddleware, waitlistRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'Toki API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tokis: '/api/tokis',
      messages: '/api/messages',
      connections: '/api/connections',
      ratings: '/api/ratings',
      blocks: '/api/blocks'
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket event handlers
io.on('connection', (socket) => {
  logger.info('🔌 User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user', (userId: string) => {
    const roomName = `user-${userId}`;
    socket.join(roomName);
    const roomMembers = io.sockets.adapter.rooms.get(roomName);
    logger.debug(`👤 [BACKEND] User ${userId} (socket: ${socket.id}) joined room: ${roomName}`);
    logger.debug(`👤 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
  });

  // Join conversation room
  socket.on('join-conversation', (conversationId: string) => {
    const roomName = `conversation-${conversationId}`;
    socket.join(roomName);
    const roomMembers = io.sockets.adapter.rooms.get(roomName);
    logger.debug(`💬 [BACKEND] User (socket: ${socket.id}) joined conversation room: ${roomName}`);
    logger.debug(`💬 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
  });

  // Join Toki group chat
  socket.on('join-toki', (tokiId: string) => {
    const roomName = `toki-${tokiId}`;
    socket.join(roomName);
    const roomMembers = io.sockets.adapter.rooms.get(roomName);
    logger.debug(`🏷️ [BACKEND] User (socket: ${socket.id}) joined Toki chat room: ${roomName}`);
    logger.debug(`🏷️ [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
  });

  // Leave a specific room
  socket.on('leave-room', (roomName: string) => {
    socket.leave(roomName);
    const roomMembers = io.sockets.adapter.rooms.get(roomName);
    logger.debug(`🚪 [BACKEND] User (socket: ${socket.id}) left room: ${roomName}`);
    logger.debug(`🚪 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
  });

  socket.on('disconnect', () => {
    logger.info('🔌 User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, async () => {
  logger.info(`🚀 Toki Backend Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 API base: http://localhost:${PORT}/api`);
  logger.info(`🔌 WebSocket server ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);

  // Test database connection and set timezone
  await testDatabaseConnection();
  await setDatabaseTimezone();
});

export default app; 