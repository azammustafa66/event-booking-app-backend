import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import APIError from '../utils/APIError';

export function validate(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  // Group messages by field so the client gets { email: ["..."], password: ["..."] }
  const extractedErrors: Record<string, string[]> = {};
  result.array().forEach((err) => {
    if (err.type === 'field') {
      if (!extractedErrors[err.path]) extractedErrors[err.path] = [];

      extractedErrors[err.path]?.push(err.msg);
    }
  });

  return next(new APIError(422, 'Data is not valid', extractedErrors));
}
