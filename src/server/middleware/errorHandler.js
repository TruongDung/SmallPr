/**
 * Error Handling Middleware
 * 
 * Provides centralized error handling for async route handlers
 * and standardized error responses across the application.
 * 
 * @module middleware/errorHandler
 */

const logger = require('../logger');

/**
 * HTTP Error class for throwing errors with specific status codes
 */
class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpError';
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch blocks in every route
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/tasks', asyncHandler(async (req, res) => {
 *   const tasks = await tasksService.getTasks(req.session.userId);
 *   res.json({ tasks });
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handling middleware
 * Logs errors and sends appropriate HTTP responses
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log error with appropriate level
  if (isServerError) {
    logger.error({
      err,
      url: req.url,
      method: req.method,
      userId: req.session?.userId,
      statusCode,
    }, 'Server error occurred');
  } else {
    logger.warn({
      message: err.message,
      url: req.url,
      method: req.method,
      userId: req.session?.userId,
      statusCode,
    }, 'Client error occurred');
  }

  // Build error response
  const errorResponse = {
    error: err.message || 'An unexpected error occurred',
  };

  // Include additional details in non-production environments
  if (process.env.NODE_ENV !== 'production' && err.details) {
    errorResponse.details = err.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
};

module.exports = {
  HttpError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
