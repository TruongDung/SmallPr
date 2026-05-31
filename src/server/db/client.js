const { Pool } = require('pg');
const pgTypes = require('pg-types');

const { DATABASE_URL } = require('../config/env');

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

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error, client) => {
  console.error('Unexpected Postgres pool error:', error?.message || error);
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
