"use client";

/**
 * Inline form for creating a new alert rule.
 *
 * Toggled by the "+ Create Rule" button. Submits a POST to /api/alerts
 * with the required fields: name, metric, operator, threshold, severity.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/auth-fetch";

const OPERATORS = [">", ">=", "<", "<=", "=="] as const;
const SEVERITIES = ["sev1", "sev2", "sev3", "sev4"] as const;

/**
 * Inline create-rule form that expands below the "Alert Rules" card header.
 *
 * On successful creation, refreshes the server component data and collapses.
 */
export function CreateRuleForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [metric, setMetric] = useState("");
  const [operator, setOperator] = useState<string>(">");
  const [threshold, setThreshold] = useState("");
  const [severity, setSeverity] = useState<string>("sev3");

  function reset() {
    setName("");
    setMetric("");
    setOperator(">");
    setThreshold("");
    setSeverity("sev3");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !metric.trim() || !threshold.trim()) {
      setError("Name, metric, and threshold are required");
      return;
    }

    try {
      const res = await authFetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metric: metric.trim(),
          operator,
          threshold: Number(threshold),
          severity,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }

      reset();
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Network error");
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setIsOpen(true)}
      >
        + Create Rule
      </Button>
    );
  }

  const inputCls =
    "rounded-md border border-glass-border bg-background/50 px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {/* Name */}
        <input
          className={inputCls}
          placeholder="Rule name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Metric */}
        <input
          className={inputCls}
          placeholder="Metric key"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          required
        />

        {/* Operator */}
        <select
          className={inputCls}
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          {OPERATORS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        {/* Threshold */}
        <input
          className={inputCls}
          type="number"
          step="any"
          placeholder="Threshold"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          required
        />

        {/* Severity */}
        <select
          className={inputCls}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="text-xs"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
