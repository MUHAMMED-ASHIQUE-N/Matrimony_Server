import { Request } from 'express';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

/**
 * JWT Payload structure
 */
export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Verification type enum
 */
export type VerificationType = 'EMAIL' | 'PHONE';

/**
 * Standard API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Pagination parameters (Offset-based - Legacy)
 * @deprecated Use CursorPaginationParams for better performance
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Cursor-based pagination parameters
 * 
 * @description O(1) pagination using indexed column seeks.
 * The cursor is a base64-encoded timestamp or ID.
 * 
 * @example
 * // First page
 * { limit: 20 }
 * // Next page using cursor from previous response
 * { limit: 20, cursor: "MjAyNi0wMS0xM1QxNDozMDowMFo=" }
 */
export interface CursorPaginationParams {
  /** Max items per page (default: 20, max: 100) */
  limit: number;
  /** Opaque cursor from previous response (omit for first page) */
  cursor?: string;
  /** Sort direction */
  direction?: 'asc' | 'desc';
}

/**
 * Paginated response with cursor support
 * 
 * @description Supports both legacy offset and cursor pagination.
 * Use `nextCursor` for cursor-based, `totalPages/currentPage` for offset.
 * 
 * @typeParam T - Type of items in the data array
 */
export interface PaginatedResult<T> {
  data: T[];
  /** Cursor for next page (null if no more pages) */
  nextCursor: string | null;
  /** Whether more pages exist */
  hasMore: boolean;
  /** [Legacy] Total pages - only populated for offset pagination */
  totalPages?: number;
  /** [Legacy] Current page number - only populated for offset pagination */
  currentPage?: number;
  /** Total count of items matching criteria */
  totalCount?: number;
}

/**
 * Match criteria for profile search
 */
export interface MatchCriteria {
  targetGender: string;
  minAge: number;
  maxAge: number;
  search?: string;
  location?: string;
  job?: string;
  /** @deprecated Use cursor instead */
  page?: number;
  limit?: number;
  /** Cursor for pagination (takes precedence over page) */
  cursor?: string;
}

/**
 * Profile data transfer object
 */
export interface ProfileDTO {
  firstName: string;
  lastName?: string;
  contact?: string;
  gender: 'Male' | 'Female' | 'Other';
  profileCreatedFor: 'Self' | 'Son' | 'Daughter' | 'Sibling' | 'Friend';
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  caste?: string;
  religion?: string;
  motherTongue?: string;
  maritalStatus?: string;
  education?: string;
  college?: string;
  passoutYear?: number;
  occupation?: string;
  company?: string;
  annualIncome?: string;
  presentCountry?: string;
  financialStatus?: string;
  tagline?: string;
  aboutMe?: string;
  photos?: string[];
  userProfile?: string;
  hobbies?: string[];
  interests?: string[];
  dietPreference?: string;
  smoking?: string;
  drinking?: string;
  partnerMinAge?: number;
  partnerMaxAge?: number;
  partnerMinHeight?: number;
  partnerMaxHeight?: number;
  partnerMaritalPreference?: string;
  partnerReligionPreference?: string;
}
