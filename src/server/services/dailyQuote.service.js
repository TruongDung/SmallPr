// Shared daily-quote fetcher used by GET /api/daily-quote and the dashboard.
// Tries zenquotes.io, falls back to api.quotable.io, then a hardcoded default.
// Both upstream calls are protected by a 2.5s AbortController timeout.
//
// The resolved quote is cached in Redis under a single global key so the slow
// external call stays off the dashboard's hot path — without this, every cold
// dashboard rebuild (common on serverless) blocked on a third-party request.

const logger = require('../logger');
const cache = require('../cache/redis');

const DEFAULT_DAILY_QUOTE = {
  text: 'Make it simple enough to begin.',
  author: 'Unknown',
};

const QUOTE_CACHE_KEY = 'cache:daily-quote';
const QUOTE_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours — it's a *daily* quote.

const fetchJsonWithTimeout = async (url, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Never let this timer keep the process (or a Jest worker) alive on its own.
  if (typeof timeout.unref === 'function') timeout.unref();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TaskManager/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Quote request failed with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchFreshQuote = async () => {
  // In tests (and anywhere external calls are explicitly disabled) skip the
  // network entirely. Real upstream calls cause flaky failures and leak pending
  // requests that prevent the Jest worker from exiting cleanly.
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_EXTERNAL_QUOTES === 'true') {
    return DEFAULT_DAILY_QUOTE;
  }

  const providers = [
    async () => {
      const data = await fetchJsonWithTimeout('https://zenquotes.io/api/random');
      const quote = Array.isArray(data) ? data[0] : data;
      return {
        text: quote?.q,
        author: quote?.a,
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout('https://api.quotable.io/random');
      return {
        text: data?.content,
        author: data?.author,
      };
    },
  ];

  for (const provider of providers) {
    try {
      const quote = await provider();
      if (quote?.text) {
        return {
          text: String(quote.text).trim(),
          author: String(quote.author || DEFAULT_DAILY_QUOTE.author).trim(),
        };
      }
    } catch (error) {
      logger.warn({ err: error }, 'Daily quote provider failed');
    }
  }

  return DEFAULT_DAILY_QUOTE;
};

// Cache-aware entry point. Returns a Redis-cached quote when available;
// otherwise fetches a fresh one and stores it. Cache failures are non-fatal —
// it always degrades to a live fetch (and finally the hardcoded default).
const fetchDailyQuote = async () => {
  const cached = await cache.getJson(QUOTE_CACHE_KEY);
  if (cached?.text) return cached;

  const quote = await fetchFreshQuote();

  // Only persist real upstream results, not the hardcoded fallback, so a brief
  // provider outage doesn't pin the default quote for the full TTL.
  if (quote && quote !== DEFAULT_DAILY_QUOTE) {
    await cache.setJson(QUOTE_CACHE_KEY, quote, QUOTE_CACHE_TTL_SECONDS);
  }

  return quote;
};

module.exports = {
  DEFAULT_DAILY_QUOTE,
  fetchDailyQuote,
};
