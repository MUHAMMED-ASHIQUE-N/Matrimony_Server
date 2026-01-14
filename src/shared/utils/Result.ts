/**
 * Result Pattern - Functional Error Handling
 * 
 * @description Represents the outcome of an operation that can either succeed or fail.
 * Eliminates try/catch boilerplate and makes error handling explicit.
 * 
 * @why Using Result<T, E> instead of throwing errors:
 * - Makes error handling explicit in function signatures
 * - Prevents uncaught exceptions from crashing the app
 * - Enables railway-oriented programming (chain operations)
 * 
 * @example
 * const result = await userService.findById(id);
 * if (result.isFailure) {
 *   return res.status(404).json({ error: result.error });
 * }
 * return res.json(result.value);
 */

export class Result<T, E = Error> {
    private readonly _isSuccess: boolean;
    private readonly _value?: T;
    private readonly _error?: E;

    private constructor(isSuccess: boolean, value?: T, error?: E) {
        this._isSuccess = isSuccess;
        this._value = value;
        this._error = error;

        Object.freeze(this);
    }

    get isSuccess(): boolean {
        return this._isSuccess;
    }

    get isFailure(): boolean {
        return !this._isSuccess;
    }

    /**
     * Get the success value
     * @throws Error if result is failure
     */
    get value(): T {
        if (!this._isSuccess) {
            throw new Error('Cannot get value of a failed result. Check isSuccess first.');
        }
        return this._value as T;
    }

    /**
     * Get the error
     * @throws Error if result is success
     */
    get error(): E {
        if (this._isSuccess) {
            throw new Error('Cannot get error of a successful result. Check isFailure first.');
        }
        return this._error as E;
    }

    /**
     * Create a successful result
     */
    static ok<T>(value: T): Result<T, never> {
        return new Result<T, never>(true, value);
    }

    /**
     * Create a failure result
     */
    static fail<E>(error: E): Result<never, E> {
        return new Result<never, E>(false, undefined, error);
    }

    /**
     * Map the success value to a new value
     * Time Complexity: O(1)
     */
    map<U>(fn: (value: T) => U): Result<U, E> {
        if (this._isSuccess) {
            return Result.ok(fn(this._value as T));
        }
        return Result.fail(this._error as E);
    }

    /**
     * Chain another Result-returning function
     * Time Complexity: O(1) + complexity of fn
     */
    flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
        if (this._isSuccess) {
            return fn(this._value as T);
        }
        return Result.fail(this._error as E);
    }

    /**
     * Get value or default if failure
     */
    getOrElse(defaultValue: T): T {
        if (this._isSuccess) {
            return this._value as T;
        }
        return defaultValue;
    }

    /**
     * Execute a callback based on result state
     */
    match<U>(handlers: { onSuccess: (value: T) => U; onFailure: (error: E) => U }): U {
        if (this._isSuccess) {
            return handlers.onSuccess(this._value as T);
        }
        return handlers.onFailure(this._error as E);
    }
}

/**
 * Combine multiple results into a single result
 * Time Complexity: O(n) where n is number of results
 * 
 * @returns Result with array of values if all succeed, or first error
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];

    for (const result of results) {
        if (result.isFailure) {
            return Result.fail(result.error);
        }
        values.push(result.value);
    }

    return Result.ok(values);
}

/**
 * Wrap a promise in a Result
 * Catches any thrown errors and returns as failure
 */
export async function tryCatch<T>(
    promise: Promise<T>
): Promise<Result<T, Error>> {
    try {
        const value = await promise;
        return Result.ok(value);
    } catch (error) {
        return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
}
