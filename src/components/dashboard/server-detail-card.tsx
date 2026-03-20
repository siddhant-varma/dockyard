/**
 * Expanded server details card — matches Stitch Glass Dashboard wireframe.
 *
 * Shows: server name, UUID, status badge, region, IPv4, uptime, kernel version.
 * Action buttons: Restart + Console.
 *
 * Accepts extended server data from the Hetzner status API.
 */

import { StatusBadge } from "@/components/shared";

export interface ServerDetailCardProps {
  /** Display name of the server. */
  name: string;
  /** Short UUID or ID for display. */
  serverId?: string;
  /** Operational status. */
  status: "running" | "off" | "starting" | "stopping" | "unknown";
  /** Datacenter region identifier (e.g. "nbg1-dc3"). */
  region?: string;
  /** Primary public IPv4 address. */
  publicIpv4?: string;
  /** Server uptime as a human-readable string (e.g. "12d 4h 11m"). */
  uptime?: string;
  /** Kernel version string. */
  kernel?: string;
  /** Server hardware type (e.g. "cx23"). */
  serverType?: string;
}

const STATUS_TO_BADGE: Record<string, string> = {
  running: "healthy",
  off: "down",
  starting: "degraded",
  stopping: "degraded",
  unknown: "unknown",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs text-foreground/90">
        {value}
      </span>
    </div>
  );
}

export function ServerDetailCard({
  name,
  serverId,
  status,
  region,
  publicIpv4,
  uptime,
  kernel,
  serverType,
}: ServerDetailCardProps) {
  const badgeStatus = STATUS_TO_BADGE[status] ?? "unknown";

  return (
    <div className="flex flex-col rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
          {serverId && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {serverId}
            </p>
          )}
        </div>
        <StatusBadge status={badgeStatus} />
      </div>

      {/* Detail rows */}
      <div className="mt-4 space-y-0.5 border-t border-glass-divider pt-3">
        {region && <DetailRow label="Region" value={region} />}
        {publicIpv4 && <DetailRow label="IPv4" value={publicIpv4} />}
        {serverType && <DetailRow label="Type" value={serverType} />}
        {uptime && <DetailRow label="Uptime" value={uptime} />}
        {kernel && <DetailRow label="Kernel" value={kernel} />}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-glass-hover px-3 py-2 text-xs font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-glass-input"
        >
          Restart
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-glass-hover px-3 py-2 text-xs font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-glass-input"
        >
          Console
        </button>
      </div>
    </div>
  );
}
