// Generic request-validation middleware factory.
//
// Given a Zod schema, it parses the chosen part of the request (`body` by
// default, or `query` / `params`), responds with a 400 and the first validation
// message on failure, and on success exposes the normalized result on
// `req.validated` so route handlers stay free of validation logic.
//
// Usage:
//   router.post('/', validateRequest(createTransactionSchema), handler);
//   router.get('/', validateRequest(querySchema, 'query'), handler);

const validateRequest =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const [firstIssue] = result.error.issues;
      const message = firstIssue ? firstIssue.message : 'Invalid request';
      return res.status(400).json({ error: message });
    }

    req.validated = result.data;
    next();
  };

module.exports = { validateRequest };
