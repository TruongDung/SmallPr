const createAdminRouter = require('../routes/admin.routes');
const createAuthRouter = require('../routes/auth.routes');
const createCreditCardsRouter = require('../routes/creditCards.routes');
const createDailyQuoteRouter = require('../routes/dailyQuote.routes');
const createDashboardRouter = require('../routes/dashboard.routes');
const createEvaluationsRouter = require('../routes/evaluations.routes');
const createNotesRouter = require('../routes/notes.routes');
const createLunarCalendarRouter = require('../routes/lunarCalendar.routes');
const createSprintsRouter = require('../routes/sprints.routes');
const createTasksRouter = require('../routes/tasks.routes');
const createTransactionsRouter = require('../routes/transactions.routes');
const createUserSettingsRouter = require('../routes/userSettings.routes');
const createWeatherRouter = require('../routes/weather.routes');
const realtime = require('../realtime');

const registerRoutes = (
  app,
  {
    adminRequired,
    authRequired,
    auditLogs,
    featureFlags,
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
  },
) => {
  const routeDependencies = {
    allAsync,
    getAsync,
    queryAsync,
    runAsync,
  };

  // Auth routes
  app.use(
    '/api',
    createAuthRouter({
      auditLogs,
      featureFlags,
      bcrypt,
      getAsync,
      getUserById,
      runAsync,
      sendVerificationEmail,
    }),
  );

  // Credit Cards routes
  app.use(
    '/api/credit-cards',
    createCreditCardsRouter({
      adminRequired,
      authRequired,
      auditLogs,
      allAsync,
      getAsync,
      runAsync,
    }),
  );

  // Transactions routes
  app.use(
    '/api/transactions',
    createTransactionsRouter({
      authRequired,
      auditLogs,
      allAsync,
      getAsync,
      runAsync,
    }),
  );

  // Sprint routes
  app.use(
    '/api',
    createSprintsRouter({
      authRequired,
      allAsync,
      cache: redisCache,
      getAsync,
      runAsync,
    }),
  );

  // User settings routes
  app.use(
    '/api',
    createUserSettingsRouter({
      authRequired,
      allAsync,
      cache: redisCache,
      getAsync,
      runAsync,
    }),
  );

  // Lunar calendar routes
  app.use(
    '/api',
    createLunarCalendarRouter({
      authRequired,
      getUserById,
    }),
  );

  // Tasks routes
  app.use(
    '/api',
    createTasksRouter({
      authRequired,
      auditLogs,
      allAsync,
      cache: redisCache,
      getAsync,
      queryAsync,
      runAsync,
      getUserById,
      sendTaskAlertEmail,
      sendTaskSummaryEmail,
    }),
  );

  // Dashboard routes
  app.use(
    '/api',
    createDashboardRouter({
      authRequired,
      allAsync,
      cache: redisCache,
      getAsync,
      runAsync,
    }),
  );

  // Quote routes
  app.use('/api', createDailyQuoteRouter());

  // Weather routes
  app.use(
    '/api',
    createWeatherRouter({
      authRequired,
      cache: redisCache,
      ...routeDependencies,
    }),
  );

  // Notes routes
  app.use(
    '/api',
    createNotesRouter({
      authRequired,
      auditLogs,
      cache: redisCache,
      emitToUser: realtime.emitToUser,
      ...routeDependencies,
    }),
  );

  // Admin routes
  app.use(
    '/api',
    createAdminRouter({
      adminRequired,
      auditLogs,
      featureFlags,
      bcrypt,
      allAsync,
      getAsync,
      runAsync,
    }),
  );

  // AI evaluation harness routes
  app.use(
    '/api/admin',
    createEvaluationsRouter({
      adminRequired,
      allAsync,
      getAsync,
      runAsync,
    }),
  );
};

module.exports = { registerRoutes };
