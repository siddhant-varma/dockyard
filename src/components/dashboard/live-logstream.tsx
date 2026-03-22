"use client";

/**
 * LiveLogstream — client wrapper around Logstream that reflects SSE connection
 * status in the "Live" indicator.
 *
 * Uses `useSSE` to establish a connection and passes the derived `isLive`
 * boolean to the underlying `Logstream` presentational component.
 */

import { useSSE } from "@/lib/sse/use-sse";
import { Logstream, type LogEntry } from "./logstream";

interface LiveLogstreamProps {
  entries: LogEntry[];
}

export function LiveLogstream({ entries }: LiveLogstreamProps) {
  const { status } = useSSE({});

  return <Logstream entries={entries} isLive={status === "connected"} />;
}
