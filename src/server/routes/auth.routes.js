const crypto = require('crypto');
const express = require('express');

const logger = require('../logger');
const { createSessionUser, normalizeEmail, normalizeName } = require('../utils/users');

const REGISTRATION_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const REGISTRATION_LIMIT_MAX = 5;
const REGISTRATION_MIN_FORM_AGE_MS = 800;
const REGISTRATION_MAX_FORM_AGE_MS = 30 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_LANGUAGES = new Set(['en', 'vi']);

const registrationAttempts = new Map();

const isSupportedTimezone = (timezone) => {
  if (!timezone) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (_error) {
    return false;
  }
};

const hashVerificationToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createVerificationToken = () => crypto.randomBytes(32).toString('hex');

const createVerificationUrl = (req, token) => {
  const configuredBaseUrl = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL;
  const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${String(baseUrl).replace(/\/$/, '')}/api/verify-email?token=${encodeURIComponent(token)}`;
};

const getRequestIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
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
    !Number.isFinite(startedAt) ||
    formAge < REGISTRATION_MIN_FORM_AGE_MS ||
    formAge > REGISTRATION_MAX_FORM_AGE_MS ||
    interactionCount < 1
  ) {
    return res.status(400).json({ error: 'Please complete registration from the sign-up form.' });
  }

  return next();
};

const createAuthRouter = ({
  auditLogs,
  featureFlags,
  bcrypt,
  getAsync,
  getUserById,
  runAsync,
  sendVerificationEmail,
}) => {
  const router = express.Router();

  // Attach the effective per-user feature visibility to a session-user payload.
  // Admins are never restricted, so they receive null (full access).
  const withFeatureVisibility = async (sessionUser, user) => {
    if (!sessionUser || !featureFlags || !user) return sessionUser;
    try {
      if (user.username === 'admin') return { ...sessionUser, featureVisibility: null };
      const featureVisibility = await featureFlags.getEffectiveUserVisibility(user.id);
      return { ...sessionUser, featureVisibility };
    } catch (error) {
      logger.error({ err: error }, 'Failed to resolve feature visibility');
      return sessionUser;
    }
  };

  router.post(['/signup', '/register'], registrationRateLimit, validateHumanRegistration, async (req, res) => {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (typeof sendVerificationEmail !== 'function') {
      return res.status(503).json({ error: 'Email verification is not configured' });
    }

    try {
      const existingUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const verificationToken = createVerificationToken();
      const verificationTokenHash = hashVerificationToken(verificationToken);
      const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await runAsync(
        `INSERT INTO users (
           username, email, password, account_status, account_status_changed_at,
           email_verification_token, email_verification_expires_at
         )
         VALUES (?, ?, ?, 'pending_verification', CURRENT_TIMESTAMP, ?, ?)
         RETURNING id`,
        [username, email, hashedPassword, verificationTokenHash, verificationExpiresAt],
      );
      const verificationUrl = createVerificationUrl(req, verificationToken);
      const emailSent = await sendVerificationEmail({ email, username, verificationUrl });
      if (!emailSent) {
        await runAsync('DELETE FROM users WHERE id = ?', [result.lastID]);
        return res.status(503).json({ error: 'Email verification is not configured' });
      }

      const registeredUser = { id: result.lastID, username, email, account_status: 'pending_verification' };
      const userIp = getRequestIp(req);
      await auditLogs.record({
        userId: result.lastID,
        actorUserId: result.lastID,
        action: 'register',
        entityType: 'user',
        entityId: result.lastID,
        summary: username,
        after: registeredUser,
        ipAddress: userIp,
      });

      res.json({
        message: 'Registration received. Please verify your email before logging in.',
        user: { ...registeredUser, impersonator: null },
        ...(process.env.NODE_ENV === 'test' ? { verification_token: verificationToken } : {}),
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to create user');
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  router.get('/verify-email', async (req, res) => {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
      const tokenHash = hashVerificationToken(token);
      const user = await getAsync(
        `SELECT id, username, email, account_status, email_verification_expires_at
         FROM users
         WHERE email_verification_token = ?`,
        [tokenHash],
      );
      if (!user) {
        return res.status(400).json({ error: 'Verification link is invalid or has already been used' });
      }
      if (user.email_verification_expires_at && new Date(user.email_verification_expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Verification link has expired' });
      }

      await runAsync(
        `UPDATE users
         SET account_status = 'enabled',
             account_status_changed_at = CURRENT_TIMESTAMP,
             email_verification_token = NULL,
             email_verification_expires_at = NULL
         WHERE id = ?`,
        [user.id],
      );

      if (String(req.headers.accept || '').includes('text/html')) {
        return res.redirect('/?verified=1');
      }
      return res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to verify email');
      return res.status(500).json({ error: 'Failed to verify email' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const user = await getAsync(
        'SELECT id, username, name, email, timezone, language, password, account_status FROM users WHERE username = ?',
        [username],
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
      if (user.account_status !== 'enabled') {
        return res.status(403).json({ error: 'Please verify your email before logging in' });
      }

      req.session.userId = user.id;
      delete req.session.impersonatorUserId;
      const userIp = getRequestIp(req);
      await auditLogs.record({
        userId: user.id,
        actorUserId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        summary: user.username,
        after: createSessionUser(user),
        ipAddress: userIp,
      });
      res.json({ user: await withFeatureVisibility(createSessionUser(user), user) });
    } catch (error) {
      logger.error({ err: error }, 'Login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Logout failed');
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  router.put('/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const name = normalizeName(req.body.name);
    const email = normalizeEmail(req.body.email);
    const timezone = String(req.body.timezone || '').trim() || null;
    const language = String(req.body.language || '').trim() || null;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (timezone && !isSupportedTimezone(timezone)) {
      return res.status(400).json({ error: 'Timezone is invalid' });
    }
    if (language && !SUPPORTED_LANGUAGES.has(language)) {
      return res.status(400).json({ error: 'Language is invalid' });
    }

    try {
      await runAsync('UPDATE users SET name = ?, email = ?, timezone = ?, language = ? WHERE id = ?', [
        name,
        email,
        timezone,
        language,
        req.session.userId,
      ]);
      const user = await getUserById(req.session.userId);
      res.json({ user: createSessionUser(user) });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update profile');
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  router.put('/me/password', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    try {
      const user = await getAsync('SELECT id, password FROM users WHERE id = ?', [req.session.userId]);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Authentication required' });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await runAsync('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId]);
      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update password');
      res.status(500).json({ error: 'Failed to update password' });
    }
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
      if (admin.account_status !== 'enabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Please verify your email before logging in' });
      }

      req.session.userId = admin.id;
      delete req.session.impersonatorUserId;
      res.json({ user: createSessionUser(admin) });
    } catch (error) {
      logger.error({ err: error }, 'Failed to stop impersonation');
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
      if (user.account_status !== 'enabled') {
        req.session.destroy(() => {});
        return res.status(403).json({ error: 'Please verify your email before logging in', user: null });
      }

      let impersonator = null;
      if (req.session.impersonatorUserId) {
        impersonator = await getUserById(req.session.impersonatorUserId);
        if (!impersonator || impersonator.username !== 'admin' || impersonator.account_status !== 'enabled') {
          req.session.destroy(() => {});
          return res.status(401).json({ error: 'Authentication required', user: null });
        }
      }

      res.json({ user: await withFeatureVisibility(createSessionUser(user, impersonator), user) });
    } catch (error) {
      logger.error({ err: error }, 'Failed to retrieve user');
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  });

  return router;
};

module.exports = createAuthRouter;
