"use client";

/**
 * React hook that manages an EventSource connection to /api/sse.
 *
 * Features:
 * - Auto-reconnect with exponential backoff (1s → 2s → 4s → max 30s)
 * - Typed event callbacks
 * - Cleanup on unmount
 * - Connection status tracking via useSyncExternalStore
 */

import { useEffect, useRef, useSyncExternalStore } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseSSEOptions {
  enabled?: boolean;
}

/** Module-level SSE connection state. */
let sseStatus: ConnectionStatus = "disconnected";
const sseListeners = new Set<() => void>();

function subscribeStatus(listener: () => void) {
  sseListeners.add(listener);
  return () => { sseListeners.delete(listener); };
}
function getStatus() { return sseStatus; }
function getServerStatus(): ConnectionStatus { return "disconnected"; }
function setStatus(s: ConnectionStatus) {
  sseStatus = s;
  sseListeners.forEach((l) => l());
}

export function useSSE(
  events: Record<string, (data: unknown) => void>,
  options: UseSSEOptions = {}
): { status: ConnectionStatus } {
  const { enabled = true } = options;
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const eventsRef = useRef(events);
  const connectRef = useRef<() => void>(() => {});

  // Keep events ref up to date
  useEffect(() => { eventsRef.current = events; });

  const status = useSyncExternalStore(subscribeStatus, getStatus, getServerStatus);

  // Define connect in an effect so it captures refs correctly
  useEffect(() => {
    if (!enabled) return;

    let destroyed = false;

    function doConnect() {
      if (destroyed) return;
      if (sourceRef.current) sourceRef.current.close();

      setStatus("connecting");
      const source = new EventSource("/api/sse");
      sourceRef.current = source;

      source.addEventListener("connected", () => {
        setStatus("connected");
        retryRef.current = 0;
      });

      for (const eventName of Object.keys(eventsRef.current)) {
        source.addEventListener(eventName, ((e: MessageEvent) => {
          try {
            eventsRef.current[eventName]?.(JSON.parse(e.data));
          } catch {
            eventsRef.current[eventName]?.(e.data);
          }
        }) as EventListener);
      }

      source.onerror = () => {
        source.close();
        sourceRef.current = null;
        setStatus("disconnected");

        if (!destroyed) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
          retryRef.current++;
          retryTimerRef.current = setTimeout(doConnect, delay);
        }
      };
    }

    connectRef.current = doConnect;
    doConnect();

    return () => {
      destroyed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };
  }, [enabled]);

  return { status };
}
