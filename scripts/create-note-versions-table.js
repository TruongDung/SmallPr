#!/usr/bin/env node
/**
 * One-off script to create the note_versions table in production
 * Run with: node scripts/create-note-versions-table.js
 *
 * Requires DATABASE_URL environment variable to be set
 */

require('dotenv').config();

const { Pool } = require('pg');
const logger = require('../src/server/logger');

const { DATABASE_URL } = require('../src/server/config/env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
});

const createNoteVersionsTable = async () => {
  const client = await pool.connect();

  try {
    logger.info('Creating note_versions table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS note_versions (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    logger.info('✓ note_versions table created successfully');

    // Verify the table exists
    const result = await client.query(`
      SELECT to_regclass('public.note_versions') AS table_exists;
    `);

    if (result.rows[0].table_exists) {
      logger.info('✓ Table verified in database');
    } else {
      logger.error('✗ Table creation verification failed');
      process.exit(1);
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to create note_versions table');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createNoteVersionsTable();
