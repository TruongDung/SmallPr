const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { pool } = require('../db/client');

const createSessionMiddleware = (isProduction = false) => {
  return session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'please-provide-session-secret-env-var',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  });
};

module.exports = { createSessionMiddleware };
