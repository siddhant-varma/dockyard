"use client";

/**
 * RestartButton — triggers a Hetzner Cloud API server reset.
 *
 * Calls POST /api/hetzner/servers/:id/actions/reset to hard-reset
 * the VPS. Shows loading state during the request and a brief
 * confirmation or error message after.
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface RestartButtonProps {
  /** Hetzner server ID to restart. */
  serverId: string;
}

export function RestartButton({ serverId }: RestartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleRestart() {
    // Confirm before triggering a server restart
    const confirmed = window.confirm(
      "Are you sure you want to restart the server? This will cause a brief downtime."
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/hetzner/servers/${serverId}/actions/reset`,
        { method: "POST" }
      );
      if (res.ok) {
        setResult({ ok: true, message: "Restart triggered" });
      } else {
        const body = await res.json().catch(() => ({}));
        setResult({
          ok: false,
          message: body.error ?? `Failed (${res.status})`,
        });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setResult(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={loading}
        onClick={handleRestart}
      >
        {loading ? "Restarting..." : "Restart"}
      </Button>
      {result && (
        <span
          className={`text-[10px] ${result.ok ? "text-green-400" : "text-red-400"}`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
