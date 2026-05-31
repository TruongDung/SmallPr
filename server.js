require('dotenv').config();

const { PORT } = require('./src/server/config/env');
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
        console.log(`Server running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
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
