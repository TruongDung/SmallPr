const bcrypt = require('bcrypt');

const { getAsync, pool, runAsync } = require('./client');
const { runMigrations } = require('./migrationRunner');

const initializeDatabase = async () => {
  await runMigrations(pool);

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tag TEXT,
    description TEXT,
    comment TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    archived INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    reminder_at TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    attachment_data TEXT,
    attachment_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS task_tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, normalized_name),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS weather_cities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    weather_key TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, weather_key),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS credit_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    total_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    interest_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_date TEXT,
    card_user TEXT,
    issuer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS fast_access_bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date TEXT,
    pay_before TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS fast_access_bill_defaults (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date TEXT,
    pay_before TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    sort_order INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    occurred_on DATE NOT NULL,
    kind TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT,
    account TEXT,
    note TEXT,
    credit_card_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
  )`);

  await pool.query('ALTER TABLE transactions ALTER COLUMN category DROP NOT NULL').catch(() => {});
  await pool.query('ALTER TABLE transactions ALTER COLUMN account DROP NOT NULL').catch(() => {});
  await pool.query('ALTER TABLE transactions ALTER COLUMN note DROP NOT NULL').catch(() => {});

  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_occurrence_date DATE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comment TEXT');
  await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'");
  await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'todo'");
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived INTEGER NOT NULL DEFAULT 0');
  await pool.query("UPDATE tasks SET status = 'done' WHERE completed = 1 AND status = 'todo'");
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_name TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_type TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_data TEXT');
  await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_size INTEGER DEFAULT 0');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS total_balance NUMERIC(12, 2) NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS interest_charge NUMERIC(12, 2) NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS closing_date TEXT');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_user TEXT');
  await pool.query('ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS issuer TEXT');
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS due_date TEXT');
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS pay_before TEXT');
  await pool.query("ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Unpaid'");
  await pool.query('ALTER TABLE fast_access_bills ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS due_date TEXT');
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS pay_before TEXT');
  await pool.query("ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Unpaid'");
  await pool.query('ALTER TABLE fast_access_bill_defaults ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB');

  await pool.query(`
    INSERT INTO fast_access_bill_defaults (item, amount, due_date, pay_before, status, sort_order)
    VALUES
      ('Rent',        0.00, '', '', 'Unpaid', 1),
      ('Electricity', 0.00, '', '', 'Unpaid', 2),
      ('Water',       0.00, '', '', 'Unpaid', 3),
      ('Gas',         0.00, '', '', 'Unpaid', 4),
      ('Internet',    0.00, '', '', 'Unpaid', 5),
      ('Phone',       0.00, '', '', 'Unpaid', 6),
      ('HOA',         0.00, '', '', 'Unpaid', 7),
      ('Auto loan',   0.00, '', '', 'Unpaid', 8),
      ('Daycare',     0.00, '', '', 'Unpaid', 9)
    ON CONFLICT (sort_order) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO task_tags (user_id, name, normalized_name)
    SELECT DISTINCT user_id, tag, LOWER(tag)
    FROM tasks
    WHERE tag IS NOT NULL AND TRIM(tag) <> ''
    ON CONFLICT (user_id, normalized_name) DO NOTHING
  `);

  const admin = await getAsync('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultAdminPassword) {
      console.warn('Default admin user was not created: DEFAULT_ADMIN_PASSWORD is not set.');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
    await runAsync(
      'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id',
      ['admin', hashedPassword]
    );
    console.log('Default admin user created.');
  }
};

module.exports = {
  initializeDatabase,
};
