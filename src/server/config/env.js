const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL_SECONDS = Number.parseInt(process.env.CACHE_TTL_SECONDS || '30', 10);
const TASK_ALERT_TO = process.env.TASK_ALERT_TO;

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  throw new Error('DATABASE_URL must be set to your Supabase Postgres connection string.');
}

module.exports = {
  CACHE_TTL_SECONDS: Number.isFinite(CACHE_TTL_SECONDS) && CACHE_TTL_SECONDS > 0 ? CACHE_TTL_SECONDS : 30,
  DATABASE_URL,
  PORT,
  REDIS_URL,
  TASK_ALERT_TO,
};
