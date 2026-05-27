const createCreditCardsService = ({ allAsync, getAsync, runAsync }) => {
  const listForUser = (userId) => allAsync(
    `SELECT id, name, total_balance, closing_date, created_at, updated_at
     FROM credit_cards
     WHERE user_id = ?
     ORDER BY LOWER(name), name`,
    [userId]
  );

  const findForUser = (id, userId) => getAsync(
    'SELECT * FROM credit_cards WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const findById = (id) => getAsync(
    'SELECT id, name, total_balance, closing_date, created_at, updated_at FROM credit_cards WHERE id = ?',
    [id]
  );

  const create = async ({ userId, name, totalBalance, closingDate }) => {
    const result = await runAsync(
      `INSERT INTO credit_cards (user_id, name, total_balance, closing_date)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [userId, name, totalBalance, closingDate || null]
    );

    return findById(result.lastID);
  };

  const update = async ({ id, userId, name, totalBalance, closingDate }) => {
    await runAsync(
      'UPDATE credit_cards SET name = ?, total_balance = ?, closing_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, totalBalance, closingDate || null, id, userId]
    );

    return findById(id);
  };

  return {
    create,
    findForUser,
    listForUser,
    update,
  };
};

module.exports = {
  createCreditCardsService,
};
