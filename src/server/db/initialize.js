const bcrypt = require('bcrypt');

const { getAsync, pool, runAsync } = require('./client');
const { runMigrations } = require('./migrationRunner');
const logger = require('../logger');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDatabaseError = (error) => {
  const message = `${error?.message || ''} ${error?.cause?.message || ''} ${error?.rollbackError?.message || ''}`;
  return [
    'Connection terminated',
    'Connection terminated unexpectedly',
    'connection timeout',
    'timeout',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'server closed the connection',
    'remaining connection slots',
    'too many clients',
  ].some((fragment) => message.toLowerCase().includes(fragment.toLowerCase()))
    || ['08000', '08001', '08003', '08006', '53300', '57P01', '57P02', '57P03'].includes(error?.code);
};

const withDatabaseInitRetry = async (operation) => {
  const maxAttempts = parsePositiveInt(
    process.env.DB_INIT_MAX_ATTEMPTS,
    process.env.NODE_ENV === 'production' ? 4 : 1
  );
  const baseDelayMs = parsePositiveInt(process.env.DB_INIT_RETRY_DELAY_MS, 750);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = attempt < maxAttempts && isTransientDatabaseError(error);
      if (!canRetry) {
        throw error;
      }

      const retryDelayMs = baseDelayMs * attempt;
      logger.warn(
        { err: error, attempt, maxAttempts, retryDelayMs },
        'Database initialization failed transiently; retrying'
      );
      await delay(retryDelayMs);
    }
  }

  return undefined;
};

const runDatabaseInitialization = async () => {
  // Run all SQL migrations from dedicated migration files
  await runMigrations(pool);

  // Create default admin user if it doesn't exist
  const admin = await getAsync('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultAdminPassword) {
      logger.warn('Default admin user was not created: DEFAULT_ADMIN_PASSWORD is not set');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await runAsync(
      'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id',
      ['admin', hashedPassword]
    );
    logger.info('Default admin user created');
  }

  // Assign admin user to unassigned fast access links
  const adminUser = await getAsync('SELECT id FROM users WHERE username = ?', ['admin']);
  if (adminUser) {
    await pool.query(
      'UPDATE fast_access_links SET user_id = $1 WHERE user_id IS NULL',
      [adminUser.id]
    );

    // Create default fast access links for admin if none exist
    await pool.query(`
      INSERT INTO fast_access_links (user_id, label, url, sort_order)
      SELECT $1, defaults.label, defaults.url, base.max_sort_order + defaults.sort_order
      FROM (VALUES
        ('Link 1', 'https://example.com/link1', 1),
        ('Link 2', 'https://example.com/link2', 2),
        ('Link 3', 'https://example.com/link3', 3),
        ('Link 4', 'https://example.com/link4', 4),
        ('Link 5', 'https://example.com/link5', 5),
        ('Link 6', 'https://example.com/link6', 6)
      ) AS defaults(label, url, sort_order)
      CROSS JOIN (
        SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM fast_access_links
      ) AS base
      WHERE NOT EXISTS (
        SELECT 1 FROM fast_access_links WHERE user_id = $1
      )
    `, [adminUser.id]);
  }
};

const initializeDatabase = () => withDatabaseInitRetry(runDatabaseInitialization);

module.exports = {
  isTransientDatabaseError,
  initializeDatabase,
};
