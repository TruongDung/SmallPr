const { createClient } = require('redis');

const { CACHE_TTL_SECONDS, REDIS_URL } = require('../config/env');
const logger = require('../logger');

let client = null;
let ready = false;
let connectPromise = null;

const isEnabled = () => Boolean(REDIS_URL);
const isReady = () => ready && client?.isOpen;

const connectRedis = async () => {
  if (!isEnabled()) return null;
  if (connectPromise) return connectPromise;

  client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on('error', (error) => {
    ready = false;
    logger.warn({ err: error }, 'Redis cache error');
  });

  client.on('ready', () => {
    ready = true;
    logger.info('Redis cache connected');
  });

  client.on('end', () => {
    ready = false;
  });

  connectPromise = client.connect().catch((error) => {
    ready = false;
    logger.warn({ err: error }, 'Redis cache unavailable; continuing without cache');
    return null;
  });

  return connectPromise;
};

// On serverless (e.g. Vercel) a request often arrives before the 'ready'
// event has fired on a cold/frozen instance, so the synchronous `ready` flag
// is still false and every read/write would silently bail — defeating the
// cache entirely. Awaiting connectRedis() (idempotent: returns the in-flight
// connect promise) lets the socket finish connecting, then we gate on the
// live `client.isOpen` instead of the lagging flag.
const ensureClient = async () => {
  if (!isEnabled()) return null;
  await connectRedis();
  return client?.isOpen ? client : null;
};

const getJson = async (key) => {
  const c = await ensureClient();
  if (!c) return null;

  try {
    const cached = await c.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.warn({ err: error }, 'Redis cache read failed');
    return null;
  }
};

const setJson = async (key, value, ttlSeconds = CACHE_TTL_SECONDS) => {
  const c = await ensureClient();
  if (!c) return false;

  try {
    await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'Redis cache write failed');
    return false;
  }
};

const deleteByPattern = async (pattern) => {
  const c = await ensureClient();
  if (!c) return 0;

  let deleted = 0;
  try {
    for await (const keys of c.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      const batch = Array.isArray(keys) ? keys : [keys];
      if (batch.length > 0) {
        deleted += await c.del(batch);
      }
    }
  } catch (error) {
    logger.warn({ err: error }, 'Redis cache invalidation failed');
  }

  return deleted;
};

const clearUserCache = (userId) => deleteByPattern(`user:${userId}:*`);

module.exports = {
  clearUserCache,
  connectRedis,
  getJson,
  isEnabled,
  isReady,
  setJson,
};
