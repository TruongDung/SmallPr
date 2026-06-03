const logger = require('./logger');

test('exports a pino-compatible logger', () => {
  expect(typeof logger.info).toBe('function');
  expect(typeof logger.warn).toBe('function');
  expect(typeof logger.error).toBe('function');
  expect(typeof logger.child).toBe('function');
});
