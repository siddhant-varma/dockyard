"use client";

/**
 * Client component for alert event action buttons (Acknowledge / Resolve).
 *
 * Renders contextual buttons based on alert status and calls the
 * PUT /api/alerts/events/:id endpoint to update the status.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api/auth-fetch";

interface AlertActionsProps {
  /** The unique identifier of the alert event. */
  id: string;
  /** Current status of the alert. */
  status: "firing" | "acknowledged" | "resolved";
}

/**
 * Action buttons for a single alert event card.
 *
 * - When firing: shows both "Acknowledge" and "Resolve" buttons.
 * - When acknowledged: shows only "Resolve" button.
 * - When resolved: renders nothing.
 */
export function AlertActions({ id, status }: AlertActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "resolved") return null;

  async function updateStatus(newStatus: "acknowledged" | "resolved") {
    setError(null);
    try {
      const res = await authFetch(`/api/alerts/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "firing" && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={isPending}
            onClick={() => updateStatus("acknowledged")}
          >
            {isPending ? "..." : "Acknowledge"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isPending}
          onClick={() => updateStatus("resolved")}
        >
          {isPending ? "..." : "Resolve"}
        </Button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
