/**
 * Structured API error types for DockYard.
 *
 * All API routes return errors in a consistent format:
 * { error: { code: string, message: string }, timestamp: string }
 *
 * Use `ApiError` to throw typed errors from service-layer code.
 * The `withErrorHandler` wrapper in response.ts catches these and
 * returns properly formatted HTTP responses.
 */

/** Standard error codes used across all API endpoints. */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/** Maps error codes to their default HTTP status codes. */
const STATUS_MAP: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

/**
 * Typed API error that carries a code, message, and HTTP status.
 * Throw this from service-layer code — the API route wrapper handles
 * converting it to a structured JSON response.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status ?? STATUS_MAP[code];
  }
}
