const { createClient } = require('redis');

const { CACHE_TTL_SECONDS, REDIS_URL } = require('../config/env');

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
    console.warn('Redis cache error:', error?.message || error);
  });

  client.on('ready', () => {
    ready = true;
    console.log('Redis cache connected.');
  });

  client.on('end', () => {
    ready = false;
  });

  connectPromise = client.connect().catch((error) => {
    ready = false;
    console.warn('Redis cache unavailable; continuing without cache:', error?.message || error);
    return null;
  });

  return connectPromise;
};

const getJson = async (key) => {
  if (!isReady()) return null;

  try {
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Redis cache read failed:', error?.message || error);
    return null;
  }
};

const setJson = async (key, value, ttlSeconds = CACHE_TTL_SECONDS) => {
  if (!isReady()) return false;

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (error) {
    console.warn('Redis cache write failed:', error?.message || error);
    return false;
  }
};

const deleteByPattern = async (pattern) => {
  if (!isReady()) return 0;

  let deleted = 0;
  try {
    for await (const keys of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      const batch = Array.isArray(keys) ? keys : [keys];
      if (batch.length > 0) {
        deleted += await client.del(batch);
      }
    }
  } catch (error) {
    console.warn('Redis cache invalidation failed:', error?.message || error);
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
