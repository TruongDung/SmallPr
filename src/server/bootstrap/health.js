const redisCache = require('../cache/redis');
const { pool } = require('../db/client');
const { withTimeout } = require('../utils/timeout');

const buildHealthPayload = async (dbReady, cacheReady, { includeDependencies = false } = {}) => {
  const payload = {
    status: 'ok',
    service: process.env.SERVICE_NAME || 'task-manager-app',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  if (!includeDependencies) return payload;

  const dependencies = {
    database: { status: 'unknown' },
    redis: {
      status: redisCache.isEnabled() ? 'unknown' : 'disabled',
      enabled: redisCache.isEnabled(),
    },
  };

  try {
    await withTimeout(dbReady, 5000);
    await withTimeout(pool.query('SELECT 1'), 5000);
    dependencies.database.status = 'ok';
  } catch (error) {
    dependencies.database.status = 'error';
    dependencies.database.message = error.message;
    payload.status = 'error';
  }

  if (redisCache.isEnabled()) {
    try {
      await withTimeout(cacheReady, 5000);
      dependencies.redis.status = redisCache.isReady() ? 'ok' : 'degraded';
      if (!redisCache.isReady()) {
        dependencies.redis.message = 'Redis is configured but not connected';
      }
    } catch (error) {
      dependencies.redis.status = 'degraded';
      dependencies.redis.message = error.message;
    }
  }

  payload.dependencies = dependencies;
  return payload;
};

const registerHealthRoutes = (app, dbReady, cacheReady) => {
  app.get(['/healthz', '/health'], async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await buildHealthPayload(dbReady, cacheReady));
  });

  app.get(['/readyz', '/api/health'], async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const payload = await buildHealthPayload(dbReady, cacheReady, { includeDependencies: true });
    res.status(payload.status === 'ok' ? 200 : 503).json(payload);
  });
};

module.exports = { buildHealthPayload, registerHealthRoutes };
