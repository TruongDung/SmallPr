require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Server: SocketIOServer } = require('socket.io');

const redisCache = require('./src/server/cache/redis');
const { allAsync, getAsync, pool, queryAsync, runAsync } = require('./src/server/db/client');
const { initializeDatabase } = require('./src/server/db/initialize');
const { createAuthService } = require('./src/server/services/auth/auth.service');
const { sendTaskAlertEmail, sendTaskSummaryEmail } = require('./src/server/services/email/email.service');
const { createAuthMiddleware } = require('./src/server/middleware/auth');
const realtime = require('./src/server/realtime');
const createAdminRouter = require('./src/server/routes/admin.routes');
const createAuthRouter = require('./src/server/routes/auth.routes');
const createCreditCardsRouter = require('./src/server/routes/creditCards.routes');
const createDailyQuoteRouter = require('./src/server/routes/dailyQuote.routes');
const createDashboardRouter = require('./src/server/routes/dashboard.routes');
const createNotesRouter = require('./src/server/routes/notes.routes');
const createTasksRouter = require('./src/server/routes/tasks.routes');
const createTransactionsRouter = require('./src/server/routes/transactions.routes');
const createWeatherRouter = require('./src/server/routes/weather.routes');

const app = express();
const cacheReady = redisCache.connectRedis();
const dbReady = initializeDatabase();

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

// Vercel terminates TLS at the edge and forwards plain HTTP to the function.
// Without this, Express marks the connection as "insecure" and refuses to send
// secure cookies, breaking sessions in production.
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'task-manager-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  },
});

app.use(sessionMiddleware);

app.use((req, res, next) => {
  const shouldInvalidate = req.path.startsWith('/api/')
    && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  if (shouldInvalidate) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400 && req.session?.userId) {
        redisCache.clearUserCache(req.session.userId);
      }
    });
  }

  next();
});

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: false },
});
realtime.setIo(io);

io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  const socketSession = socket.request?.session;
  const userId = socketSession?.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  socket.join(`user:${userId}`);
});

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ error: 'Database is not configured correctly' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const { getUserById } = createAuthService({ getAsync });
const { adminRequired, authRequired } = createAuthMiddleware({ getUserById });
const routeDependencies = {
  allAsync,
  getAsync,
  queryAsync,
  runAsync,
};

app.use('/api', createAuthRouter({
  bcrypt,
  getAsync,
  getUserById,
  runAsync,
}));

app.use('/api/credit-cards', createCreditCardsRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
}));

app.use('/api/transactions', createTransactionsRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
}));

app.use('/api', createTasksRouter({
  authRequired,
  allAsync,
  getAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
}));

app.use('/api', createDashboardRouter({
  authRequired,
  allAsync,
  cache: redisCache,
  getAsync,
  runAsync,
}));

app.use('/api', createDailyQuoteRouter());
app.use('/api', createWeatherRouter({
  authRequired,
  ...routeDependencies,
}));
app.use('/api', createNotesRouter({
  authRequired,
  emitToUser: realtime.emitToUser,
  ...routeDependencies,
}));
app.use('/api', createAdminRouter({
  adminRequired,
  bcrypt,
  allAsync,
  getAsync,
  runAsync,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
