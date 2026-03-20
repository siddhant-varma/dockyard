# lib/api

Structured API response helpers and typed error handling for DockYard.

## What it does

Enforces a consistent JSON envelope across all API routes so clients always
receive predictable shapes. Every response — success or error — includes a
top-level `timestamp` field.

**Success shape:** `{ data: T, timestamp: string }`
**Error shape:** `{ error: { code: string, message: string }, timestamp: string }`

## Key exports

### `response.ts`

| Export | Description |
|--------|-------------|
| `apiSuccess(data, status?)` | Returns a `NextResponse` with the success envelope. Default status 200. |
| `apiError(code, message, status?)` | Returns a `NextResponse` with the error envelope. Default status 500. |
| `withErrorHandler(handler)` | Wraps a route handler — catches `ApiError` and returns structured responses; maps unexpected errors to 500. |

### `errors.ts`

| Export | Description |
|--------|-------------|
| `ApiError` | Typed error class. Carries `code: ApiErrorCode` and `status: number`. Throw from service-layer code; `withErrorHandler` converts it to a JSON response. |
| `ApiErrorCode` | Union of standard codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR` |

## Usage pattern

```ts
// API route
export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth();
  const result = await someService.getData();
  return apiSuccess(result);
});

// Service layer
throw new ApiError("NOT_FOUND", "Project not found");
```

Error codes map automatically to HTTP status codes (e.g., `NOT_FOUND` → 404,
`UNAUTHORIZED` → 401) unless overridden in the `ApiError` constructor.
