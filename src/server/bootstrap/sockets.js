const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const realtime = require('../realtime');

const createHttpServer = (app) => {
  return http.createServer(app);
};

const initializeSocketIO = (httpServer, sessionMiddleware) => {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: false },
  });

  realtime.setIo(io);

  io.engine.use(sessionMiddleware);

  io.on('connection', (socket) => {
    const socketSession = socket.request?.session;
    const userId = socketSession?.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    socket.join(`user:${userId}`);
  });

  return io;
};

module.exports = { createHttpServer, initializeSocketIO };
