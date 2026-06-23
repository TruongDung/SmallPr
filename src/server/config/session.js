const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const { DATABASE_URL } = require('./env');
const logger = require('../logger');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(DATABASE_URL);

const sessionPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  max: parsePositiveInt(process.env.PG_SESSION_POOL_MAX, 1),
  idleTimeoutMillis: parsePositiveInt(process.env.PG_SESSION_IDLE_TIMEOUT_MS, 10000),
  connectionTimeoutMillis: parsePositiveInt(process.env.PG_SESSION_CONNECTION_TIMEOUT_MS, 30000),
  keepAlive: true,
  maxUses: parsePositiveInt(process.env.PG_SESSION_MAX_USES, 500),
  statement_timeout: parsePositiveInt(process.env.PG_SESSION_STATEMENT_TIMEOUT_MS, 15000),
});

sessionPool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected Postgres session pool error');
});

const sessionIdleTimeoutMs = parsePositiveInt(process.env.PG_SESSION_IDLE_TIMEOUT_MS, 10000);

let sessionKeepAliveTimer = null;

// Session lookups run on every request (before route handlers), so a cold
// session pool after an idle period directly slows the first response. Keep one
// connection warm for the long-lived server. No-op for local DB / serverless.
const startSessionKeepAlive = () => {
  if (sessionKeepAliveTimer || isLocalDatabase) return;
  const intervalMs = Math.max(5000, Math.floor(sessionIdleTimeoutMs * 0.8));
  sessionKeepAliveTimer = setInterval(() => {
    sessionPool.query('SELECT 1').catch((error) => {
      logger.warn({ err: error }, 'Session pool keep-alive ping failed');
    });
  }, intervalMs);
  if (typeof sessionKeepAliveTimer.unref === 'function') sessionKeepAliveTimer.unref();
  logger.info({ intervalMs }, 'Session pool keep-alive started');
};

const stopSessionKeepAlive = () => {
  if (sessionKeepAliveTimer) {
    clearInterval(sessionKeepAliveTimer);
    sessionKeepAliveTimer = null;
  }
};

const createSessionMiddleware = (isProduction = false) => {
  const store = new PgSession({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: true,
    disableTouch: true,
    pruneSessionInterval: false,
    errorLog: (...args) => {
      logger.error({ err: args.find((arg) => arg instanceof Error) }, 'Postgres session store error');
    },
  });

  return session({
    store,
    secret: process.env.SESSION_SECRET || 'please-provide-session-secret-env-var',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  });
};

module.exports = { createSessionMiddleware, startSessionKeepAlive, stopSessionKeepAlive };
