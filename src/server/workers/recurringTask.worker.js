const logger = require('../logger');
const { createRecurrenceService } = require('../services/recurrence.service');

const DEFAULT_INTERVAL_MS = 60 * 1000;

const createRecurringTaskWorker = ({
  allAsync,
  auditLogs,
  getAsync,
  getUserById,
  queryAsync,
  runAsync,
  sendTaskAlertEmail,
  intervalMs = DEFAULT_INTERVAL_MS,
}) => {
  const recurrence = createRecurrenceService({
    allAsync,
    auditLogs,
    getAsync,
    getUserById,
    queryAsync,
    runAsync,
    sendTaskAlertEmail,
  });
  let timer = null;
  let running = false;

  const runOnce = async () => {
    if (running) return { skipped: true };
    running = true;
    try {
      const result = await recurrence.processDueRules({ limit: 250 });
      if (result.generated.length) {
        logger.info({ generated: result.generated.length }, 'Generated recurring task occurrences');
      }
      return result;
    } catch (error) {
      logger.error({ err: error }, 'Recurring task worker failed');
      return { error };
    } finally {
      running = false;
    }
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(runOnce, intervalMs);
    timer.unref?.();
    runOnce();
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  return {
    runOnce,
    start,
    stop,
  };
};

module.exports = {
  createRecurringTaskWorker,
};
