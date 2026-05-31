const createAuthMiddleware = ({ getUserById }) => {
  const authRequired = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  const adminRequired = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to verify admin access' });
    }
  };

  return {
    adminRequired,
    authRequired,
  };
};

module.exports = {
  createAuthMiddleware,
};
