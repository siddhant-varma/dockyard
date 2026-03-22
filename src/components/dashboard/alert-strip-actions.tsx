"use client";

/**
 * AlertStripActions — client component for alert action buttons in the AlertsStrip.
 *
 * - SEV1: "View Incident" navigates to /watchtower/incidents/:incidentId
 * - SEV2/SEV3: "Acknowledge" calls PUT /api/alerts/events/:id with status "acknowledged"
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AlertStripActionsProps {
  /** Alert event ID used for the acknowledge API call. */
  alertId: string;
  /** Severity determines which action to show. */
  severity: "sev1" | "sev2" | "sev3";
  /** Incident ID to link to for SEV1 alerts. Falls back to alertId if not provided. */
  incidentId?: string;
}

export function AlertStripActions({
  alertId,
  severity,
  incidentId,
}: AlertStripActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Navigate to the incident detail page. */
  function handleViewIncident() {
    const targetId = incidentId ?? alertId;
    router.push(`/watchtower/incidents/${targetId}`);
  }

  /** Acknowledge the alert via PUT /api/alerts/events/:id. */
  async function handleAcknowledge() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/events/${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });

      if (res.ok) {
        setAcknowledged(true);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (severity === "sev1") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-xs"
        onClick={handleViewIncident}
      >
        View Incident
      </Button>
    );
  }

  if (acknowledged) {
    return (
      <span className="shrink-0 text-[10px] text-green-400">Acknowledged</span>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        disabled={loading}
        onClick={handleAcknowledge}
      >
        {loading ? "..." : "Acknowledge"}
      </Button>
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}
