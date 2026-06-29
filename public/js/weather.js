// Weather tab and daily quote widget.
(function () {
  const create = ({ request, t, showStatusToast, getCurrentUser, getLanguage, escapeHtml }) => {
    const quoteWidget = document.getElementById('quote-widget');
    const weatherForm = document.getElementById('weather-form');
    const weatherCityInput = document.getElementById('weather-city-input');
    const weatherList = document.getElementById('weather-list');
    const weatherMessage = document.getElementById('weather-message');

    const DAILY_QUOTE_API_URL = '/api/daily-quote';
    const DAILY_QUOTE_CACHE_KEY = 'task-manager-daily-quote';
    const WEATHER_CACHE_PREFIX = 'task-manager-weather-cities';
    const DEFAULT_DAILY_QUOTE = {
      text: "Loading today's quote...",
      author: '',
    };

    let isBound = false;

    const getDailyQuoteDateKey = () => new Date().toISOString().slice(0, 10);

    const getDailyQuoteCard = (quote) => {
      const author = quote.author || t('notAvailable');
      return `
        <section class="daily-quote" aria-label="${escapeHtml(t('dailyQuote'))}">
          <div class="daily-quote-label">${escapeHtml(t('dailyQuote'))}</div>
          <p>${escapeHtml(quote.text)}</p>
          <div class="daily-quote-author">${escapeHtml(t('quoteAuthor'))}: ${escapeHtml(author)}</div>
        </section>
      `;
    };

    const getCachedDailyQuote = () => {
      try {
        const cached = JSON.parse(localStorage.getItem(DAILY_QUOTE_CACHE_KEY));
        if (cached?.date === getDailyQuoteDateKey() && cached.quote?.text) {
          return cached.quote;
        }
      } catch {
        localStorage.removeItem(DAILY_QUOTE_CACHE_KEY);
      }
      return null;
    };

    const saveCachedDailyQuote = (quote) => {
      localStorage.setItem(
        DAILY_QUOTE_CACHE_KEY,
        JSON.stringify({
          date: getDailyQuoteDateKey(),
          quote,
        }),
      );
    };

    const fetchDailyQuote = async () => {
      const response = await fetch(DAILY_QUOTE_API_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Quote request failed');
      }

      const data = await response.json();
      const quote = data.quote || (Array.isArray(data) ? data[0] : data);
      return {
        text: quote?.q || quote?.quote || quote?.text || DEFAULT_DAILY_QUOTE.text,
        author: quote?.a || quote?.author || '',
      };
    };

    const loadDailyQuote = async () => {
      if (!quoteWidget) return;

      const cachedQuote = getCachedDailyQuote();
      if (cachedQuote) {
        quoteWidget.innerHTML = getDailyQuoteCard(cachedQuote);
        return;
      }

      try {
        const quote = await fetchDailyQuote();
        saveCachedDailyQuote(quote);
        quoteWidget.innerHTML = getDailyQuoteCard(quote);
      } catch (error) {
        console.error('Failed to load daily quote:', error);
        quoteWidget.innerHTML = getDailyQuoteCard({
          text: "Unable to load today's quote.",
          author: '',
        });
      }
    };

    const renderQuoteWidget = () => {
      if (!quoteWidget) return;
      quoteWidget.innerHTML = getDailyQuoteCard(DEFAULT_DAILY_QUOTE);
      quoteWidget.classList.remove('hidden');
      loadDailyQuote();
    };

    const hideQuoteWidget = () => {
      quoteWidget?.classList.add('hidden');
    };

    const getLegacySavedWeatherCitiesKey = () => `${WEATHER_CACHE_PREFIX}-${getCurrentUser()?.id || 'guest'}`;

    const loadLegacySavedWeatherCities = () => {
      try {
        return JSON.parse(localStorage.getItem(getLegacySavedWeatherCitiesKey())) || [];
      } catch {
        return [];
      }
    };

    const migrateLegacyWeatherCities = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const migrationKey = `task-manager-weather-db-migrated-${currentUser.id}`;
      if (sessionStorage.getItem(migrationKey)) return;

      const legacyCities = loadLegacySavedWeatherCities().filter(
        (city) => city && city.latitude !== undefined && city.longitude !== undefined,
      );

      if (!legacyCities.length) {
        sessionStorage.setItem(migrationKey, 'true');
        return;
      }

      await Promise.all(
        legacyCities.map((city) =>
          request('/api/weather-cities', {
            method: 'POST',
            body: JSON.stringify({
              weather_key: city.weather_key || city.id,
              name: city.name,
              latitude: city.latitude,
              longitude: city.longitude,
            }),
          }),
        ),
      );

      localStorage.removeItem(getLegacySavedWeatherCitiesKey());
      sessionStorage.setItem(migrationKey, 'true');
    };

    const loadSavedWeatherCities = async () => {
      await migrateLegacyWeatherCities();
      const result = await request('/api/weather-cities');
      if (result.error) {
        throw new Error(result.error);
      }
      return result.cities || [];
    };

    const saveSavedWeatherCity = async (city) => {
      const result = await request('/api/weather-cities', {
        method: 'POST',
        body: JSON.stringify(city),
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.city;
    };

    const deleteSavedWeatherCity = async (id) => {
      const result = await request(`/api/weather-cities/${id}`, {
        method: 'DELETE',
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    };

    const normalizeWeatherCityName = (match) => [match.name, match.country].filter(Boolean).join(', ');

    const fetchWeatherCityMatch = async (city) => {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      if (!response.ok) {
        throw new Error('City request failed');
      }

      const data = await response.json();
      return data.results?.[0] || null;
    };

    const fetchWeatherData = async (latitude, longitude) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`,
      );
      if (!response.ok) {
        throw new Error('Weather request failed');
      }
      return response.json();
    };

    const getWeatherIcon = (weatherCode) => {
      if (weatherCode === 0 || weatherCode === 1) return 'Clear';
      if (weatherCode === 2 || weatherCode === 3) return 'Clouds';
      if (weatherCode === 45 || weatherCode === 48) return 'Fog';
      if (weatherCode >= 51 && weatherCode <= 67) return 'Rain';
      if (weatherCode >= 71 && weatherCode <= 77) return 'Snow';
      if (weatherCode >= 80 && weatherCode <= 82) return 'Showers';
      if (weatherCode >= 85 && weatherCode <= 86) return 'Snow';
      if (weatherCode >= 95) return 'Storm';
      return 'Weather';
    };

    const getWeatherCard = (city, weatherData) => {
      const current = weatherData.current || {};
      const tempF = Math.round(Number(current.temperature_2m));
      const tempC = Math.round(((tempF - 32) * 5) / 9);
      const timezone = weatherData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = new Date().toLocaleString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      return `
        <article class="weather-card weather-${escapeHtml(getWeatherIcon(current.weather_code)).toLowerCase()}">
          <div class="weather-animation"></div>
          <div class="weather-card-top">
            <div>
              <div class="weather-card-kicker">${escapeHtml(getWeatherIcon(current.weather_code))}</div>
              <h4>${escapeHtml(city.name || t('weather'))}</h4>
            </div>
            <button class="weather-remove" type="button" data-weather-id="${escapeHtml(city.id)}" aria-label="${escapeHtml(t('delete'))} ${escapeHtml(city.name || t('weather'))}" title="${escapeHtml(t('delete'))}">x</button>
          </div>
          <div class="weather-temp">${Number.isFinite(tempF) ? `${tempF}°F / ${tempC}°C` : t('notAvailable')}</div>
          <div class="weather-meta">
            <span><strong>${escapeHtml(t('humidity'))}</strong>${current.relative_humidity_2m ?? t('notAvailable')}%</span>
            <span><strong>${escapeHtml(t('wind'))}</strong>${current.wind_speed_10m ?? t('notAvailable')} mph</span>
            <span><strong>${escapeHtml(t('localTime'))}</strong>${escapeHtml(localTime)}</span>
          </div>
        </article>
      `;
    };

    const render = async () => {
      if (!weatherMessage || !weatherList) return;

      renderQuoteWidget();
      weatherMessage.textContent = t('loadingWeather');
      weatherList.innerHTML = '';

      let cities = [];
      try {
        cities = (await loadSavedWeatherCities()).filter(
          (city) => city && city.latitude !== undefined && city.longitude !== undefined,
        );
      } catch (error) {
        console.error('Failed to load saved weather cities:', error);
        weatherMessage.textContent = t('weatherUnable');
        return;
      }

      if (!cities.length) {
        weatherMessage.textContent = '';
        weatherList.innerHTML = `<p class="weather-empty">${escapeHtml(t('noSavedWeatherCities'))}</p>`;
        return;
      }

      const cards = await Promise.all(
        cities.map(async (city) => {
          try {
            const weatherData = await fetchWeatherData(city.latitude, city.longitude);
            return getWeatherCard(city, weatherData);
          } catch (error) {
            console.error('Failed to load city weather:', error);
            return `
            <article class="weather-card weather-card-error">
              <h4>${escapeHtml(city.name || t('weather'))}</h4>
              <p>${escapeHtml(t('weatherUnable'))}</p>
            </article>
          `;
          }
        }),
      );

      weatherMessage.textContent = '';
      weatherList.innerHTML = cards.join('');
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      const city = weatherCityInput.value.trim();
      if (!city) {
        weatherCityInput.focus();
        return;
      }

      weatherMessage.textContent = t('loadingWeather');

      try {
        const match = await fetchWeatherCityMatch(city);
        if (!match) {
          weatherMessage.textContent = t('cityNotFound');
          return;
        }

        const cityRecord = {
          weather_key: `${Number(match.latitude).toFixed(3)},${Number(match.longitude).toFixed(3)}`,
          name: normalizeWeatherCityName(match),
          latitude: match.latitude,
          longitude: match.longitude,
        };
        await saveSavedWeatherCity(cityRecord);
        weatherCityInput.value = '';
        showStatusToast(t('citySaved'));
        render();
      } catch (error) {
        console.error('Failed to save weather city:', error);
        weatherMessage.textContent = t('weatherUnable');
      }
    };

    const handleListClick = async (event) => {
      const removeButton = event.target.closest('.weather-remove');
      if (!removeButton) return;

      const weatherId = removeButton.dataset.weatherId;
      try {
        await deleteSavedWeatherCity(weatherId);
        render();
      } catch (error) {
        console.error('Failed to delete weather city:', error);
        weatherMessage.textContent = t('weatherUnable');
      }
    };

    const bind = () => {
      if (isBound) return;
      weatherForm?.addEventListener('submit', handleSubmit);
      weatherList?.addEventListener('click', handleListClick);
      isBound = true;
    };

    return {
      bind,
      hideQuoteWidget,
      render,
    };
  };

  window.WeatherModule = { create };
})();
