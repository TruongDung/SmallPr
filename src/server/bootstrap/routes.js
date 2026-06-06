const createAdminRouter = require('../routes/admin.routes');
const createAuthRouter = require('../routes/auth.routes');
const createCreditCardsRouter = require('../routes/creditCards.routes');
const createDailyQuoteRouter = require('../routes/dailyQuote.routes');
const createDashboardRouter = require('../routes/dashboard.routes');
const createEvaluationsRouter = require('../routes/evaluations.routes');
const createNotesRouter = require('../routes/notes.routes');
const createTasksRouter = require('../routes/tasks.routes');
const createTransactionsRouter = require('../routes/transactions.routes');
const createWeatherRouter = require('../routes/weather.routes');
const realtime = require('../realtime');

const registerRoutes = (app, {
  adminRequired,
  authRequired,
  auditLogs,
  allAsync,
  getAsync,
  queryAsync,
  runAsync,
  getUserById,
  sendTaskAlertEmail,
  sendTaskSummaryEmail,
  sendVerificationEmail,
  bcrypt,
  redisCache,
}) => {
  const routeDependencies = {
    allAsync,
    getAsync,
    queryAsync,
    runAsync,
  };

  // Auth routes
  app.use('/api', createAuthRouter({
    auditLogs,
    bcrypt,
    getAsync,
    getUserById,
    runAsync,
    sendVerificationEmail,
  }));

  // Credit Cards routes
  app.use('/api/credit-cards', createCreditCardsRouter({
    adminRequired,
    authRequired,
    auditLogs,
    allAsync,
    getAsync,
    runAsync,
  }));

  // Transactions routes
  app.use('/api/transactions', createTransactionsRouter({
    authRequired,
    auditLogs,
    allAsync,
    getAsync,
    runAsync,
  }));

  // Tasks routes
  app.use('/api', createTasksRouter({
    authRequired,
    auditLogs,
    allAsync,
    cache: redisCache,
    getAsync,
    runAsync,
    getUserById,
    sendTaskAlertEmail,
    sendTaskSummaryEmail,
  }));

  // Dashboard routes
  app.use('/api', createDashboardRouter({
    authRequired,
    allAsync,
    cache: redisCache,
    getAsync,
    runAsync,
  }));

  // Quote routes
  app.use('/api', createDailyQuoteRouter());

  // Weather routes
  app.use('/api', createWeatherRouter({
    authRequired,
    cache: redisCache,
    ...routeDependencies,
  }));

  // Notes routes
  app.use('/api', createNotesRouter({
    authRequired,
    auditLogs,
    cache: redisCache,
    emitToUser: realtime.emitToUser,
    ...routeDependencies,
  }));

  // Admin routes
  app.use('/api', createAdminRouter({
    adminRequired,
    auditLogs,
    bcrypt,
    allAsync,
    getAsync,
    runAsync,
  }));

  // AI evaluation harness routes
  app.use('/api/admin', createEvaluationsRouter({
    adminRequired,
    allAsync,
    getAsync,
    runAsync,
  }));
};

module.exports = { registerRoutes };
