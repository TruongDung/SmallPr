const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

const redisCache = require('../cache/redis');
const logger = require('../logger');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Normalize the client IP into a rate-limit key. ipKeyGenerator collapses IPv6
// addresses into a /64 subnet so a single client can't bypass limits by
// rotating addresses within its block (required by express-rate-limit v8).
const ipKey = (req) => ipKeyGenerator(req.ip);

// Rate limiting is per-process in-memory by default. When Redis is configured
// the limits become shared across all instances (important on serverless where
// each request can hit a different instance). If Redis is unavailable the
// limiter transparently falls back to the in-memory store.
const buildStore = (prefix) => {
  if (!redisCache.isEnabled()) return undefined;
  try {
    return new RedisStore({
      prefix,
      // node-redis v4+/v6 passthrough. redisCache.sendCommand resolves the
      // shared, already-connected client and degrades to null when down.
      sendCommand: (...args) => redisCache.sendCommand(...args),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Failed to create Redis rate-limit store; using in-memory store');
    return undefined;
  }
};

// Identify the caller by authenticated user when available, else by client IP.
// Behind Vercel/proxies, `trust proxy` is set so req.ip is the real client IP.
const keyByUserOrIp = (req) => {
  if (req.session?.userId) return `user:${req.session.userId}`;
  return ipKey(req);
};

const jsonLimitHandler = (message) => (req, res) => {
  logger.warn({
    ip: req.ip,
    userId: req.session?.userId || null,
    path: req.originalUrl,
    method: req.method,
  }, 'Rate limit exceeded');
  res.status(429).json({ error: message });
};

// Skip rate limiting entirely under tests and when explicitly disabled.
const isDisabled = () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

// Wrap a limiter so that a store error (e.g. a transient Redis outage) never
// 500s the request — it logs and lets the request through (fail-open). When the
// limit is hit, the limiter sends 429 directly and never calls next(), so this
// wrapper doesn't interfere with enforcement.
const failOpen = (limiter) => (req, res, next) => {
  limiter(req, res, (err) => {
    if (err) {
      logger.warn({ err }, 'Rate limiter error; allowing request (fail-open)');
    }
    next();
  });
};

const createRateLimiters = () => {
  const disabled = isDisabled();
  const passthrough = (req, res, next) => next();

  if (disabled) {
    return { apiLimiter: passthrough, authLimiter: passthrough, writeLimiter: passthrough };
  }

  // General API limiter: protects the whole /api surface from abuse/bursts.
  const apiLimiter = rateLimit({
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_API_WINDOW_MS, 15 * 60 * 1000),
    limit: parsePositiveInt(process.env.RATE_LIMIT_API_MAX, 600),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    handler: jsonLimitHandler('Too many requests. Please slow down and try again shortly.'),
    store: buildStore('rl:api:'),
  });

  // Strict limiter for authentication endpoints to throttle credential
  // stuffing / brute-force attempts. Keyed by IP and only counts failures.
  const authLimiter = rateLimit({
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
    limit: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: ipKey,
    // Don't penalize successful logins; only failed/!2xx responses count.
    skipSuccessfulRequests: true,
    handler: jsonLimitHandler('Too many attempts. Please wait a few minutes before trying again.'),
    store: buildStore('rl:auth:'),
  });

  // Tighter limiter for write operations (POST/PUT/PATCH/DELETE) to curb
  // automated mass-mutations while leaving generous room for normal use.
  const writeLimiter = rateLimit({
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS, 60 * 1000),
    limit: parsePositiveInt(process.env.RATE_LIMIT_WRITE_MAX, 120),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
    handler: jsonLimitHandler('Too many changes in a short time. Please slow down.'),
    store: buildStore('rl:write:'),
  });

  return { apiLimiter: failOpen(apiLimiter), authLimiter: failOpen(authLimiter), writeLimiter: failOpen(writeLimiter) };
};

module.exports = { createRateLimiters };
