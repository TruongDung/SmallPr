const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const loggerLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
const betterStackSourceToken = process.env.BETTER_STACK_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN;
const betterStackEndpoint = process.env.BETTER_STACK_ENDPOINT || process.env.LOGTAIL_ENDPOINT || 'https://in.logs.betterstack.com';

const baseOptions = {
  level: loggerLevel,
  base: {
    service: process.env.SERVICE_NAME || 'task-manager-app',
    environment: process.env.NODE_ENV || 'development',
  },
};

const createLogger = () => {
  if (!betterStackSourceToken) {
    return pino(baseOptions);
  }

  try {
    const { logtailPino } = require('@logtail/pino');
    return pino(
      baseOptions,
      logtailPino({
        sourceToken: betterStackSourceToken,
        options: { endpoint: betterStackEndpoint },
      })
    );
  } catch (error) {
    const fallbackLogger = pino(baseOptions);
    fallbackLogger.warn({ err: error }, 'Better Stack logger initialization failed; using stdout logger');
    return fallbackLogger;
  }
};

const logger = createLogger();

module.exports = logger;
