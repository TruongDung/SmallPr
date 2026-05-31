const createAuthService = ({ getAsync }) => {
  const getUserById = (id) => getAsync(
    'SELECT id, username, name, email FROM users WHERE id = ?',
    [id]
  );

  return {
    getUserById,
  };
};

module.exports = {
  createAuthService,
};
