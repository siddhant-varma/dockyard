"use client";

/**
 * React hook that merges server-rendered initial data with live
 * SSE-triggered refetches.
 *
 * Pattern:
 *   1. RSC provides initial data as props to a client wrapper
 *   2. This hook holds that data in state
 *   3. When SSE fires the specified event, it refetches from the API
 *   4. New data replaces old (or appends with sliding window)
 *
 * For time-series data, `maxPoints` caps array length to prevent
 * unbounded memory growth.
 *
 * After `staleThreshold` consecutive fetch failures, `isStale` becomes
 * true so consuming components can render a "stale data" indicator.
 */

import { useState, useCallback, useRef } from "react";
import { useSSE } from "./use-sse";

/** Number of consecutive fetch failures before data is considered stale. */
const DEFAULT_STALE_THRESHOLD = 3;

interface UseRealtimeDataOptions {
  /** Max data points to keep (for time-series arrays). 0 = no limit. */
  maxPoints?: number;
  /** Disable SSE subscription. */
  enabled?: boolean;
  /** Consecutive failure count before `isStale` becomes true. Default: 3. */
  staleThreshold?: number;
}

/**
 * Merges server-rendered initial data with live SSE-triggered refetches.
 *
 * @param initialData - Data provided by RSC on first render
 * @param fetchUrl - API endpoint to refetch on SSE events
 * @param sseEvent - SSE event name that triggers a refetch
 * @param options - Optional configuration (maxPoints, enabled, staleThreshold)
 * @returns Current data, loading/stale/connection status flags
 */
export function useRealtimeData<T>(
  initialData: T,
  fetchUrl: string,
  sseEvent: string,
  options: UseRealtimeDataOptions = {}
): { data: T; isRefreshing: boolean; isStale: boolean; status: string } {
  const {
    maxPoints = 0,
    enabled = true,
    staleThreshold = DEFAULT_STALE_THRESHOLD,
  } = options;
  const [data, setData] = useState<T>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const fetchingRef = useRef(false);
  const failureCountRef = useRef(0);

  const refetch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsRefreshing(true);

    try {
      const res = await fetch(fetchUrl);
      if (res.ok) {
        let newData = await res.json();
        if (maxPoints > 0 && Array.isArray(newData)) {
          newData = newData.slice(-maxPoints);
        }
        setData(newData as T);
        failureCountRef.current = 0;
        setIsStale(false);
      } else {
        failureCountRef.current += 1;
        if (failureCountRef.current >= staleThreshold) {
          setIsStale(true);
        }
      }
    } catch {
      failureCountRef.current += 1;
      if (failureCountRef.current >= staleThreshold) {
        setIsStale(true);
      }
    } finally {
      fetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [fetchUrl, maxPoints, staleThreshold]);

  const { status } = useSSE(
    { [sseEvent]: () => refetch() },
    { enabled }
  );

  return { data, isRefreshing, isStale, status };
}
