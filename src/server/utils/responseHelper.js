/**
 * Response Helper Utilities
 * 
 * Provides standardized response formatting and common response patterns
 * across the application for consistency.
 * 
 * @module utils/responseHelper
 */

/**
 * Send success response with data
 * 
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Optional metadata
 */
const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  const response = { ...data };
  
  if (Object.keys(meta).length > 0) {
    response._meta = meta;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * 
 * @param {Response} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} location - Optional Location header value
 */
const sendCreated = (res, data, location = null) => {
  if (location) {
    res.set('Location', location);
  }
  
  res.status(201).json(data);
};

/**
 * Send no content response (204)
 * 
 * @param {Response} res - Express response object
 */
const sendNoContent = (res) => {
  res.status(204).send();
};

/**
 * Send error response
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} details - Optional error details
 */
const sendError = (res, message, statusCode = 400, details = null) => {
  const response = { error: message };
  
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send validation error response (400)
 * 
 * @param {Response} res - Express response object
 * @param {string|Array} errors - Validation error(s)
 */
const sendValidationError = (res, errors) => {
  const response = {
    error: 'Validation failed',
  };
  
  if (Array.isArray(errors)) {
    response.errors = errors;
  } else {
    response.message = errors;
  }
  
  res.status(400).json(response);
};

/**
 * Send not found response (404)
 * 
 * @param {Response} res - Express response object
 * @param {string} resource - Resource type (e.g., 'Task', 'User')
 */
const sendNotFound = (res, resource = 'Resource') => {
  res.status(404).json({
    error: `${resource} not found`,
  });
};

/**
 * Send unauthorized response (401)
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  res.status(401).json({ error: message });
};

/**
 * Send forbidden response (403)
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Forbidden') => {
  res.status(403).json({ error: message });
};

/**
 * Send conflict response (409)
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
const sendConflict = (res, message = 'Resource already exists') => {
  res.status(409).json({ error: message });
};

/**
 * Send server error response (500)
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
const sendServerError = (res, message = 'Internal server error') => {
  res.status(500).json({ error: message });
};

/**
 * Send paginated response
 * 
 * @param {Response} res - Express response object
 * @param {Array} items - Items for current page
 * @param {Object} pagination
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total number of items
 */
const sendPaginated = (res, items, { page, limit, total }) => {
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

/**
 * Response builder for fluent API
 * 
 * @example
 * ResponseBuilder.success(res)
 *   .withData({ tasks })
 *   .withMeta({ cached: true })
 *   .send();
 */
class ResponseBuilder {
  constructor(res) {
    this.res = res;
    this.statusCode = 200;
    this.data = {};
    this.meta = {};
    this.headers = {};
  }
  
  static success(res) {
    return new ResponseBuilder(res);
  }
  
  withStatus(statusCode) {
    this.statusCode = statusCode;
    return this;
  }
  
  withData(data) {
    this.data = { ...this.data, ...data };
    return this;
  }
  
  withMeta(meta) {
    this.meta = { ...this.meta, ...meta };
    return this;
  }
  
  withHeader(key, value) {
    this.headers[key] = value;
    return this;
  }
  
  withHeaders(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }
  
  send() {
    // Set headers
    Object.entries(this.headers).forEach(([key, value]) => {
      this.res.set(key, value);
    });
    
    // Build response
    const response = { ...this.data };
    if (Object.keys(this.meta).length > 0) {
      response._meta = this.meta;
    }
    
    this.res.status(this.statusCode).json(response);
  }
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendServerError,
  sendPaginated,
  ResponseBuilder,
};
