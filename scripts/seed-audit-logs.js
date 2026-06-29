require('dotenv').config();

const { pool } = require('../src/server/db/client');

const SEED_PREFIX = 'Paging seed audit event #';
const DEFAULT_COUNT = 120;
const MAX_COUNT = 500;

const normalizeCount = (value) => {
  const count = Number(value || DEFAULT_COUNT);
  if (!Number.isInteger(count) || count < 1) return DEFAULT_COUNT;
  return Math.min(count, MAX_COUNT);
};

const main = async () => {
  const count = normalizeCount(process.argv[2]);
  const userResult = await pool.query(
    `SELECT id
     FROM users
     ORDER BY CASE WHEN username = 'admin' THEN 0 ELSE 1 END, id
     LIMIT 1`,
  );
  const userId = userResult.rows[0]?.id;

  if (!userId) {
    throw new Error('No users found. Create or register a user before seeding audit logs.');
  }

  await pool.query('DELETE FROM audit_logs WHERE summary LIKE $1', [`${SEED_PREFIX}%`]);

  await pool.query(
    `WITH seed AS (
       SELECT generate_series(1, $2::int) AS n
     )
     INSERT INTO audit_logs (
       user_id,
       actor_user_id,
       action,
       entity_type,
       entity_id,
       summary,
       before_data,
       after_data,
       created_at
     )
     SELECT
       $1,
       $1,
       (ARRAY['create', 'edit', 'delete', 'login', 'register'])[((n - 1) % 5) + 1],
       (ARRAY['task', 'transaction', 'note', 'credit_card', 'expense', 'user'])[((n - 1) % 6) + 1],
       900000 + n,
       $3 || n,
       NULL,
       jsonb_build_object('seed', true, 'row', n),
       CURRENT_TIMESTAMP - (n || ' minutes')::interval
     FROM seed`,
    [userId, count, SEED_PREFIX],
  );

  console.log(`Seeded ${count} audit log rows for user_id=${userId}.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
