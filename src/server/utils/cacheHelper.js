/**
 * Cache Helper Utilities
 * 
 * Provides reusable functions for cache key building and cache operations
 * with consistent patterns across the application.
 * 
 * @module utils/cacheHelper
 */

/**
 * Build a standardized cache key from components
 * 
 * @param {string[]} parts - Array of cache key components
 * @returns {string} Cache key with parts joined by colons
 * 
 * @example
 * buildCacheKey(['user', userId, 'tasks', 'v1'])
 * // Returns: "user:123:tasks:v1"
 */
const buildCacheKey = (parts) => {
  return parts
    .map(part => part === null || part === undefined ? 'null' : String(part))
    .map(part => encodeURIComponent(part))
    .join(':');
};

/**
 * Build cache key for user-specific resource lists
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {string} params.resource - Resource name (e.g., 'tasks', 'notes')
 * @param {string} params.version - Cache version (default: 'v1')
 * @param {Object} params.filters - Additional filter parameters
 * @returns {string} Cache key
 */
const buildUserResourceCacheKey = ({ userId, resource, version = 'v1', filters = {} }) => {
  const parts = ['user', userId, resource, version];
  
  // Add filter parameters in sorted order for consistency
  const filterKeys = Object.keys(filters).sort();
  for (const key of filterKeys) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(key, value);
    }
  }
  
  return buildCacheKey(parts);
};

/**
 * Send JSON response with cache headers
 * 
 * @param {Object} params
 * @param {Response} params.res - Express response object
 * @param {*} params.payload - Response payload
 * @param {string} params.cacheStatus - 'HIT', 'MISS', or 'BYPASS'
 * @param {number} params.ttl - Cache TTL in seconds (optional)
 * @param {string} params.cacheHeader - Custom cache header name (default: 'X-Cache-Status')
 */
const sendCachedJson = ({ res, payload, cacheStatus, ttl, cacheHeader = 'X-Cache-Status' }) => {
  res.set(cacheHeader, cacheStatus);
  
  if (ttl !== undefined) {
    res.set('X-Cache-TTL', String(ttl));
  }
  
  res.json(payload);
};

/**
 * Get data from cache or execute fallback function
 * Implements the cache-aside pattern
 * 
 * @param {Object} params
 * @param {Object} params.cache - Cache client
 * @param {string} params.key - Cache key
 * @param {Function} params.fetchFn - Async function to fetch data on cache miss
 * @param {number} params.ttl - Cache TTL in seconds
 * @returns {Promise<{data: *, cacheStatus: string}>}
 * 
 * @example
 * const result = await getCachedOrFetch({
 *   cache: redisCache,
 *   key: 'tasks:user:123',
 *   fetchFn: () => tasksService.getTasks(123),
 *   ttl: 300
 * });
 */
const getCachedOrFetch = async ({ cache, key, fetchFn, ttl }) => {
  // Try to get from cache
  if (cache?.getJson) {
    const cached = await cache.getJson(key);
    if (cached) {
      return { data: cached, cacheStatus: 'HIT' };
    }
  }
  
  // Cache miss - fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  let cacheStatus = 'MISS';
  if (cache?.setJson) {
    const written = await cache.setJson(key, data, ttl);
    cacheStatus = written ? 'MISS' : 'BYPASS';
  } else {
    cacheStatus = 'BYPASS';
  }
  
  return { data, cacheStatus };
};

/**
 * Invalidate cache keys matching a pattern
 * 
 * @param {Object} cache - Cache client
 * @param {string[]} keys - Array of cache keys to invalidate
 * @returns {Promise<number>} Number of keys invalidated
 */
const invalidateCacheKeys = async (cache, keys) => {
  if (!cache?.del || !keys || keys.length === 0) {
    return 0;
  }
  
  let invalidated = 0;
  for (const key of keys) {
    try {
      await cache.del(key);
      invalidated++;
    } catch (error) {
      // Log but don't throw - cache invalidation is not critical
      console.error(`Failed to invalidate cache key: ${key}`, error);
    }
  }
  
  return invalidated;
};

/**
 * Build cache invalidation keys for a user resource
 * Generates all cache key patterns that should be invalidated
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {string} params.resource - Resource name
 * @param {string} params.version - Cache version (default: 'v1')
 * @returns {string[]} Array of cache key patterns to invalidate
 */
const buildInvalidationKeys = ({ userId, resource, version = 'v1' }) => {
  // For now, return a single key pattern
  // In production, you might use Redis SCAN with patterns
  return [
    buildCacheKey(['user', userId, resource, version, '*']),
  ];
};

module.exports = {
  buildCacheKey,
  buildUserResourceCacheKey,
  sendCachedJson,
  getCachedOrFetch,
  invalidateCacheKeys,
  buildInvalidationKeys,
};
