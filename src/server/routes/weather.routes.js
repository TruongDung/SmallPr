const express = require('express');

const { WEATHER_PAGE_CACHE_TTL_SECONDS } = require('../config/env');
const logger = require('../logger');

const MAX_WEATHER_CITY_LENGTH = 120;

const normalizeWeatherCity = (body = {}) => {
  const name = String(body.name || '')
    .trim()
    .slice(0, MAX_WEATHER_CITY_LENGTH);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const weatherKey = String(
    body.weather_key || body.weatherKey || body.id || `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
  ).trim();

  if (!name || !weatherKey || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    name,
    latitude,
    longitude,
    weatherKey: weatherKey.slice(0, 80),
  };
};

const buildWeatherCitiesCacheKey = (userId) => `user:${userId}:weather-cities:v1`;

const sendCachedJson = ({ res, payload, cacheStatus }) => {
  res.set('X-Redis-Cache', cacheStatus);
  res.set('X-Weather-Cache-TTL', String(WEATHER_PAGE_CACHE_TTL_SECONDS));
  res.json(payload);
};

const createWeatherRouter = ({ allAsync, authRequired, cache, queryAsync, runAsync }) => {
  const router = express.Router();

  router.get('/weather-cities', authRequired, async (req, res) => {
    const cacheKey = buildWeatherCitiesCacheKey(req.session.userId);

    try {
      const cachedPayload = await cache?.getJson?.(cacheKey);
      if (cachedPayload) {
        return sendCachedJson({ res, payload: cachedPayload, cacheStatus: 'HIT' });
      }

      const cities = await allAsync(
        `SELECT id, weather_key, name, latitude, longitude
         FROM weather_cities
         WHERE user_id = ?
         ORDER BY LOWER(name), name`,
        [req.session.userId],
      );
      const payload = { cities };
      const wroteCache = await cache?.setJson?.(cacheKey, payload, WEATHER_PAGE_CACHE_TTL_SECONDS);
      sendCachedJson({ res, payload, cacheStatus: wroteCache ? 'MISS' : 'BYPASS' });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load weather cities');
      res.status(500).json({ error: 'Failed to load weather cities' });
    }
  });

  router.post('/weather-cities', authRequired, async (req, res) => {
    const city = normalizeWeatherCity(req.body);
    if (!city) {
      return res.status(400).json({ error: 'Valid city weather data is required' });
    }

    try {
      const result = await queryAsync(
        `INSERT INTO weather_cities (user_id, weather_key, name, latitude, longitude)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, weather_key)
         DO UPDATE SET
           name = EXCLUDED.name,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, weather_key, name, latitude, longitude`,
        [req.session.userId, city.weatherKey, city.name, city.latitude, city.longitude],
      );
      res.json({ city: result.rows[0] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save weather city');
      res.status(500).json({ error: 'Failed to save weather city' });
    }
  });

  router.delete('/weather-cities/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
      const result = await runAsync('DELETE FROM weather_cities WHERE id = ? AND user_id = ? RETURNING id', [
        id,
        req.session.userId,
      ]);

      if (!result.lastID) {
        return res.status(404).json({ error: 'Weather city not found' });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete weather city');
      res.status(500).json({ error: 'Failed to delete weather city' });
    }
  });

  return router;
};

module.exports = createWeatherRouter;
module.exports.buildWeatherCitiesCacheKey = buildWeatherCitiesCacheKey;
