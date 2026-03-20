"use client";

/**
 * AlertRuleForm — inline form for creating a new alert rule.
 *
 * Client component. Submits to POST /api/alerts and shows validation
 * and server error feedback. On success, the form resets.
 *
 * Fields:
 * - name: human-readable rule label
 * - metric: metric key to evaluate (e.g. "latency_ms", "uptime")
 * - operator: comparison operator (gt / lt / gte / lte / eq)
 * - threshold: numeric threshold value
 * - severity: sev1 / sev2 / sev3 / sev4
 * - projectSlug: optional project scope (leave blank for global rules)
 */

import { useState } from "react";

interface FormState {
  name: string;
  metric: string;
  operator: string;
  threshold: string;
  severity: string;
  projectSlug: string;
}

const INITIAL: FormState = {
  name: "",
  metric: "",
  operator: "gt",
  threshold: "",
  severity: "sev3",
  projectSlug: "",
};

const OPERATORS = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
];

const SEVERITIES = ["sev1", "sev2", "sev3", "sev4"];

export function AlertRuleForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const threshold = parseFloat(form.threshold);
    if (isNaN(threshold)) {
      setError("Threshold must be a valid number.");
      setSubmitting(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        metric: form.metric.trim(),
        operator: form.operator,
        threshold,
        severity: form.severity,
      };
      if (form.projectSlug.trim()) {
        body.projectSlug = form.projectSlug.trim();
      }

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setSuccess(true);
      setForm(INITIAL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Rule name" htmlFor="name" required>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="High latency"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label="Metric key" htmlFor="metric" required>
          <input
            id="metric"
            name="metric"
            type="text"
            required
            value={form.metric}
            onChange={handleChange}
            placeholder="latency_ms"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label="Operator" htmlFor="operator" required>
          <select
            id="operator"
            name="operator"
            value={form.operator}
            onChange={handleChange}
            className={INPUT_CLASS}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label} ({op.value})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Threshold" htmlFor="threshold" required>
          <input
            id="threshold"
            name="threshold"
            type="number"
            required
            step="any"
            value={form.threshold}
            onChange={handleChange}
            placeholder="500"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label="Severity" htmlFor="severity" required>
          <select
            id="severity"
            name="severity"
            value={form.severity}
            onChange={handleChange}
            className={INPUT_CLASS}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Project slug (optional)" htmlFor="projectSlug">
          <input
            id="projectSlug"
            name="projectSlug"
            type="text"
            value={form.projectSlug}
            onChange={handleChange}
            placeholder="my-project (leave blank for global)"
            className={INPUT_CLASS}
          />
        </FormField>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-green-600 dark:text-green-400">
          Alert rule created successfully.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create rule"}
        </button>
      </div>
    </form>
  );
}

const INPUT_CLASS =
  "w-full rounded-md border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
