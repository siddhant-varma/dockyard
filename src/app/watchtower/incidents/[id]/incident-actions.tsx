/**
 * IncidentActions — client component for Acknowledge/Resolve buttons.
 *
 * Calls PUT /api/incidents/:id to update incident status.
 * Refreshes the page via router.refresh() on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface IncidentActionsProps {
  incidentId: string;
  currentStatus: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function IncidentActions({
  incidentId,
  currentStatus,
}: IncidentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(newStatus);
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/incidents/${incidentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
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
      alert("Failed to update incident status.");
    } finally {
      setLoading(null);
    }
  };

  const isResolved = currentStatus === "resolved" || currentStatus === "postmortem";
  const isAcknowledged =
    currentStatus === "identified" ||
    currentStatus === "monitoring" ||
    isResolved;

  return (
    <div className="flex gap-2">
      {!isAcknowledged && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-blue-400 border-blue-500/30"
          disabled={loading !== null}
          onClick={() => handleStatusUpdate("identified")}
        >
          {loading === "identified" ? "Acknowledging..." : "Acknowledge"}
        </Button>
      )}
      {!isResolved && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-green-400 border-green-500/30"
          disabled={loading !== null}
          onClick={() => handleStatusUpdate("resolved")}
        >
          {loading === "resolved" ? "Resolving..." : "Resolve"}
        </Button>
      )}
    </div>
  );
}
