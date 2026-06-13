const fs = require('fs');
const path = require('path');
const logger = require('../logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const listMigrationFiles = () => fs.readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const runMigrations = async (pool) => {
  logger.info({ migrationsDir: MIGRATIONS_DIR }, 'Starting database migration runner');

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const appliedResult = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  const migrationFiles = listMigrationFiles();
  if (!migrationFiles.length) {
    logger.info('No SQL migrations found');
    return;
  }

  let appliedCount = 0;
  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      continue;
    }

    logger.info({ filename }, 'Applying database migration');
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      );
      await client.query('COMMIT');
      appliedCount += 1;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  logger.info({ appliedCount }, 'Database migration runner finished');
};

module.exports = {
  runMigrations,
};
