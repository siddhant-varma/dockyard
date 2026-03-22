/**
 * Audit log settings tab — paginated view of all audit events.
 *
 * Fetches from GET /api/audit?limit=N&offset=N.
 * Displays actor, action, target, detail (from diff JSONB), and timestamp.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGE_SIZE = 20;

interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  diff: Record<string, unknown> | null;
  timestamp: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDiff(diff: Record<string, unknown> | null): string {
  if (!diff) return "\u2014";
  const entries = Object.entries(diff).slice(0, 3);
  return entries
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(", ");
}

export function AuditTab() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const fetchLogs = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(offset);
  }, [offset, fetchLogs]);

  const handlePrev = () => {
    setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
  };

  const handleNext = () => {
    if (offset + PAGE_SIZE < total) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  };

  const pageStart = offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <p className="text-xs text-foreground/40">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-foreground/40">No audit log entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Actor</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Target</th>
                    <th className="pb-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-foreground/70">
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground/40 whitespace-nowrap">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {log.actorId ? log.actorId.slice(0, 8) : "system"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {log.targetType}
                        {log.targetId ? ` / ${log.targetId.slice(0, 8)}` : ""}
                      </td>
                      <td className="py-2.5 text-xs text-foreground/60 max-w-[200px] truncate">
                        {formatDiff(log.diff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-foreground/30">
                {total > 0
                  ? `Showing ${pageStart}-${pageEnd} of ${total.toLocaleString()} entries`
                  : "No entries"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handlePrev}
                  disabled={!hasPrev || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleNext}
                  disabled={!hasNext || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
