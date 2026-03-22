/**
 * HealthCard — compact health summary for a project.
 *
 * Shows project name, status, uptime, component dots, last checked.
 * Matches Stitch "Service Status Cards" + WIREFRAMES.md health cards.
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HealthSummary {
  projectName: string;
  slug: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  uptime30d: number | null;
  latencyMs: number | null;
  lastChecked: string;
  components: { name: string; status: string }[];
}

interface HealthCardProps {
  project: HealthSummary;
}

const STATUS_BADGE: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-300 border-green-500/40",
  degraded: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  down: "bg-red-500/20 text-red-300 border-red-500/40",
  unknown: "bg-white/10 text-foreground/60 border-white/15",
};

const COMP_DOT: Record<string, string> = {
  healthy: "bg-green-400 animate-breathe",
  ok: "bg-green-400 animate-breathe",
  degraded: "bg-yellow-400 animate-pulse-dot",
  down: "bg-red-400 animate-pulse-dot",
  unknown: "bg-foreground/30",
};

export function HealthCard({ project }: HealthCardProps) {
  const uptimeStr =
    project.uptime30d != null ? `${project.uptime30d.toFixed(2)}%` : "—";

  return (
    <Link href={`/watchtower/${project.slug}`} className="group block transition-transform duration-100 active:scale-[0.98]">
      <Card className="h-full bg-card border-glass-border backdrop-blur-lg transition-all duration-200 group-hover:border-glass-border-strong group-hover:shadow-[0_0_20px_rgba(12,140,233,0.08)]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm transition-colors group-hover:text-[var(--color-brand-500)]">
              {project.projectName}
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${STATUS_BADGE[project.status]}`}
            >
              {project.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Uptime</span>
            <span className="font-data tabular-nums text-foreground/80">
              {project.status === "down" ? "0.00%" : uptimeStr}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Latency</span>
            <span className="font-data tabular-nums text-foreground/80">
              {project.status === "down"
                ? "—"
                : project.latencyMs != null
                  ? `${project.latencyMs}ms`
                  : "—"}
            </span>
          </div>

          {/* Component dots */}
          {project.components.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {project.components.map((c) => (
                <div key={c.name} className="flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${COMP_DOT[c.status] ?? COMP_DOT.unknown}`}
                  />
                  <span className="text-[10px] text-foreground/40">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-foreground/30">
            {project.lastChecked}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
