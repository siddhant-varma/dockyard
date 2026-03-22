/**
 * Standardized API response helpers for DockYard.
 *
 * All API routes should use these helpers to ensure consistent
 * response shapes across the platform.
 *
 * Success: { data: T, timestamp: string }
 * Error:   { error: { code: string, message: string }, timestamp: string }
 */

import { NextResponse } from "next/server";
import { getLogger } from "@/lib/logger";
import { ApiError } from "./errors";

/** Shape of a successful API response. */
interface SuccessResponse<T> {
  data: T;
  timestamp: string;
}

/** Shape of an error API response. */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * Return a successful JSON response.
 *
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 */
export function apiSuccess<T>(
  data: T,
  status = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    { data, timestamp: new Date().toISOString() },
    { status }
  );
}

/**
 * Return a structured error JSON response.
 *
 * @param code - Error code string (e.g., "NOT_FOUND")
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 */
export function apiError(
  code: string,
  message: string,
  status = 500
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: { code, message }, timestamp: new Date().toISOString() },
    { status }
  );
}

/**
 * Wrap an API route handler with automatic error handling.
 * Catches `ApiError` instances and returns structured error responses.
 * Catches unexpected errors and returns 500 with a generic message.
 */
export function withErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof ApiError) {
        return apiError(err.code, err.message, err.status);
      }
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      getLogger().error({ err }, "Unhandled API error");
      return apiError("INTERNAL_ERROR", message, 500);
    }
  };
}
