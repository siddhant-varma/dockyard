/**
 * ServerStatusCard — glass card showing VPS server information.
 *
 * Matches the Stitch wireframe "Server Details" card structure:
 * server name, status badge, UUID, region, IPv4, uptime, kernel,
 * and restart/console action buttons.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ServerStatusCardProps {
  name: string;
  serverId?: string;
  status: string;
  region?: string;
  publicIpv4?: string;
  serverType?: string;
  uptime?: string;
  osVersion?: string;
}

const STATUS_BADGE: Record<string, string> = {
  running: "bg-green-500/15 text-green-400 border-green-500/30",
  off: "bg-red-500/15 text-red-400 border-red-500/30",
  starting: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  stopping: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export function ServerStatusCard({
  name,
  serverId,
  status,
  region,
  publicIpv4,
  serverType,
  uptime,
  osVersion,
}: ServerStatusCardProps) {
  const badgeClass =
    STATUS_BADGE[status] ?? "bg-glass-hover text-muted-foreground";

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{name}</CardTitle>
          {serverId && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground/50">
              {serverId}
            </p>
          )}
        </div>
        <Badge variant="outline" className={badgeClass}>
          {status.toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <DetailRow label="Region" value={region} />
        <DetailRow label="IPv4" value={publicIpv4} mono />
        <DetailRow label="Type" value={serverType} />
        <DetailRow label="Uptime" value={uptime} />
        <DetailRow label="OS" value={osVersion} />

        <div className="flex gap-2 pt-3">
          <Button variant="outline" size="sm" className="text-xs">
            Restart
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            Console
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground/70">{label}</span>
      <span
        className={`text-foreground/80 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
