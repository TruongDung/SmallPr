// Lightweight singleton holder for the Socket.IO server instance.
// The HTTP server in server.js creates the Socket.IO instance and calls
// setIo(); routes import emitToUser() to broadcast scoped events without
// having to thread io through every dependency.
//
// Note: Socket.IO requires persistent connections, so this only works on
// hosts that support long-lived processes (a Node server, Render, Railway,
// Fly.io, etc.). On Vercel's serverless platform the connection cannot be
// held open, so events will not flow between clients there. The HTTP API
// continues to work normally either way.

let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const getIo = () => ioInstance;

const userRoom = (userId) => `user:${userId}`;

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
};

module.exports = {
  setIo,
  getIo,
  userRoom,
  emitToUser,
};
