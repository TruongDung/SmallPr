const express = require('express');

const REGISTRATION_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const REGISTRATION_LIMIT_MAX = 5;
const REGISTRATION_MIN_FORM_AGE_MS = 800;
const REGISTRATION_MAX_FORM_AGE_MS = 30 * 60 * 1000;

const registrationAttempts = new Map();

const createSessionUser = (user, impersonator = null) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  account_status: user.account_status,
  impersonator: impersonator ? {
    id: impersonator.id,
    username: impersonator.username,
    name: impersonator.name,
    email: impersonator.email,
  } : null,
});

const getRequestIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
};

const pruneRegistrationAttempts = (now = Date.now()) => {
  for (const [key, timestamps] of registrationAttempts.entries()) {
    const recent = timestamps.filter((timestamp) => now - timestamp < REGISTRATION_LIMIT_WINDOW_MS);
    if (recent.length) {
      registrationAttempts.set(key, recent);
    } else {
      registrationAttempts.delete(key);
    }
  }
};

const registrationRateLimit = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const now = Date.now();
  pruneRegistrationAttempts(now);

  const key = getRequestIp(req);
  const attempts = registrationAttempts.get(key) || [];
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < REGISTRATION_LIMIT_WINDOW_MS);

  if (recentAttempts.length >= REGISTRATION_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((REGISTRATION_LIMIT_WINDOW_MS - (now - recentAttempts[0])) / 1000);
    res.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
    return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
  }

  recentAttempts.push(now);
  registrationAttempts.set(key, recentAttempts);
  return next();
};

const validateHumanRegistration = (req, res, next) => {
  if (!req.body?.username || !req.body?.password) return next();

  const humanCheck = req.body?.human_check || {};
  const startedAt = Number(humanCheck.started_at);
  const interactionCount = Number(humanCheck.interaction_count || 0);
  const honeypot = String(humanCheck.website || req.body?.website || '').trim();
  const formAge = Date.now() - startedAt;

  if (honeypot) {
    return res.status(400).json({ error: 'Please complete registration from the sign-up form.' });
  }

  if (
    !Number.isFinite(startedAt)
    || formAge < REGISTRATION_MIN_FORM_AGE_MS
    || formAge > REGISTRATION_MAX_FORM_AGE_MS
    || interactionCount < 1
  ) {
    return res.status(400).json({ error: 'Please complete registration from the sign-up form.' });
  }

  return next();
};

const createAuthRouter = ({ bcrypt, getAsync, getUserById, runAsync }) => {
  const router = express.Router();

  router.post(['/signup', '/register'], registrationRateLimit, validateHumanRegistration, async (req, res) => {
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
      delete req.session.impersonatorUserId;

      res.json({ user: { id: result.lastID, username, impersonator: null } });
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
      delete req.session.impersonatorUserId;
      res.json({ user: createSessionUser(user) });
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

  router.post('/impersonation/stop', async (req, res) => {
    if (!req.session.impersonatorUserId) {
      return res.status(400).json({ error: 'No active impersonation session' });
    }

    try {
      const admin = await getUserById(req.session.impersonatorUserId);
      if (!admin || admin.username !== 'admin') {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (admin.account_status === 'disabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Account is disabled' });
      }

      req.session.userId = admin.id;
      delete req.session.impersonatorUserId;
      res.json({ user: createSessionUser(admin) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to stop impersonation' });
    }
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

      let impersonator = null;
      if (req.session.impersonatorUserId) {
        impersonator = await getUserById(req.session.impersonatorUserId);
        if (!impersonator || impersonator.username !== 'admin' || impersonator.account_status === 'disabled') {
          req.session.destroy(() => {});
          return res.status(401).json({ error: 'Authentication required', user: null });
        }
      }

      res.json({ user: createSessionUser(user, impersonator) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  });

  return router;
};

module.exports = createAuthRouter;
