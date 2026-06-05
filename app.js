/**
 * Task Manager Application - Main Entry Point
 * 
 * This file initializes the Express application with all necessary middleware,
 * services, and routes. It follows a layered architecture pattern:
 * 
 * 1. Core Dependencies - Database, cache, logging
 * 2. Bootstrap Layer - Application initialization
 * 3. Middleware Layer - Request processing pipeline
 * 4. Service Layer - Business logic
 * 5. Routes Layer - API endpoints
 * 
 * @module app
 * @see {@link ./ARCHITECTURE.md} for detailed architecture overview
 * @see {@link ./DEVELOPER_GUIDE.md} for development guidelines
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');

// ===== Core Dependencies =====
const redisCache = require('./src/server/cache/redis');
const { allAsync, getAsync, pool, queryAsync, runAsync } = require('./src/server/db/client');
const { initializeDatabase } = require('./src/server/db/initialize');
const logger = require('./src/server/logger');

// ===== Service Layer =====
const { createAuditLogService } = require('./src/server/services/auditLog.service');
const { createAuthService } = require('./src/server/services/auth/auth.service');
const { sendTaskAlertEmail, sendTaskSummaryEmail, sendVerificationEmail } = require('./src/server/services/email/email.service');

// ===== Middleware Layer =====
const { createAuthMiddleware } = require('./src/server/middleware/auth');

// ===== Bootstrap Layer =====
// These modules handle application initialization and configuration
const { createSessionMiddleware } = require('./src/server/config/session');
const { registerHealthRoutes } = require('./src/server/bootstrap/health');
const { createHttpServer, initializeSocketIO } = require('./src/server/bootstrap/sockets');
const {
  setupExpressMiddleware,
  setupLogging,
  setupProxyTrust,
  setupCacheInvalidation,
  setupDatabaseReadyCheck,
  setupStaticFiles,
  setupConfigEndpoint,
  setupFallbackRoute,
} = require('./src/server/bootstrap/middleware');
const { registerRoutes } = require('./src/server/bootstrap/routes');

// ===== Application Initialization =====

/**
 * Initialize Express application
 * Express is the web framework that handles HTTP requests/responses
 */
const app = express();

/**
 * Initialize core infrastructure
 * These Promises allow async initialization without blocking startup
 */
const cacheReady = redisCache.connectRedis();  // Connect to Redis cache
const dbReady = initializeDatabase();          // Connect to PostgreSQL and run migrations

// ===== Middleware Pipeline Setup =====
// Middleware processes requests in the order they're registered

/**
 * Express core middleware
 * - Body parsing (JSON, urlencoded)
 * - CORS configuration
 */
setupExpressMiddleware(app);

/**
 * HTTP request/response logging
 * Uses Pino for structured JSON logs
 */
setupLogging(app);

/**
 * Proxy trust configuration
 * Important for getting real client IP behind load balancers
 */
setupProxyTrust(app);

/**
 * Session management
 * Sessions stored in Redis for scalability
 */
const isProduction = process.env.NODE_ENV === 'production';
const sessionMiddleware = createSessionMiddleware(isProduction);
app.use(sessionMiddleware);

/**
 * Cache invalidation middleware
 * Automatically clears Redis cache on data mutations
 */
setupCacheInvalidation(app);

// ===== Real-time WebSocket Setup =====

/**
 * Create HTTP server and initialize Socket.IO
 * Socket.IO enables real-time bidirectional communication
 * Sessions are shared between HTTP and WebSocket connections
 */
const httpServer = createHttpServer(app);
const io = initializeSocketIO(httpServer, sessionMiddleware);

// ===== Health Checks =====

/**
 * Register health check endpoints
 * Used by monitoring tools and load balancers
 * - GET /health - Basic health check
 * - GET /health/ready - Database and cache readiness
 */
registerHealthRoutes(app, dbReady, cacheReady);

/**
 * Database readiness middleware
 * Ensures database is ready before handling requests
 */
setupDatabaseReadyCheck(app, dbReady, logger);

// ===== Static File Serving =====

/**
 * Serve static assets and built frontend
 * - /public - Static assets (images, fonts)
 * - /client/dist - Built React application
 */
setupStaticFiles(app);

// ===== Service Layer Initialization =====

/**
 * Create service instances with dependency injection
 * Services encapsulate business logic and database operations
 */
const { getUserById } = createAuthService({ getAsync });
const { adminRequired, authRequired } = createAuthMiddleware({ getUserById });
const auditLogs = createAuditLogService({ allAsync, runAsync });

// ===== API Routes Registration =====

/**
 * Register all API routes
 * Routes are organized by resource (tasks, auth, admin, etc.)
 * All dependencies are injected via the dependencies object
 */
registerRoutes(app, {
  adminRequired,      // Middleware: Requires admin role
  authRequired,       // Middleware: Requires authentication
  auditLogs,          // Service: Audit logging
  allAsync,           // DB: Query all rows
  getAsync,           // DB: Query single row
  queryAsync,         // DB: Raw query with result object
  runAsync,           // DB: Execute query (INSERT, UPDATE, DELETE)
  getUserById,        // Service: Get user by ID
  sendTaskAlertEmail, // Service: Send task alert emails
  sendTaskSummaryEmail, // Service: Send task summary emails
  sendVerificationEmail, // Service: Send verification emails
  bcrypt,             // Utility: Password hashing
  redisCache,         // Service: Redis cache operations
});

// ===== Public Configuration =====

/**
 * Public configuration endpoint
 * Exposes non-sensitive config to frontend (feature flags, etc.)
 */
setupConfigEndpoint(app);

// ===== SPA Fallback Route =====

/**
 * Catch-all route for Single Page Application
 * Serves index.html for client-side routing
 * Must be registered LAST after all API routes
 */
setupFallbackRoute(app);

// ===== Module Exports =====

/**
 * Export the Express app as default export for serverless platforms
 * 
 * Platforms like Vercel import this file as a serverless function and require
 * the default export to be a request handler. We export both as default and
 * as a named export to support both use cases.
 * 
 * Additional exports (httpServer, io, db, etc.) are attached as properties
 * so existing code using destructuring (e.g., in server.js) continues to work.
 * 
 * @example
 * // Serverless (Vercel)
 * import app from './app.js';
 * export default app;
 * 
 * @example
 * // Local server
 * const { app, httpServer, db } = require('./app');
 * httpServer.listen(3000);
 */
module.exports = app;
module.exports.app = app;
module.exports.cacheReady = cacheReady;
module.exports.db = pool;
module.exports.dbReady = dbReady;
module.exports.httpServer = httpServer;
module.exports.io = io;
