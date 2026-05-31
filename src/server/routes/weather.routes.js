const express = require('express');

const MAX_WEATHER_CITY_LENGTH = 120;

const normalizeWeatherCity = (body = {}) => {
  const name = String(body.name || '').trim().slice(0, MAX_WEATHER_CITY_LENGTH);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const weatherKey = String(body.weather_key || body.weatherKey || body.id || `${latitude.toFixed(3)},${longitude.toFixed(3)}`).trim();

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

const createWeatherRouter = ({ allAsync, authRequired, queryAsync, runAsync }) => {
  const router = express.Router();

  router.get('/weather-cities', authRequired, async (req, res) => {
    try {
      const cities = await allAsync(
        `SELECT id, weather_key, name, latitude, longitude
         FROM weather_cities
         WHERE user_id = ?
         ORDER BY LOWER(name), name`,
        [req.session.userId]
      );
      res.json({ cities });
    } catch (error) {
      console.error(error);
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
        [req.session.userId, city.weatherKey, city.name, city.latitude, city.longitude]
      );
      res.json({ city: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save weather city' });
    }
  });

  router.delete('/weather-cities/:id', authRequired, async (req, res) => {
    const { id } = req.params;

    try {
      const result = await runAsync(
        'DELETE FROM weather_cities WHERE id = ? AND user_id = ? RETURNING id',
        [id, req.session.userId]
      );

      if (!result.lastID) {
        return res.status(404).json({ error: 'Weather city not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete weather city' });
    }
  });

  return router;
};

module.exports = createWeatherRouter;
