/**
 * Reusable Zod validation middleware for Express routes.
 * Mutates body, params, and query in place (compatible with Express 5 getters).
 */
export function validate(schema) {
  return async (req, _res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params !== undefined && req.params) {
        Object.assign(req.params, parsed.params);
      }

      next();
    } catch (error) {
      next(error); // central error-handler handles ZodError cleanly
    }
  };
}
