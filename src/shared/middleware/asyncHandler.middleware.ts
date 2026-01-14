import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Handler Wrapper
 * 
 * @description Wraps async route handlers to catch errors automatically.
 * Eliminates try/catch boilerplate in every controller method.
 * 
 * @why Without this, each async handler needs try/catch:
 * ```ts
 * async function getUser(req, res, next) {
 *   try {
 *     const user = await userService.find(id);
 *     res.json(user);
 *   } catch (err) {
 *     next(err); // Easy to forget!
 *   }
 * }
 * ```
 * 
 * With asyncHandler:
 * ```ts
 * const getUser = asyncHandler(async (req, res) => {
 *   const user = await userService.find(id);
 *   res.json(user);
 * }); // Errors auto-forwarded to error middleware
 * ```
 * 
 * @complexity O(1) - Just wraps the function
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Type-safe async handler with custom request type
 * Useful for authenticated routes with custom user property
 */
export function typedAsyncHandler<TRequest extends Request>(
    fn: (req: TRequest, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req as TRequest, res, next)).catch(next);
    };
}
