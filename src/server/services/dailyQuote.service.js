// Shared daily-quote fetcher used by GET /api/daily-quote and the dashboard.
// Tries zenquotes.io, falls back to api.quotable.io, then a hardcoded default.
// Both upstream calls are protected by a 7s AbortController timeout.

const DEFAULT_DAILY_QUOTE = {
  text: 'Make it simple enough to begin.',
  author: 'Unknown',
};

const fetchJsonWithTimeout = async (url, timeoutMs = 7000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

const fetchDailyQuote = async () => {
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
      console.warn('Daily quote provider failed:', error.message);
    }
  }

  return DEFAULT_DAILY_QUOTE;
};

module.exports = {
  DEFAULT_DAILY_QUOTE,
  fetchDailyQuote,
};
