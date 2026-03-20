/**
 * Prometheus exposition format parser.
 *
 * Parses the text-based Prometheus exposition format into structured
 * metric objects. Supports all four Prometheus metric types:
 * counter, gauge, histogram, and summary.
 *
 * Format reference: https://prometheus.io/docs/instrumenting/exposition_formats/
 *
 * Example input:
 * ```
 * # HELP http_requests_total Total HTTP requests
 * # TYPE http_requests_total counter
 * http_requests_total{method="GET",status="200"} 1234
 * ```
 */

/** Prometheus metric types as declared in TYPE comments. */
export type PrometheusType = "counter" | "gauge" | "histogram" | "summary" | "untyped";

/** A single parsed metric line from Prometheus exposition format. */
export interface ParsedMetric {
  /** Metric name (e.g., "http_requests_total"). */
  name: string;
  /** Label key-value pairs (e.g., { method: "GET", status: "200" }). */
  labels: Record<string, string>;
  /** Numeric value of the metric. */
  value: number;
  /** Metric type from the TYPE comment, or "untyped" if not declared. */
  type: PrometheusType;
}

/**
 * Parse Prometheus exposition format text into an array of structured metrics.
 *
 * Handles:
 * - HELP lines (skipped — informational only)
 * - TYPE lines (associates metric names with types)
 * - Metric lines with optional labels
 * - Histogram bucket lines (le label) and _count/_sum suffixes
 * - Summary quantile lines (quantile label) and _count/_sum suffixes
 * - NaN and +Inf/-Inf values
 *
 * @param body - Raw Prometheus exposition text
 * @returns Array of parsed metrics
 */
export function parsePrometheusText(body: string): ParsedMetric[] {
  const lines = body.split("\n");
  const typeMap = new Map<string, PrometheusType>();
  const metrics: ParsedMetric[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines
    if (line === "") continue;

    // Skip HELP comments — informational only
    if (line.startsWith("# HELP")) continue;

    // Parse TYPE declarations
    if (line.startsWith("# TYPE")) {
      const typeInfo = parseTypeLine(line);
      if (typeInfo) {
        typeMap.set(typeInfo.name, typeInfo.type);
      }
      continue;
    }

    // Skip other comments
    if (line.startsWith("#")) continue;

    // Parse metric line
    const parsed = parseMetricLine(line, typeMap);
    if (parsed) {
      metrics.push(parsed);
    }
  }

  return metrics;
}

/**
 * Parse a TYPE comment line into a metric name and type.
 *
 * @param line - A line like "# TYPE http_requests_total counter"
 * @returns Parsed name and type, or null if malformed
 */
function parseTypeLine(
  line: string
): { name: string; type: PrometheusType } | null {
  // Format: # TYPE <metric_name> <type>
  const match = line.match(/^#\s+TYPE\s+(\S+)\s+(\S+)$/);
  if (!match) return null;

  const name = match[1];
  const rawType = match[2].toLowerCase();

  const validTypes: PrometheusType[] = [
    "counter",
    "gauge",
    "histogram",
    "summary",
    "untyped",
  ];
  const type = validTypes.includes(rawType as PrometheusType)
    ? (rawType as PrometheusType)
    : "untyped";

  return { name, type };
}

/**
 * Parse a single metric line into a ParsedMetric.
 *
 * Handles three formats:
 * - `metric_name value` (no labels)
 * - `metric_name{label="val",...} value` (with labels)
 * - `metric_name{label="val",...} value timestamp` (with optional timestamp, ignored)
 *
 * @param line - A metric line from the exposition text
 * @param typeMap - Map of metric base names to their declared types
 * @returns Parsed metric or null if the line is malformed
 */
function parseMetricLine(
  line: string,
  typeMap: Map<string, PrometheusType>
): ParsedMetric | null {
  // Match: name{labels} value [timestamp]
  // or: name value [timestamp]
  const labeledMatch = line.match(
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)\{([^}]*)\}\s+(\S+)(?:\s+\S+)?$/
  );
  const plainMatch = line.match(
    /^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+(\S+)(?:\s+\S+)?$/
  );

  if (labeledMatch) {
    const name = labeledMatch[1];
    const labels = parseLabels(labeledMatch[2]);
    const value = parseMetricValue(labeledMatch[3]);
    if (value === null) return null;

    return {
      name,
      labels,
      value,
      type: resolveType(name, typeMap),
    };
  }

  if (plainMatch) {
    const name = plainMatch[1];
    const value = parseMetricValue(plainMatch[2]);
    if (value === null) return null;

    return {
      name,
      labels: {},
      value,
      type: resolveType(name, typeMap),
    };
  }

  return null;
}

/**
 * Parse a label string from inside curly braces.
 *
 * @param labelStr - Comma-separated key="value" pairs (e.g., `method="GET",status="200"`)
 * @returns Record of label key-value pairs
 */
function parseLabels(labelStr: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!labelStr) return labels;

  // Match key="value" pairs, handling escaped quotes in values
  const labelRegex = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;

  while ((match = labelRegex.exec(labelStr)) !== null) {
    const key = match[1];
    // Unescape backslash sequences in values
    const value = match[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    labels[key] = value;
  }

  return labels;
}

/**
 * Parse a metric value string, handling special float values.
 *
 * @param raw - String value (may be a number, "NaN", "+Inf", "-Inf")
 * @returns Parsed number or null if unparseable
 */
function parseMetricValue(raw: string): number | null {
  if (raw === "NaN") return NaN;
  if (raw === "+Inf") return Infinity;
  if (raw === "-Inf") return -Infinity;

  const num = Number(raw);
  if (raw !== "" && !isNaN(num)) return num;
  return null;
}

/**
 * Resolve the type for a metric name, checking the base name for
 * histogram/summary sub-metrics (e.g., _bucket, _count, _sum).
 *
 * @param name - Full metric name (may include _bucket, _count, _sum suffixes)
 * @param typeMap - Map of declared metric base names to types
 * @returns Resolved type or "untyped"
 */
function resolveType(
  name: string,
  typeMap: Map<string, PrometheusType>
): PrometheusType {
  // Direct lookup
  if (typeMap.has(name)) {
    return typeMap.get(name) ?? "untyped";
  }

  // Check if this is a histogram/summary sub-metric
  const suffixes = ["_bucket", "_count", "_sum", "_total"];
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      const baseName = name.slice(0, -suffix.length);
      if (typeMap.has(baseName)) {
        return typeMap.get(baseName) ?? "untyped";
      }
    }
  }

  return "untyped";
}
