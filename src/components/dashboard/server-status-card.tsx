/**
 * Server status card for the home dashboard.
 *
 * Displays a summary of a Hetzner server instance: name, operational status,
 * public IP address, server hardware type, and datacenter location.
 * Uses the StatusBadge shared component to render the status pill.
 *
 * Accepts data conforming to the InfraProvider ServerSummary interface so the
 * card remains compatible with any provider adapter, not just Hetzner.
 *
 * @example
 * ```tsx
 * <ServerStatusCard server={serverData} />
 * ```
 */

import { StatusBadge } from "@/components/shared";

export interface ServerStatusCardProps {
  /** Display name of the server (e.g. "vps-prod-01"). */
  name: string;
  /** Operational status from the infrastructure provider. */
  status: "running" | "off" | "starting" | "stopping" | "unknown";
  /** Primary public IPv4 address, if assigned. */
  publicIpv4?: string;
  /** Server hardware type identifier (e.g. "cx21", "cx41"). */
  serverType: string;
  /** Datacenter location identifier (e.g. "fsn1-dc14"). */
  datacenter?: string;
}

/** Maps provider status strings to StatusBadge-compatible status keys. */
const STATUS_TO_BADGE: Record<string, string> = {
  running: "healthy",
  off: "down",
  starting: "degraded",
  stopping: "degraded",
  unknown: "unknown",
};

/** Inline detail row used inside the card. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="truncate text-right text-xs font-medium text-neutral-800 dark:text-neutral-200">
        {value}
      </span>
    </div>
  );
}

/**
 * Renders a card summarising a single server's status and identity fields.
 *
 * The status is mapped to a color-coded badge via the shared StatusBadge
 * component. All fields are display-only; no interactive controls.
 */
export function ServerStatusCard({
  name,
  status,
  publicIpv4,
  serverType,
  datacenter,
}: ServerStatusCardProps) {
  const badgeStatus = STATUS_TO_BADGE[status] ?? "unknown";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {name}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Hetzner VPS
          </p>
        </div>
        <StatusBadge status={badgeStatus} />
      </div>

      <div className="space-y-2">
        <DetailRow label="IP" value={publicIpv4 ?? "Not assigned"} />
        <DetailRow label="Type" value={serverType} />
        <DetailRow label="Datacenter" value={datacenter ?? "Unknown"} />
      </div>
    </div>
  );
}
