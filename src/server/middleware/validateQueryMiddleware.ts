import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Returns a middleware that validates req.query against the provided Zod schema.
 * Throws 400 if validation fails.
 * @param schema - Zod schema to validate against
 */
export function validateQueryMiddleware<T extends object>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      return res.status(400).json({ error: "Query validation failed", details: errorDetails });
    }

    next();
  };
}
