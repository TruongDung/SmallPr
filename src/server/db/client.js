const { Pool } = require('pg');
const pgTypes = require('pg-types');

const { DATABASE_URL } = require('../config/env');
const logger = require('../logger');

// Postgres TIMESTAMP (without time zone) is parsed by pg as if it were
// local time. When the server runs in any non-UTC tz (or the value was
// stored from a different tz than the reader's), the round-trip silently
// shifts. We register a parser for OID 1114 (TIMESTAMP) that appends 'Z'
// so the value is interpreted as UTC, matching what we wrote with
// CURRENT_TIMESTAMP and what the client expects when computing
// "n minutes ago" labels.
pgTypes.setTypeParser(1114, (value) => (
  value === null ? null : new Date(`${value}Z`)
));

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  max: parsePositiveInt(process.env.PG_POOL_MAX, process.env.NODE_ENV === 'production' ? 3 : 10),
  idleTimeoutMillis: parsePositiveInt(process.env.PG_IDLE_TIMEOUT_MS, 30000),
  connectionTimeoutMillis: parsePositiveInt(process.env.PG_CONNECTION_TIMEOUT_MS, 20000),
  keepAlive: true,
  maxUses: parsePositiveInt(process.env.PG_MAX_USES, 7500),
  statement_timeout: parsePositiveInt(process.env.PG_STATEMENT_TIMEOUT_MS, 30000),
  idle_in_transaction_session_timeout: parsePositiveInt(process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS, 30000),
});

pool.on('error', (error, client) => {
  logger.error({ err: error }, 'Unexpected Postgres pool error');
  if (client) {
    client.release(true);
  }
});

const toPostgresSql = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const queryAsync = async (sql, params = []) => {
  return pool.query(toPostgresSql(sql), params);
};

const runAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return {
    changes: result.rowCount,
    lastID: result.rows[0]?.id,
  };
};

const getAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return result.rows[0];
};

const allAsync = async (sql, params = []) => {
  const result = await queryAsync(sql, params);
  return result.rows;
};

module.exports = {
  allAsync,
  getAsync,
  pool,
  queryAsync,
  runAsync,
  toPostgresSql,
};
