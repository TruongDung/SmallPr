require('dotenv').config();

const { PORT } = require('./src/server/config/env');
const logger = require('./src/server/logger');
const { startKeepAlive } = require('./src/server/db/client');
const { startSessionKeepAlive } = require('./src/server/config/session');
const {
  app,
  cacheReady,
  db,
  dbReady,
  httpServer,
  io,
} = require('./app');

if (require.main === module) {
  dbReady
    .then(() => {
      httpServer.listen(PORT, () => {
        // Keep a warm DB connection so the first request after an idle period
        // doesn't pay the remote reconnect cost.
        startKeepAlive();
        startSessionKeepAlive();
        logger.info({ port: PORT }, `Server running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      logger.error({ err: error }, 'Failed to initialize database');
      process.exit(1);
    });
}

module.exports = app;
module.exports.app = app;
module.exports.cacheReady = cacheReady;
module.exports.db = db;
module.exports.dbReady = dbReady;
module.exports.httpServer = httpServer;
module.exports.io = io;
