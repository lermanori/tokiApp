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
import { testDatabaseConnection, setDatabaseTimezone, pool } from './config/database';
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
import pushRoutes from './routes/push';
import invitationRoutes from './routes/invitations';
import reportsRoutes from './routes/reports';
import { startNotificationScheduler } from './services/notificationScheduler';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './mcp/server';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8081", "http://localhost:8082", "file://",'http://localhost:6274'],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const PORT = process.env.PORT || 3002;

// MCP server over HTTP (Streamable HTTP transport)
const mcpServer = createMCPServer();
const mcpTransport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // stateless mode
  enableJsonResponse: true,
});

// Connect MCP server to transport (no await needed)
void mcpServer.connect(mcpTransport);

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
    'http://localhost:6274'
  ];
  
  // Log the origin for debugging
  if (origin) {
    logger.info(`[CORS] Checking origin: ${origin}`);
  } else {
    logger.info('[CORS] Request with no origin (allowing)');
  }
  
  if (!origin) return callback(null, true);
  
  const isAllowed = allowList.some(entry => {
    if (typeof entry === 'string') return origin === entry;
    return entry.test(origin);
  });
  
  if (isAllowed) {
    logger.info(`[CORS] Origin allowed: ${origin}`);
    return callback(null, true);
  }
  
  // Log blocked origin so you can add it to allowList
  logger.warn(`[CORS] Origin blocked: ${origin} - Add this to allowList if needed`);
  return callback(new Error('Not allowed by CORS'));
};

