const express = require('express');

const createAuthRouter = ({ bcrypt, getAsync, getUserById, runAsync }) => {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await runAsync(
        'INSERT INTO users (username, password) VALUES (?, ?) RETURNING id',
        [username, hashedPassword]
      );
      req.session.userId = result.lastID;

      res.json({ user: { id: result.lastID, username } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const user = await getAsync(
        'SELECT id, username, name, email, password, account_status FROM users WHERE username = ?',
        [username]
      );
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.account_status === 'disabled') {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      req.session.userId = user.id;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          account_status: user.account_status,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  router.get('/me', async (req, res) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }
      if (user.account_status === 'disabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Account is disabled', user: null });
      }
      res.json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  });

  return router;
};

module.exports = createAuthRouter;
