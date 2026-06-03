const logger = require('../logger');

const createAuthMiddleware = ({ getUserById }) => {
  const authRequired = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (user.account_status === 'disabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Account is disabled' });
      }
      if (user.account_status !== 'enabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Please verify your email before logging in' });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      logger.error({ err: error }, 'Auth middleware error');
      res.status(500).json({ error: 'Failed to verify authentication' });
    }
  };

  const adminRequired = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (user?.account_status === 'disabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Account is disabled' });
      }
      if (user && user.account_status !== 'enabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Please verify your email before logging in' });
      }
      if (!user || user.username !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.currentUser = user;
      next();
    } catch (error) {
      logger.error({ err: error }, 'Auth middleware error');
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
