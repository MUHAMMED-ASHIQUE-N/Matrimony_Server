// Errors
export {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    RateLimitError,
    DatabaseError
} from './errors/AppError';

// Utils
export { Result, combineResults, tryCatch } from './utils/Result';
export {
    encodeCursor,
    decodeCursor,
    createCursorFromRow,
    buildCursorWhereClause,
    type CursorData,
    type CursorPaginatedResult
} from './utils/CursorPagination';
export {
    sendSuccess,
    sendError,
    sendPaginatedSuccess,
    HttpStatus,
    type SuccessResponse,
    type ErrorResponse,
    type ResponseMeta
} from './utils/ResponseFormatter';

// Middleware
export { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
export { asyncHandler, typedAsyncHandler } from './middleware/asyncHandler.middleware';
export { rateLimiter, RateLimiters } from './middleware/rateLimiter.middleware';
export { requestSanitizer, lightSanitizer } from './middleware/requestSanitizer.middleware';

// Infrastructure
export {
    CacheManager,
    CacheKeyBuilder,
    CacheTTL,
    type ICacheAdapter
} from './infrastructure/cache';
export { EmailService, sendOtpEmail } from './infrastructure/email';
