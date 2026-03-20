import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { apiSuccess, apiError } from "@/lib/api/response";

describe("ApiError", () => {
  it("creates error with correct code and status", () => {
    const err = new ApiError("NOT_FOUND", "Project not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Project not found");
  });

  it("allows custom status override", () => {
    const err = new ApiError("BAD_REQUEST", "Invalid", 422);
    expect(err.status).toBe(422);
  });

  it("defaults to 500 for INTERNAL_ERROR", () => {
    const err = new ApiError("INTERNAL_ERROR", "Something broke");
    expect(err.status).toBe(500);
  });
});

describe("apiSuccess", () => {
  it("returns JSON with data and timestamp", async () => {
    const response = apiSuccess({ name: "test" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ name: "test" });
    expect(body.timestamp).toBeDefined();
  });

  it("accepts custom status code", async () => {
    const response = apiSuccess({ id: "123" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns JSON with error code and message", async () => {
    const response = apiError("NOT_FOUND", "Not found", 404);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Not found");
    expect(body.timestamp).toBeDefined();
  });
});
