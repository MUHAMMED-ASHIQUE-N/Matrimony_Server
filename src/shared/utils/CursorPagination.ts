/**
 * Cursor Pagination Utilities
 * 
 * @description URL-safe Base64 encoding/decoding for cursor-based pagination.
 * Cursor contains the sort key(s) needed to fetch the next page.
 * 
 * @why Cursor pagination is O(1) vs offset which is O(N) for SKIP operations.
 * On page 1000 with 10 items/page, offset must skip 10000 rows.
 * Cursor uses WHERE clause with indexed columns for instant access.
 */

/**
 * Cursor data structure - stores pagination state
 */
export interface CursorData {
    /** Primary sort column value (e.g., created_at timestamp) */
    sortValue: string | number | Date;
    /** Unique identifier for tie-breaking (e.g., profile_id) */
    id: string;
    /** Optional: Additional sort key for composite sorting */
    secondarySortValue?: string | number;
}

/**
 * Paginated response structure
 */
export interface CursorPaginatedResult<T> {
    /** Array of items for current page */
    items: T[];
    /** Cursor for next page, null if no more pages */
    nextCursor: string | null;
    /** Cursor for previous page (optional, for bidirectional) */
    prevCursor?: string | null;
    /** Whether more items exist */
    hasMore: boolean;
    /** Total count (optional, expensive query) */
    totalCount?: number;
}

/**
 * Encode cursor data to URL-safe Base64 string
 * Time Complexity: O(1)
 * 
 * @param data - Cursor data to encode
 * @returns URL-safe Base64 encoded string
 * 
 * @example
 * const cursor = encodeCursor({ sortValue: new Date(), id: 'abc-123' });
 * // Returns: 'eyJzIjoiMjAyNC0wMS0xM1QxMDowMDowMC4wMDBaIiwiaWQiOiJhYmMtMTIzIn0'
 */
export function encodeCursor(data: CursorData): string {
    const payload = {
        s: data.sortValue instanceof Date ? data.sortValue.toISOString() : data.sortValue,
        id: data.id,
        ss: data.secondarySortValue
    };

    // Remove undefined values
    const cleanPayload = JSON.stringify(payload, (_, v) => v === undefined ? undefined : v);

    // URL-safe Base64: replace + with -, / with _, remove =
    return Buffer.from(cleanPayload)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Decode URL-safe Base64 cursor to data object
 * Time Complexity: O(1)
 * 
 * @param cursor - URL-safe Base64 encoded cursor string
 * @returns Decoded cursor data or null if invalid
 * 
 * @example
 * const data = decodeCursor('eyJzIjoiMjAyNC0wMS0xM1QxMDowMDowMC4wMDBaIiwiaWQiOiJhYmMtMTIzIn0');
 * // Returns: { sortValue: '2024-01-13T10:00:00.000Z', id: 'abc-123' }
 */
export function decodeCursor(cursor: string): CursorData | null {
    try {
        // Restore Base64 padding and characters
        let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
        const padding = (4 - (base64.length % 4)) % 4;
        base64 += '='.repeat(padding);

        const json = Buffer.from(base64, 'base64').toString('utf-8');
        const payload = JSON.parse(json);

        return {
            sortValue: payload.s,
            id: payload.id,
            secondarySortValue: payload.ss
        };
    } catch {
        return null;
    }
}

/**
 * Create cursor from a database row
 * 
 * @param row - Database row with timestamp and id
 * @param sortColumn - Column used for sorting (default: 'created_at')
 * @param idColumn - Column for unique ID (default: 'profile_id')
 */
export function createCursorFromRow<T extends Record<string, unknown>>(
    row: T,
    sortColumn: string = 'created_at',
    idColumn: string = 'profile_id'
): string {
    const sortValue = row[sortColumn];
    const id = row[idColumn];

    if (sortValue === undefined || id === undefined) {
        throw new Error(`Row missing required columns: ${sortColumn}, ${idColumn}`);
    }

    return encodeCursor({
        sortValue: sortValue as string | number | Date,
        id: String(id)
    });
}

/**
 * Build SQL WHERE clause for cursor pagination
 * 
 * @why Using (col1, col2) < ($1, $2) syntax for composite key comparison
 * This ensures correct ordering even with duplicate timestamps
 * 
 * @param cursor - Decoded cursor data
 * @param direction - 'next' for forward, 'prev' for backward
 * @returns SQL fragment and parameter values
 */
export function buildCursorWhereClause(
    cursor: CursorData,
    direction: 'next' | 'prev' = 'next'
): { sql: string; values: unknown[] } {
    const operator = direction === 'next' ? '<' : '>';

    return {
        sql: `(created_at, profile_id) ${operator} ($?, $?)`,
        values: [cursor.sortValue, cursor.id]
    };
}
