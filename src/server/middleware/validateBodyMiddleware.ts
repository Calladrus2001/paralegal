import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Returns a middleware that validates req.body against the provided Zod schema.
 * Throws 400 if validation fails.
 * @param schema - Zod schema to validate against
 */
export function validateBodyMiddleware<T extends object>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    if (typeof body !== "object" || body === null) {
      return res.status(400).json({ error: "Request body must be an object" });
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errorDetails = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));
      return res.status(400).json({ error: "Validation failed", details: errorDetails });
    }

    next();
  };
}
