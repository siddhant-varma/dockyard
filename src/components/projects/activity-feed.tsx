"use client";

/**
 * ActivityFeed — chronological list of signal events for a project.
 *
 * Signal events are records of notable activity ingested from external sources
 * (GitHub webhooks, Dokploy deploy hooks, or manually submitted via the DIP).
 * Each entry shows the source, event type, a summary extracted from the raw
 * payload, and a relative timestamp.
 *
 * Accepts an initial page of events as props (server-rendered). The "Load More"
 * button fetches subsequent pages from GET /api/projects/:slug/activity.
 *
 * @param slug - The project slug used to construct the activity API URL.
 * @param initialEvents - First page of signal events, pre-fetched server-side.
 */

import { useState } from "react";

/** A single signal event record from the signal_events table. */
export interface SignalEvent {
  id: string;
  projectId: string;
  source: string;
  eventType: string;
  rawPayload: Record<string, unknown> | null;
  processed: boolean;
  createdAt: string;
}

interface ActivityFeedProps {
  slug: string;
  initialEvents: SignalEvent[];
}

/** Maps known source values to a short display label. */
const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub",
  dokploy: "Dokploy",
  manual: "Manual",
  dip: "DIP",
  hetzner: "Hetzner",
};

/** Formats an ISO date string as a relative time label, e.g. "5m ago". */
function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 2592000) return `${Math.floor(diffSecs / 86400)}d ago`;
  return `${Math.floor(diffSecs / 2592000)}mo ago`;
}

/**
 * Extracts a human-readable summary string from an event's rawPayload.
 * Falls back to the event type if no summary field is present.
 */
function extractSummary(
  eventType: string,
  payload: Record<string, unknown> | null
): string {
  if (!payload) return eventType;

  if (typeof payload.summary === "string" && payload.summary.length > 0) {
    return payload.summary;
  }
  if (typeof payload.message === "string" && payload.message.length > 0) {
    return payload.message;
  }
  if (typeof payload.commit_message === "string") {
    return payload.commit_message;
  }
  if (
    typeof payload.head_commit === "object" &&
    payload.head_commit !== null &&
    "message" in payload.head_commit &&
    typeof payload.head_commit.message === "string"
  ) {
    return payload.head_commit.message;
  }

  return eventType;
}

/** Formats a source identifier into a display label. */
function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/** Dot indicator for source type. */
function SourceDot({ source }: { source: string }) {
  const colorMap: Record<string, string> = {
    github: "bg-neutral-800 dark:bg-neutral-200",
    dokploy: "bg-indigo-500",
    manual: "bg-sky-500",
    dip: "bg-violet-500",
    hetzner: "bg-red-500",
  };
  const color = colorMap[source] ?? "bg-neutral-400";
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

export function ActivityFeed({ slug, initialEvents }: ActivityFeedProps) {
  const [events, setEvents] = useState<SignalEvent[]>(initialEvents);
  const [offset, setOffset] = useState(initialEvents.length);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialEvents.length < 20);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${slug}/activity?limit=20&offset=${offset}`
      );
      if (!res.ok) throw new Error("Failed to load activity");
      const data = (await res.json()) as SignalEvent[];
      setEvents((prev) => [...prev, ...data]);
      setOffset((prev) => prev + data.length);
      if (data.length < 20) setExhausted(true);
    } finally {
      setLoading(false);
    }
  }

  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-400 dark:text-neutral-500">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-1">
        {events.map((event) => {
          const summary = extractSummary(event.eventType, event.rawPayload);
          return (
            <li
              key={event.id}
              className="flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <SourceDot source={event.source} />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {sourceLabel(event.source)}
                  </span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {event.eventType}
                  </span>
                </div>
                <p className="truncate text-sm text-neutral-600 dark:text-neutral-300">
                  {summary}
                </p>
              </div>
              <time
                dateTime={event.createdAt}
                className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500"
                title={new Date(event.createdAt).toLocaleString()}
              >
                {formatRelative(event.createdAt)}
              </time>
            </li>
          );
        })}
      </ul>

      {!exhausted && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
