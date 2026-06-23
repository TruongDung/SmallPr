const path = require('path');
const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
// Serverless filesystems (e.g. Vercel) are read-only except for /tmp, so file
// logging is disabled there.
const isServerless = Boolean(process.env.VERCEL);

const loggerLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
const betterStackSourceToken = process.env.BETTER_STACK_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN;
const betterStackEndpoint = process.env.BETTER_STACK_ENDPOINT || process.env.LOGTAIL_ENDPOINT || 'https://in.logs.betterstack.com';

// Directory for rotating log files. Override with LOG_DIR. Disable file logging
// entirely with LOG_TO_FILE=false.
const logDir = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');
const fileLoggingEnabled = !isTest && !isServerless && process.env.LOG_TO_FILE !== 'false';

// Rotation settings (overridable via env).
const logMaxSize = process.env.LOG_MAX_SIZE || '20m'; // rotate when a file passes this size
const logFrequency = process.env.LOG_ROTATE_FREQUENCY || 'daily'; // also rotate on this schedule
const logRetentionCount = Number.parseInt(process.env.LOG_RETENTION_COUNT, 10) || 14; // keep N files

const baseOptions = {
  level: loggerLevel,
  base: {
    service: process.env.SERVICE_NAME || 'task-manager-app',
    environment: process.env.NODE_ENV || 'development',
  },
};

const createLogger = () => {
  // Long-lived server: fan out to stdout + a rotating file (+ Better Stack when
  // configured) using pino's worker-thread transports.
  if (fileLoggingEnabled) {
    const targets = [
      // Mirror everything to stdout so the terminal still shows live logs.
      { target: 'pino/file', level: loggerLevel, options: { destination: 1 } },
      // Persisted, size- and time-rotated files: logs/app-<date>.<n>.log
      {
        target: 'pino-roll',
        level: loggerLevel,
        options: {
          file: path.join(logDir, 'app'),
          extension: '.log',
          frequency: logFrequency,
          size: logMaxSize,
          dateFormat: 'yyyy-MM-dd',
          mkdir: true,
          limit: { count: logRetentionCount },
        },
      },
    ];

    if (betterStackSourceToken) {
      targets.push({
        target: '@logtail/pino',
        level: loggerLevel,
        options: { sourceToken: betterStackSourceToken, options: { endpoint: betterStackEndpoint } },
      });
    }

    try {
      return pino(baseOptions, pino.transport({ targets }));
    } catch (error) {
      const fallbackLogger = pino(baseOptions);
      fallbackLogger.warn({ err: error }, 'File logger initialization failed; using stdout logger');
      return fallbackLogger;
    }
  }

  // File logging off (tests / serverless / explicitly disabled): preserve the
  // original stdout-or-Better-Stack behavior.
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
