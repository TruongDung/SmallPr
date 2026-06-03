require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');

const redisCache = require('./src/server/cache/redis');
const { allAsync, getAsync, pool, queryAsync, runAsync } = require('./src/server/db/client');
const { initializeDatabase } = require('./src/server/db/initialize');
const { createAuditLogService } = require('./src/server/services/auditLog.service');
const { createAuthService } = require('./src/server/services/auth/auth.service');
const { sendTaskAlertEmail, sendTaskSummaryEmail, sendVerificationEmail } = require('./src/server/services/email/email.service');
const { createAuthMiddleware } = require('./src/server/middleware/auth');
const logger = require('./src/server/logger');

// Bootstrap modules
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

// Initialize app
const app = express();
const cacheReady = redisCache.connectRedis();
const dbReady = initializeDatabase();

// Setup middleware
setupExpressMiddleware(app);
setupLogging(app);
setupProxyTrust(app);

// Setup session
const isProduction = process.env.NODE_ENV === 'production';
const sessionMiddleware = createSessionMiddleware(isProduction);
app.use(sessionMiddleware);

// Setup cache invalidation
setupCacheInvalidation(app);

// Setup HTTP server and Socket.IO
const httpServer = createHttpServer(app);
const io = initializeSocketIO(httpServer, sessionMiddleware);

// Register health check routes
registerHealthRoutes(app, dbReady, cacheReady);

// Setup database check middleware
setupDatabaseReadyCheck(app, dbReady, logger);

// Setup static files
setupStaticFiles(app);

// Create service instances
const { getUserById } = createAuthService({ getAsync });
const { adminRequired, authRequired } = createAuthMiddleware({ getUserById });
const auditLogs = createAuditLogService({ allAsync, runAsync });

// Register API routes
registerRoutes(app, {
  adminRequired,
  authRequired,
  auditLogs,
  allAsync,
  getAsync,
  queryAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
  sendVerificationEmail,
  bcrypt,
  redisCache,
});

// Setup public config endpoint
setupConfigEndpoint(app);

// Setup fallback route for SPA
setupFallbackRoute(app);

// Export the Express app as the module's default so platforms like Vercel,
// which import this file as a serverless function and require the default
// export to be a request handler (or server), get a valid `(req, res)` handler.
// The remaining values are attached as properties so existing destructuring
// importers (e.g. server.js) keep working.
module.exports = app;
module.exports.app = app;
module.exports.cacheReady = cacheReady;
module.exports.db = pool;
module.exports.dbReady = dbReady;
module.exports.httpServer = httpServer;
module.exports.io = io;

// Export the Express app as the module's default so platforms like Vercel,
// which import this file as a serverless function and require the default
// export to be a request handler (or server), get a valid `(req, res)` handler.
// The remaining values are attached as properties so existing destructuring
// importers (e.g. server.js) keep working.
module.exports = app;
module.exports.app = app;
module.exports.cacheReady = cacheReady;
module.exports.db = pool;
module.exports.dbReady = dbReady;
module.exports.httpServer = httpServer;
module.exports.io = io;
