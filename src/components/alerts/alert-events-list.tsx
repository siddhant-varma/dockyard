"use client";

/**
 * AlertEventsList — displays active alert events with acknowledgment actions.
 *
 * Client component. Renders a list of firing or acknowledged alert events.
 * Each row shows:
 * - Severity badge (sev1–sev4)
 * - Alert message
 * - Associated project name
 * - Time elapsed since the alert was triggered
 * - "Acknowledge" button (posts to /api/alerts/events/:id/acknowledge)
 *
 * @param initialEvents - Server-fetched alert events passed as initial state.
 */

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/shared";

interface AlertEvent {
  id: string;
  severity: string;
  status: string;
  message: string | null;
  triggeredAt: string;
  projectId: string;
  projectName?: string;
}

interface AlertEventsListProps {
  initialEvents: AlertEvent[];
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertEventsList({ initialEvents }: AlertEventsListProps) {
  const [events, setEvents] = useState<AlertEvent[]>(initialEvents);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleAcknowledge(eventId: string): Promise<void> {
    setAcknowledging(eventId);
    setError(null);

    try {
      const res = await fetch(`/api/alerts/events/${eventId}/acknowledge`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      startTransition(() => {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, status: "acknowledged" } : e
          )
        );
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to acknowledge alert"
      );
    } finally {
      setAcknowledging(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No active alert events.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-700">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <StatusBadge status={event.severity} className="self-start" />

            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {event.message ?? "No message"}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                {event.projectName && (
                  <span>
                    Project:{" "}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {event.projectName}
                    </span>
                  </span>
                )}
                <span>{timeAgo(event.triggeredAt)}</span>
                {event.status === "acknowledged" && (
                  <StatusBadge status="acknowledged" />
                )}
              </div>
            </div>

            {event.status === "firing" && (
              <button
                type="button"
                onClick={() => void handleAcknowledge(event.id)}
                disabled={acknowledging === event.id}
                className="shrink-0 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {acknowledging === event.id
                  ? "Acknowledging..."
                  : "Acknowledge"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
