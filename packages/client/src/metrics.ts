/**
 * Prometheus metrics middleware for DockYard DIP Level 2.
 *
 * Creates a /metrics endpoint that exposes Prometheus-format metrics
 * including HTTP request counts, durations, and Node.js heap usage.
 */

/** Metric registry for tracking application metrics. */
export interface MetricsRegistry {
  /** Increment a counter metric. */
  increment(name: string, labels?: Record<string, string>): void;
  /** Observe a value in a histogram metric. */
  observe(name: string, value: number, labels?: Record<string, string>): void;
  /** Set a gauge metric value. */
  set(name: string, value: number, labels?: Record<string, string>): void;
  /** Render all metrics in Prometheus text format. */
  render(): string;
}

interface MetricEntry {
  name: string;
  type: "counter" | "gauge" | "histogram";
  help: string;
  values: Map<string, number>;
}

/**
 * Create a metrics registry and /metrics handler.
 *
 * @returns Object with registry and metricsHandler function
 */
export function metricsMiddleware(): {
  registry: MetricsRegistry;
  metricsHandler: () => { status: number; headers: Record<string, string>; body: string };
} {
  const metrics = new Map<string, MetricEntry>();

  function getOrCreate(
    name: string,
    type: MetricEntry["type"],
    help: string
  ): MetricEntry {
    let entry = metrics.get(name);
    if (!entry) {
      entry = { name, type, help, values: new Map() };
      metrics.set(name, entry);
    }
    return entry;
  }

  function labelsKey(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return "";
    return (
      "{" +
      Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",") +
      "}"
    );
  }

  const registry: MetricsRegistry = {
    increment(name, labels) {
      const entry = getOrCreate(name, "counter", name);
      const key = labelsKey(labels);
      entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
    },
    observe(name, value, labels) {
      const entry = getOrCreate(name, "histogram", name);
      const key = labelsKey(labels);
      entry.values.set(key, value);
    },
    set(name, value, labels) {
      const entry = getOrCreate(name, "gauge", name);
      const key = labelsKey(labels);
      entry.values.set(key, value);
    },
    render() {
      const memUsage = process.memoryUsage();
      registry.set("nodejs_heap_used_bytes", memUsage.heapUsed);

      const lines: string[] = [];
      for (const entry of metrics.values()) {
        lines.push(`# HELP ${entry.name} ${entry.help}`);
        lines.push(`# TYPE ${entry.name} ${entry.type}`);
        for (const [labels, value] of entry.values) {
          lines.push(`${entry.name}${labels} ${value}`);
        }
      }
      return lines.join("\n") + "\n";
    },
  };

  return {
    registry,
    metricsHandler() {
      return {
        status: 200,
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
        body: registry.render(),
      };
    },
  };
}
