const createAuthService = ({ getAsync }) => {
  const getUserById = (id) => getAsync(
    'SELECT id, username, name, email, timezone, language, account_status, account_status_changed_at FROM users WHERE id = ?',
    [id]
  );

  return {
    getUserById,
  };
};

module.exports = {
  createAuthService,
};
