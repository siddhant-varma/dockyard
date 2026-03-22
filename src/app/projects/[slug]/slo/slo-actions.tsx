/**
 * SLOActions — client components for SLO CRUD operations.
 *
 * SLOActions: "Create SLO" button (POST /api/projects/:slug/slo).
 * SLOItemActions: Edit/Delete buttons per SLO card (PUT/DELETE /api/projects/:slug/slo).
 * In demo mode, buttons are displayed but disabled.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SLOActionsProps {
  slug: string;
  isDemo: boolean;
}

interface SLOItemActionsProps {
  slug: string;
  sloId: string;
  sloName: string;
  isDemo: boolean;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Supported SLO metric types matching backend enum. */
const METRICS = [
  { value: "availability", label: "Availability (%)" },
  { value: "latency_p99", label: "p99 Latency (ms)" },
  { value: "error_rate", label: "Error Rate (%)" },
] as const;

export function SLOActions({ slug, isDemo }: SLOActionsProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  /** Prompt user for SLO details and submit to the API. */
  const handleCreate = async () => {
    if (isDemo) return;

    const metricChoices = METRICS.map((m, i) => `${i + 1}. ${m.label}`).join(
      "\n",
    );
    const metricIdx = prompt(
      `Select metric type:\n${metricChoices}\n\nEnter number (1-${METRICS.length}):`,
    );
    if (!metricIdx) return;
    const idx = parseInt(metricIdx, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= METRICS.length) {
      alert("Invalid selection.");
      return;
    }
    const metricName = METRICS[idx].value;

    const targetStr = prompt("Enter target value (e.g., 99.9 for 99.9%):");
    if (!targetStr) return;
    const targetValue = parseFloat(targetStr);
    if (isNaN(targetValue)) {
      alert("Target must be a number.");
      return;
    }

    const windowStr = prompt("Window in days (default: 30):");
    const windowDays = windowStr ? parseInt(windowStr, 10) : 30;

    setCreating(true);
    try {
      const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/slo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricName, targetValue, windowDays }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
        return;
      }
      // Refresh the page to show the new SLO
      router.refresh();
    } catch {
      alert("Failed to create SLO.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-foreground">
        Service Level Objectives
      </h1>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={isDemo || creating}
        onClick={handleCreate}
      >
        {creating ? "Creating..." : "+ Create SLO"}
      </Button>
    </div>
  );
}

/** Per-SLO edit and delete actions (GAP-007). */
export function SLOItemActions({
  slug,
  sloId,
  sloName,
  isDemo,
}: SLOItemActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEdit = async () => {
    if (isDemo) return;
    const targetStr = prompt(`New target value for "${sloName}":`);
    if (!targetStr) return;
    const targetValue = parseFloat(targetStr);
    if (isNaN(targetValue)) {
      alert("Target must be a number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/slo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sloId, targetValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to update SLO.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDemo) return;
    const confirmed = confirm(
      `Delete SLO "${sloName}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/slo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sloId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete SLO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px] text-foreground/50 hover:text-foreground/80"
        disabled={isDemo || loading}
        onClick={handleEdit}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px] text-red-400/60 hover:text-red-400"
        disabled={isDemo || loading}
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );
}
