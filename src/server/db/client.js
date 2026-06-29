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
pgTypes.setTypeParser(1114, (value) => (value === null ? null : new Date(`${value}Z`)));

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

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected Postgres pool error');
});

const idleTimeoutMs = parsePositiveInt(process.env.PG_IDLE_TIMEOUT_MS, 30000);

let keepAliveTimer = null;

// Keep one pooled connection warm. The remote database lives in another region,
// so opening a fresh TLS + auth connection after the pool goes idle costs a
// second or more, which the user feels as a slow first response after being
// away. Pinging just under the idle timeout prevents the pool from dropping its
// last connection, so requests stay fast even after long idle periods.
// Long-lived process only (no effect on serverless, where intervals don't
// persist between invocations).
const startKeepAlive = () => {
  if (keepAliveTimer || isLocalDatabase) return;
  // Ping a bit before the idle timeout so the connection never expires.
  const intervalMs = Math.max(5000, Math.floor(idleTimeoutMs * 0.8));
  keepAliveTimer = setInterval(() => {
    pool.query('SELECT 1').catch((error) => {
      logger.warn({ err: error }, 'Database keep-alive ping failed');
    });
  }, intervalMs);
  // Don't let this timer keep the event loop alive on shutdown.
  if (typeof keepAliveTimer.unref === 'function') keepAliveTimer.unref();
  logger.info({ intervalMs }, 'Database keep-alive started');
};

const stopKeepAlive = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
};

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
  startKeepAlive,
  stopKeepAlive,
};
