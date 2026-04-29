import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ReqType lets callers pass a narrowed request type (e.g. AuthenticatedRequest) while the
// returned function still satisfies Express's RequestHandler signature via the `req as any` cast
const asyncHandler = <ReqType = Request>(
  requestHandler: (req: ReqType, res: Response, next: NextFunction) => Promise<any>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req as any, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
