const CREDIT_CARD_SELECT = 'id, name, card_user, issuer, total_balance, closing_date, created_at, updated_at';

const createCreditCardsService = ({ allAsync, getAsync, runAsync }) => {
  const listForUser = (userId) => allAsync(
    `SELECT ${CREDIT_CARD_SELECT}
     FROM credit_cards
     WHERE user_id = ?
     ORDER BY LOWER(COALESCE(card_user, '')), card_user, LOWER(name), name`,
    [userId]
  );

  const findForUser = (id, userId) => getAsync(
    'SELECT * FROM credit_cards WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const findById = (id) => getAsync(
    `SELECT ${CREDIT_CARD_SELECT} FROM credit_cards WHERE id = ?`,
    [id]
  );

  const getAccountUser = (userId) => getAsync(
    'SELECT username FROM users WHERE id = ?',
    [userId]
  );

  const listCardUsersForUser = (userId) => allAsync(
    `SELECT name
     FROM (
       SELECT DISTINCT TRIM(card_user) AS name
       FROM credit_cards
       WHERE user_id = ? AND card_user IS NOT NULL AND TRIM(card_user) <> ''
     ) card_users
     ORDER BY LOWER(name), name`,
    [userId]
  );

  const create = async ({ userId, name, cardUser, issuer, totalBalance, closingDate }) => {
    const result = await runAsync(
      `INSERT INTO credit_cards (user_id, name, card_user, issuer, total_balance, closing_date)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [userId, name, cardUser || null, issuer || null, totalBalance, closingDate || null]
    );

    return findById(result.lastID);
  };

  const update = async ({ id, userId, name, cardUser, issuer, totalBalance, closingDate }) => {
    await runAsync(
      'UPDATE credit_cards SET name = ?, card_user = ?, issuer = ?, total_balance = ?, closing_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, cardUser || null, issuer || null, totalBalance, closingDate || null, id, userId]
    );

    return findById(id);
  };

  return {
    create,
    findForUser,
    getAccountUser,
    listCardUsersForUser,
    listForUser,
    update,
  };
};

module.exports = {
  createCreditCardsService,
};
