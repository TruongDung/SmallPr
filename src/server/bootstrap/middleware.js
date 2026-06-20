const express = require('express');
const path = require('path');
const pinoHttp = require('pino-http');
const logger = require('../logger');
const redisCache = require('../cache/redis');

const setupExpressMiddleware = (app) => {
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));
};

const setupLogging = (app) => {
  app.use(pinoHttp({
    logger,
    customProps: (req) => ({
      userId: req.session?.userId || null,
    }),
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.path === '/favicon.ico',
    },
  }));
};

const setupProxyTrust = (app) => {
  // Vercel terminates TLS at the edge and forwards plain HTTP to the function.
  // Without this, Express marks the connection as "insecure" and refuses to send
  // secure cookies, breaking sessions in production.
  app.set('trust proxy', 1);
};

const setupCacheInvalidation = (app) => {
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
};

const setupDatabaseReadyCheck = (app, dbReady, logger) => {
  app.use(async (req, res, next) => {
    try {
      await dbReady;
      next();
    } catch (error) {
      logger.error({ err: error }, 'Database initialization failed');
      res.status(500).json({ error: 'Database is not configured correctly' });
    }
  });
};

const setupStaticFiles = (app) => {
  app.use(express.static(path.join(__dirname, '../../..', 'public')));
};

const setupConfigEndpoint = (app, { featureFlags } = {}) => {
  app.get('/api/config/public', async (req, res) => {
    res.set('Cache-Control', 'no-store');

    // Feature flags are best-effort: never let a settings read failure break
    // the config endpoint that the whole frontend depends on at boot.
    let features = { weatherEnabledForDemo: true };
    if (featureFlags?.getPublicFlags) {
      try {
        features = await featureFlags.getPublicFlags();
      } catch (error) {
        logger.error({ err: error }, 'Failed to load public feature flags');
      }
    }

    res.json({
      sentry: {
        dsn: process.env.PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        release: process.env.SENTRY_RELEASE || '',
        tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
        replaysSessionSampleRate: Number.parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0'),
        replaysOnErrorSampleRate: Number.parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1'),
      },
      posthog: {
        apiKey: process.env.PUBLIC_POSTHOG_API_KEY || process.env.POSTHOG_API_KEY || '',
        apiHost: process.env.PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      },
      features,
    });
  });
};

const setupFallbackRoute = (app) => {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '../../..', 'public', 'index.html'));
  });
};

module.exports = {
  setupExpressMiddleware,
  setupLogging,
  setupProxyTrust,
  setupCacheInvalidation,
  setupDatabaseReadyCheck,
  setupStaticFiles,
  setupConfigEndpoint,
  setupFallbackRoute,
};
