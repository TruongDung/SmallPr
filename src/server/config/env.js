const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const TASK_ALERT_TO = process.env.TASK_ALERT_TO;

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  throw new Error('DATABASE_URL must be set to your Supabase Postgres connection string.');
}

module.exports = {
  DATABASE_URL,
  PORT,
  TASK_ALERT_TO,
};
