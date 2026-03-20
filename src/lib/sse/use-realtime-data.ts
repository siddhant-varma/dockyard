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
 */

import { useState, useCallback, useRef } from "react";
import { useSSE } from "./use-sse";

interface UseRealtimeDataOptions {
  /** Max data points to keep (for time-series arrays). 0 = no limit. */
  maxPoints?: number;
  /** Disable SSE subscription. */
  enabled?: boolean;
}

export function useRealtimeData<T>(
  initialData: T,
  fetchUrl: string,
  sseEvent: string,
  options: UseRealtimeDataOptions = {}
): { data: T; isRefreshing: boolean; status: string } {
  const { maxPoints = 0, enabled = true } = options;
  const [data, setData] = useState<T>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchingRef = useRef(false);

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
      }
    } catch {
      // Silently fail — keep showing stale data
    } finally {
      fetchingRef.current = false;
      setIsRefreshing(false);
    }
  }, [fetchUrl, maxPoints]);

  const { status } = useSSE(
    { [sseEvent]: () => refetch() },
    { enabled }
  );

  return { data, isRefreshing, status };
}
