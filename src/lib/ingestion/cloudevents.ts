/**
 * CloudEvents v1.0 parser and validator.
 *
 * Parses and validates incoming events against the CloudEvents specification
 * v1.0. Supports both structured content mode (JSON body) and binary content
 * mode (CloudEvents attributes in HTTP headers, data in body).
 *
 * DockYard uses CloudEvents as the standard envelope for all ingested signals:
 * GitHub webhooks, deployment events, health check results, and DIP protocol messages.
 *
 * @see https://cloudevents.io/
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */

import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("ingestion.cloudevents");

/** CloudEvents v1.0 required and optional attributes. */
export interface CloudEvent<T = unknown> {
  /** CloudEvents specification version (must be "1.0"). */
  specversion: "1.0";
  /** Unique identifier for this event. */
  id: string;
  /** URI-reference identifying the event producer. */
  source: string;
  /** Event type identifier (e.g., "cc.dockyard.deployment.completed"). */
  type: string;
  /** Timestamp of when the event occurred (ISO 8601). */
  time: string;
  /** Content type of the data attribute (optional). */
  datacontenttype?: string;
  /** URI identifying the schema of the data (optional). */
  dataschema?: string;
  /** Event subject for routing (optional). */
  subject?: string;
  /** Event payload. */
  data?: T;
}

/** Validation error describing which field(s) failed. */
export interface CloudEventValidationError {
  /** Which field failed validation. */
  field: string;
  /** Human-readable description of the validation failure. */
  message: string;
}

/** Result of parsing a CloudEvent: either a valid event or validation errors. */
export type CloudEventParseResult<T = unknown> =
  | { ok: true; event: CloudEvent<T> }
  | { ok: false; errors: CloudEventValidationError[] };

/**
 * Parse and validate a CloudEvent from HTTP request headers and body.
 *
 * Supports two content modes:
 * - **Structured**: Content-Type is application/cloudevents+json; all attributes in body
 * - **Binary**: CloudEvents attributes in ce-* headers; data in body
 *
 * @param headers - HTTP request headers (as a plain object)
 * @param body - Parsed request body (JSON object or raw string)
 * @returns Validated CloudEvent or array of validation errors
 */
export function parseCloudEvent<T = unknown>(
  headers: Record<string, string | undefined>,
  body: unknown
): CloudEventParseResult<T> {
  const contentType = headers["content-type"] ?? "";

  // Structured content mode: all attributes in JSON body
  if (contentType.includes("application/cloudevents+json")) {
    const result = parseStructuredMode<T>(body);
    if (result.ok) {
      log.info(
        { eventId: result.event.id, type: result.event.type, source: result.event.source, mode: "structured" },
        "CloudEvent received"
      );
    } else {
      log.warn(
        { errors: result.errors, mode: "structured" },
        "CloudEvent validation failed"
      );
    }
    return result;
  }

  // Binary content mode: attributes in ce-* headers, data in body
  const result = parseBinaryMode<T>(headers, body);
  if (result.ok) {
    log.info(
      { eventId: result.event.id, type: result.event.type, source: result.event.source, mode: "binary" },
      "CloudEvent received"
    );
  } else {
    log.warn(
      { errors: result.errors, mode: "binary" },
      "CloudEvent validation failed"
    );
  }
  return result;
}

/**
 * Parse structured content mode where all CloudEvents attributes
 * are in the JSON body alongside the data.
 */
function parseStructuredMode<T>(body: unknown): CloudEventParseResult<T> {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errors: [{ field: "body", message: "Body must be a JSON object" }],
    };
  }

  const raw = body as Record<string, unknown>;
  return validateCloudEvent<T>({
    specversion: raw.specversion,
    id: raw.id,
    source: raw.source,
    type: raw.type,
    time: raw.time,
    datacontenttype: raw.datacontenttype,
    dataschema: raw.dataschema,
    subject: raw.subject,
    data: raw.data,
  });
}

/**
 * Parse binary content mode where CloudEvents attributes are
 * in ce-* HTTP headers and the body is the event data.
 */
function parseBinaryMode<T>(
  headers: Record<string, string | undefined>,
  body: unknown
): CloudEventParseResult<T> {
  return validateCloudEvent<T>({
    specversion: headers["ce-specversion"],
    id: headers["ce-id"],
    source: headers["ce-source"],
    type: headers["ce-type"],
    time: headers["ce-time"],
    datacontenttype: headers["content-type"],
    dataschema: headers["ce-dataschema"],
    subject: headers["ce-subject"],
    data: body,
  });
}

/**
 * Validate all required and optional CloudEvents v1.0 fields.
 */
function validateCloudEvent<T>(raw: {
  specversion: unknown;
  id: unknown;
  source: unknown;
  type: unknown;
  time: unknown;
  datacontenttype?: unknown;
  dataschema?: unknown;
  subject?: unknown;
  data?: unknown;
}): CloudEventParseResult<T> {
  const errors: CloudEventValidationError[] = [];

  // Required: specversion
  if (raw.specversion !== "1.0") {
    errors.push({
      field: "specversion",
      message: `Must be "1.0", got "${String(raw.specversion)}"`,
    });
  }

  // Required: id
  if (typeof raw.id !== "string" || raw.id === "") {
    errors.push({
      field: "id",
      message: "Must be a non-empty string",
    });
  }

  // Required: source
  if (typeof raw.source !== "string" || raw.source === "") {
    errors.push({
      field: "source",
      message: "Must be a non-empty URI-reference string",
    });
  }

  // Required: type
  if (typeof raw.type !== "string" || raw.type === "") {
    errors.push({
      field: "type",
      message: "Must be a non-empty string",
    });
  }

  // Required for DockYard: time (optional in spec, but we require it)
  if (typeof raw.time !== "string" || raw.time === "") {
    errors.push({
      field: "time",
      message: "Must be a non-empty ISO 8601 timestamp string",
    });
  } else if (isNaN(Date.parse(raw.time as string))) {
    errors.push({
      field: "time",
      message: "Must be a valid ISO 8601 timestamp",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event: CloudEvent<T> = {
    specversion: "1.0",
    id: raw.id as string,
    source: raw.source as string,
    type: raw.type as string,
    time: raw.time as string,
    data: raw.data as T | undefined,
  };

  if (typeof raw.datacontenttype === "string") {
    event.datacontenttype = raw.datacontenttype;
  }
  if (typeof raw.dataschema === "string") {
    event.dataschema = raw.dataschema;
  }
  if (typeof raw.subject === "string") {
    event.subject = raw.subject;
  }

  return { ok: true, event };
}
