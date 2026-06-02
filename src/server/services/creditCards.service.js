const CREDIT_CARD_SELECT = 'id, name, card_user, issuer, total_balance, interest_charge, closing_date, created_at, updated_at';
const FAST_ACCESS_BILL_SELECT = 'id, item, amount, due_date, pay_before, status, sort_order, created_at, updated_at';
const FAST_ACCESS_LINK_SELECT = 'id, label, url, sort_order, created_at, updated_at';

const NON_ADMIN_DEFAULT_BILL_FILTER = `
     AND (
       bills.user_id = (SELECT id FROM users WHERE username = 'admin' ORDER BY id LIMIT 1)
       OR NOT EXISTS (
         SELECT 1
         FROM fast_access_bill_defaults defaults
         WHERE defaults.item = bills.item
           AND defaults.amount = bills.amount
           AND COALESCE(defaults.due_date, '') = COALESCE(bills.due_date, '')
           AND COALESCE(defaults.pay_before, '') = COALESCE(bills.pay_before, '')
           AND defaults.status = bills.status
           AND defaults.sort_order = bills.sort_order
       )
     )`;

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
     FROM fast_access_bills bills
     WHERE user_id = ?
     ${NON_ADMIN_DEFAULT_BILL_FILTER}
     ORDER BY sort_order, LOWER(item), item`,
    [userId]
  );

  const listFastAccessLinks = () => allAsync(
    `SELECT ${FAST_ACCESS_LINK_SELECT}
     FROM fast_access_links
     ORDER BY sort_order, LOWER(label), label`
  );

  const createFastAccessLink = async ({ label, url }) => {
    const result = await runAsync(
      `INSERT INTO fast_access_links (label, url, sort_order)
       VALUES (?, ?, COALESCE((SELECT MAX(sort_order) FROM fast_access_links), 0) + 1)
       RETURNING id`,
      [label, url]
    );

    return getAsync(
      `SELECT ${FAST_ACCESS_LINK_SELECT} FROM fast_access_links WHERE id = ?`,
      [result.lastID]
    );
  };

  const findFastAccessLinkById = (id) => getAsync(
    `SELECT ${FAST_ACCESS_LINK_SELECT} FROM fast_access_links WHERE id = ?`,
    [id]
  );

  const removeFastAccessLink = (id) => runAsync(
    'DELETE FROM fast_access_links WHERE id = ? RETURNING id',
    [id]
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
    createFastAccessLink,
    findForUser,
    findFastAccessBillForUser,
    findFastAccessLinkById,
    getAccountUser,
    listFastAccessBillsForUser,
    listFastAccessLinks,
    listCardUsersForUser,
    listForAdmin,
    seedFastAccessBillsForUser,
    listForUser,
    remove,
    removeFastAccessLink,
    update,
    updateFastAccessBill,
  };
};

module.exports = {
  createCreditCardsService,
};
