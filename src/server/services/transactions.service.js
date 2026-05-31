const TRANSACTION_SELECT = 'id, occurred_on, kind, amount, category, account, note, credit_card_id, created_at, updated_at';

const createTransactionsService = ({ allAsync, getAsync, runAsync }) => {
  const listForUser = (userId, filters = {}) => {
    const { month, year, kind, category } = filters;
    let query = `SELECT ${TRANSACTION_SELECT} FROM transactions WHERE user_id = ?`;
    const params = [userId];

    if (month && year) {
      query += ` AND EXTRACT(YEAR FROM occurred_on) = ? AND EXTRACT(MONTH FROM occurred_on) = ?`;
      params.push(year, month);
    }

    if (kind) {
      query += ` AND kind = ?`;
      params.push(kind);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY occurred_on DESC, id DESC`;

    return allAsync(query, params);
  };

  const findForUser = (id, userId) => getAsync(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const findById = (id) => getAsync(
    `SELECT ${TRANSACTION_SELECT} FROM transactions WHERE id = ?`,
    [id]
  );

  const create = async ({ userId, occurredOn, kind, amount, category, account, note, creditCardId }) => {
    const result = await runAsync(
      `INSERT INTO transactions (user_id, occurred_on, kind, amount, category, account, note, credit_card_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [userId, occurredOn, kind, amount, category || null, account || null, note || null, creditCardId || null]
    );

    return findById(result.lastID);
  };

  const update = async ({ id, userId, occurredOn, kind, amount, category, account, note, creditCardId }) => {
    await runAsync(
      `UPDATE transactions
       SET occurred_on = ?, kind = ?, amount = ?, category = ?, account = ?, note = ?, credit_card_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [occurredOn, kind, amount, category || null, account || null, note || null, creditCardId || null, id, userId]
    );

    return findById(id);
  };

  const remove = ({ id, userId }) => runAsync(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const getSummary = async (userId, month, year) => {
    let query = `
      SELECT
        kind,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = ?
    `;
    const params = [userId];

    if (month && year) {
      query += ` AND EXTRACT(YEAR FROM occurred_on) = ? AND EXTRACT(MONTH FROM occurred_on) = ?`;
      params.push(year, month);
    }

    query += ` GROUP BY kind`;

    const results = await allAsync(query, params);

    const summary = {
      income: 0,
      expense: 0,
      net: 0,
    };

    results.forEach(row => {
      if (row.kind === 'income') {
        summary.income = Number(row.total);
      } else if (row.kind === 'expense') {
        summary.expense = Number(row.total);
      }
    });

    summary.net = summary.income - summary.expense;

    return summary;
  };

  const getCategoriesForUser = (userId) => allAsync(
    `SELECT DISTINCT category
     FROM transactions
     WHERE user_id = ? AND category IS NOT NULL AND category <> ''
     ORDER BY LOWER(category), category`,
    [userId]
  );

  return {
    listForUser,
    findForUser,
    create,
    update,
    remove,
    getSummary,
    getCategoriesForUser,
  };
};

module.exports = {
  createTransactionsService,
};
