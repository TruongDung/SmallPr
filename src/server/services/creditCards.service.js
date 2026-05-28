const CREDIT_CARD_SELECT = 'id, name, card_user, issuer, total_balance, interest_charge, closing_date, created_at, updated_at';
const FAST_ACCESS_BILL_SELECT = 'id, item, amount, due_date, pay_before, status, sort_order, created_at, updated_at';

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

  const create = async ({ userId, name, cardUser, issuer, totalBalance, interestCharge, closingDate }) => {
    const result = await runAsync(
      `INSERT INTO credit_cards (user_id, name, card_user, issuer, total_balance, interest_charge, closing_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [userId, name, cardUser || null, issuer || null, totalBalance, interestCharge, closingDate || null]
    );

    return findById(result.lastID);
  };

  const update = async ({ id, userId, name, cardUser, issuer, totalBalance, interestCharge, closingDate }) => {
    await runAsync(
      'UPDATE credit_cards SET name = ?, card_user = ?, issuer = ?, total_balance = ?, interest_charge = ?, closing_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, cardUser || null, issuer || null, totalBalance, interestCharge, closingDate || null, id, userId]
    );

    return findById(id);
  };

  const remove = ({ id, userId }) => runAsync(
    'DELETE FROM credit_cards WHERE id = ? AND user_id = ? RETURNING id',
    [id, userId]
  );

  const listFastAccessBillsForUser = (userId) => allAsync(
    `SELECT ${FAST_ACCESS_BILL_SELECT}
     FROM fast_access_bills
     WHERE user_id = ?
     ORDER BY sort_order, LOWER(item), item`,
    [userId]
  );

  const listForAdmin = () => allAsync(
    `SELECT ${CREDIT_CARD_SELECT}
     FROM credit_cards
     WHERE user_id = (SELECT id FROM users WHERE username = 'admin' ORDER BY id LIMIT 1)
     ORDER BY LOWER(COALESCE(card_user, '')), card_user, LOWER(name), name`
  );

  const seedFastAccessBillsForUser = async (userId) => {
    const existing = await getAsync(
      'SELECT id FROM fast_access_bills WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (existing) return;

    await runAsync(
      `INSERT INTO fast_access_bills (user_id, item, amount, due_date, pay_before, status, sort_order)
       SELECT ?, item, amount, due_date, pay_before, status, sort_order
       FROM fast_access_bill_defaults
       ORDER BY sort_order, LOWER(item), item
       RETURNING id`,
      [userId]
    );
  };

  const findFastAccessBillForUser = (id, userId) => getAsync(
    'SELECT * FROM fast_access_bills WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  const findFastAccessBillById = (id) => getAsync(
    `SELECT ${FAST_ACCESS_BILL_SELECT} FROM fast_access_bills WHERE id = ?`,
    [id]
  );

  const updateFastAccessBill = async ({ id, userId, item, amount, dueDate, payBefore, status }) => {
    await runAsync(
      `UPDATE fast_access_bills
       SET item = ?, amount = ?, due_date = ?, pay_before = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [item, amount, dueDate, payBefore, status, id, userId]
    );

    return findFastAccessBillById(id);
  };

  return {
    create,
    findForUser,
    findFastAccessBillForUser,
    getAccountUser,
    listFastAccessBillsForUser,
    listCardUsersForUser,
    listForAdmin,
    seedFastAccessBillsForUser,
    listForUser,
    remove,
    update,
    updateFastAccessBill,
  };
};

module.exports = {
  createCreditCardsService,
};