const corsMiddleware = cors({
  origin: originFunction,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Add OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cache-Control', 'User-Agent'], // Add common headers
  exposedHeaders: ['Content-Type', 'Content-Length'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
});

// Logging middleware for MCP - placed BEFORE CORS to catch all requests
app.use('/api/mcp', (req, res, next) => {
  const requestedHeaders = req.headers['access-control-request-headers'];
  const requestedMethod = req.headers['access-control-request-method'];
  
  // Log EVERY request to MCP endpoint with detailed info
  console.log(`[MCP] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  console.log(`[MCP] Requested Headers: ${requestedHeaders || 'none'}`);
  console.log(`[MCP] Requested Method: ${requestedMethod || 'none'}`);
  
  logger.info(`[MCP] ===== ${req.method} ${req.path} =====`, {
    method: req.method,
    path: req.path,
    url: req.url,
    origin: req.headers.origin,
    requestedMethod,
    requestedHeaders: requestedHeaders ? requestedHeaders.split(',').map((h: string) => h.trim()) : 'none',
    'content-type': req.headers['content-type'],
    'accept': req.headers['accept'],
    body: req.body,
    'all-headers': req.headers,
  });
  next();
});

// Custom CORS middleware for MCP that dynamically allows ALL requested headers
const mcpCorsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const allowList: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:8081',
    'http://localhost:8082',
    'https://tokiapp.netlify.app',
    /https:\/\/.*\.netlify\.app$/,
    'https://toki-app.com',
    /https:\/\/.*\.railway\.app$/,
    'http://localhost:6274'
  ];
  
  if (origin) {
    const isAllowed = allowList.some(entry => {
      if (typeof entry === 'string') return origin === entry;
      return entry.test(origin);
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    const requestedHeaders = req.headers['access-control-request-headers'];
    const requestedMethod = req.headers['access-control-request-method'];
    
    // Allow the requested method
    if (requestedMethod) {
      res.setHeader('Access-Control-Allow-Methods', requestedMethod);
    } else {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    
    // Dynamically allow ALL requested headers
    if (requestedHeaders) {
      const headers = requestedHeaders.split(',').map((h: string) => h.trim());
      console.log(`[MCP CORS] Preflight: Allowing requested headers: ${headers.join(', ')}`);
      res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
    } else {
      // Fallback to common headers
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    }
    
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(200).end();
    return;
  }
  
  // For non-OPTIONS requests, set headers but continue
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  const requestedHeaders = req.headers['access-control-request-headers'];
  if (requestedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }
  
  next();
};

// Log CORS response headers after CORS middleware processes
app.use('/api/mcp', (req, res, next) => {
  res.on('finish', () => {
    if (req.method === 'OPTIONS') {
      logger.info('[MCP CORS] Preflight response sent:', {
        statusCode: res.statusCode,
        'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
        'access-control-allow-methods': res.getHeader('access-control-allow-methods'),
        'access-control-allow-headers': res.getHeader('access-control-allow-headers'),
        'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      });
    }
  });
  next();
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

// Root endpoint for health checks (Railway and other services)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.13'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.13'
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
app.use('/api/push', corsMiddleware, pushRoutes);
app.use('/api/invitations', corsMiddleware, invitationRoutes);
app.use('/api/reports', corsMiddleware, reportsRoutes);

// MCP HTTP endpoint (Streamable HTTP transport)
// Route base: /api/mcp/toki and /api/mcp/toki/*
// Note: Token validation happens in individual tool handlers, not here
// This allows initial connection/handshake to work without token
app.all('/api/mcp/toki', mcpCorsMiddleware, (req, res) => {
  logger.info(`[MCP] Request received: ${req.method} ${req.path}`, {
    method: req.method,
    body: req.body,
    headers: req.headers,
    'all-headers': Object.keys(req.headers),
  });
  
  // Let the MCP transport handle the request directly
  // It will parse the JSON-RPC request and route to appropriate handlers
  void mcpTransport.handleRequest(req as any, res as any, req.body).catch((error) => {
    logger.error('[MCP] Transport error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      });
    }
  });
});

app.all('/api/mcp/toki/*', mcpCorsMiddleware, (req, res) => {
  logger.info(`[MCP] Request received: ${req.method} ${req.path}`, {
    method: req.method,
    body: req.body,
    headers: req.headers,
  });
  
  // Let the MCP transport handle the request directly
  void mcpTransport.handleRequest(req as any, res as any, req.body).catch((error) => {
    logger.error('[MCP] Transport error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      });
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Toki API is running!',
    version: '1.0.13',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      tokis: '/api/tokis',
      messages: '/api/messages',
      connections: '/api/connections',
      ratings: '/api/ratings',
      blocks: '/api/blocks',
      mcp: '/api/mcp/toki'
    }
  });
});

// Debug: Log all requests to see what's coming in
app.use((req, res, next) => {
  if (req.path.includes('/api/mcp')) {
    logger.info(`[DEBUG] Request to: ${req.method} ${req.path}`, {
      origin: req.headers.origin,
      'content-type': req.headers['content-type'],
      body: req.body,
    });
  }
  next();
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket event handlers
io.on('connection', (socket) => {
  logger.info('🔌 User connected:', socket.id);
  
  let currentUserId: string | null = null; // Track user for this socket

  // Join user to their personal room
  socket.on('join-user', async (userId: string) => {
    const roomName = `user-${userId}`;
    socket.join(roomName);
    currentUserId = userId; // Store for disconnect tracking
    
    // Log connection event
    try {
      await pool.query(
        'INSERT INTO user_activity_logs (user_id, event_type) VALUES ($1, $2)',
        [userId, 'connect']
      );
      logger.debug(`📊 [ACTIVITY] Logged connect event for user ${userId}`);
    } catch (error) {
      logger.error('Error logging connect event:', error);
      // Don't fail the connection if logging fails
    }
    
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

  socket.on('disconnect', async () => {
    logger.info('🔌 User disconnected:', socket.id);
    
    // Log disconnect event if we have a user ID
    if (currentUserId) {
      try {
        await pool.query(
          'INSERT INTO user_activity_logs (user_id, event_type) VALUES ($1, $2)',
          [currentUserId, 'disconnect']
        );
        logger.debug(`📊 [ACTIVITY] Logged disconnect event for user ${currentUserId}`);
      } catch (error) {
        logger.error('Error logging disconnect event:', error);
        // Don't fail disconnect if logging fails
      }
    }
  });
});

// Start server
server.listen(Number(PORT), '0.0.0.0', async () => {
  logger.info(`🚀 Toki Backend Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 API base: http://localhost:${PORT}/api`);
  logger.info(`🔌 WebSocket server ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);

  // Test database connection and set timezone
  await testDatabaseConnection();
  await setDatabaseTimezone();

  // Start notification scheduler
  startNotificationScheduler();
});

export default app; 