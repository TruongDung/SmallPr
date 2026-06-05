/**
 * Validation Helper Utilities
 * 
 * Provides common validation and normalization functions
 * used across the application.
 * 
 * @module utils/validationHelper
 */

const { z } = require('zod');

/**
 * Normalize and validate email address
 * 
 * @param {string} email - Email address
 * @returns {string|null} Normalized email or null if invalid
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const normalized = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return null;
  }
  
  return normalized;
};

/**
 * Normalize text input
 * 
 * @param {string} text - Input text
 * @param {Object} options
 * @param {number} options.maxLength - Maximum length
 * @param {boolean} options.allowEmpty - Allow empty strings
 * @returns {string|null} Normalized text or null if invalid
 */
const normalizeText = (text, { maxLength = Infinity, allowEmpty = false } = {}) => {
  if (text === null || text === undefined) {
    return allowEmpty ? '' : null;
  }
  
  const normalized = String(text).trim();
  
  if (!allowEmpty && normalized.length === 0) {
    return null;
  }
  
  if (normalized.length > maxLength) {
    return null;
  }
  
  return normalized;
};

/**
 * Normalize and validate URL
 * 
 * @param {string} url - URL string
 * @param {Object} options
 * @param {string[]} options.allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @param {number} options.maxLength - Maximum URL length
 * @returns {string|null} Normalized URL or null if invalid
 */
const normalizeUrl = (url, { allowedProtocols = ['http:', 'https:'], maxLength = 2048 } = {}) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const normalized = url.trim();
  
  if (normalized.length > maxLength) {
    return null;
  }
  
  try {
    const parsed = new URL(normalized);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return normalized;
  } catch (error) {
    return null;
  }
};

/**
 * Normalize and validate numeric amount
 * 
 * @param {*} amount - Amount value
 * @param {Object} options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {number} options.decimals - Number of decimal places
 * @returns {number|null} Normalized amount or null if invalid
 */
const normalizeAmount = (amount, { min = 0, max = Infinity, decimals = 2 } = {}) => {
  if (amount === undefined || amount === null || amount === '') {
    return null;
  }
  
  const normalized = Number(amount);
  
  if (!Number.isFinite(normalized)) {
    return null;
  }
  
  if (normalized < min || normalized > max) {
    return null;
  }
  
  // Round to specified decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.round(normalized * multiplier) / multiplier;
};

/**
 * Validate value against an enum
 * 
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {*} defaultValue - Default value if invalid (optional)
 * @returns {*} Validated value or default
 */
const validateEnum = (value, allowedValues, defaultValue = null) => {
  if (allowedValues.includes(value)) {
    return value;
  }
  return defaultValue;
};

/**
 * Create Zod schema for common field types
 */
const schemas = {
  /**
   * Email schema
   */
  email: z.string().email().toLowerCase().trim(),
  
  /**
   * Username schema
   */
  username: z.string().min(3).max(50).trim(),
  
  /**
   * Password schema
   */
  password: z.string().min(8).max(100),
  
  /**
   * Title schema
   */
  title: z.string().min(1).max(255).trim(),
  
  /**
   * Description schema (optional long text)
   */
  description: z.string().max(5000).trim().optional(),
  
  /**
   * URL schema
   */
  url: z.string().url().max(2048),
  
  /**
   * Positive integer ID
   */
  id: z.number().int().positive(),
  
  /**
   * Boolean flag
   */
  boolean: z.boolean().or(z.string().transform(val => val === 'true')),
  
  /**
   * ISO date string
   */
  isoDate: z.string().datetime(),
  
  /**
   * Positive amount (currency)
   */
  amount: z.number().nonnegative().max(9999999999.99),
};

/**
 * Validate request body against Zod schema
 * Returns either validated data or validation errors
 * 
 * @param {Object} schema - Zod schema
 * @param {*} data - Data to validate
 * @returns {Object} Result with { success, data?, errors? }
 */
const validateSchema = (schema, data) => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  // Format Zod errors into readable format
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  
  return {
    success: false,
    errors,
  };
};

/**
 * Create validation middleware for Express
 * 
 * @param {Object} schema - Zod schema
 * @param {string} source - Where to validate from ('body', 'query', 'params')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/tasks',
 *   validate(taskSchema, 'body'),
 *   async (req, res) => { ... }
 * );
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const result = validateSchema(schema, data);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: result.errors,
      });
    }
    
    // Attach validated data to request
    req.validated = result.data;
    next();
  };
};

/**
 * Sanitize HTML input to prevent XSS
 * Basic sanitization - for production, use a library like DOMPurify
 * 
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Basic sanitization - strip script tags
  // In production, use a proper HTML sanitization library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
};

module.exports = {
  normalizeEmail,
  normalizeText,
  normalizeUrl,
  normalizeAmount,
  validateEnum,
  schemas,
  validateSchema,
  validate,
  sanitizeHtml,
};
