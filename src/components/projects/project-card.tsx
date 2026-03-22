/**
 * ProjectCard — glassmorphic summary card for the projects grid.
 *
 * Structure matches the Stitch "DockYard Projects Grid" wireframe:
 * project name, status badge, description, health dot + confidence %,
 * tech stack pills, connection strength bar, last activity.
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  currentPhase: string | null;
  techStack: string[] | null;
  updatedAt: string;
  healthStatus?: string;
  confidenceScore?: number;
}

interface ProjectCardProps {
  project: ProjectSummary;
}

const HEALTH_BADGE: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-300 border-green-500/40",
  degraded: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  down: "bg-red-500/20 text-red-300 border-red-500/40",
  unknown: "bg-white/10 text-foreground/50 border-white/15",
};

function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 2592000) return `${Math.floor(diffSecs / 86400)}d ago`;
  return `${Math.floor(diffSecs / 2592000)}mo ago`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const health = project.healthStatus ?? "unknown";
  const tags = project.techStack ?? [];
  const confidence = project.confidenceScore;
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <Link href={`/projects/${project.slug}`} className="group block transition-transform duration-100 active:scale-[0.98]">
      <Card className="h-full border-glass-border bg-card backdrop-blur-lg transition-all duration-200 group-hover:border-glass-border-strong group-hover:shadow-[0_0_20px_rgba(12,140,233,0.08)]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm transition-colors group-hover:text-[var(--color-brand-500)]">
              {project.name}
            </CardTitle>
            <Badge
              variant="outline"
              className={`shrink-0 text-[10px] ${HEALTH_BADGE[health]}`}
            >
              {health}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Description */}
          {project.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          )}

          {/* Confidence — prominent */}
          {confidencePct != null && (
            <div className="flex items-center gap-2">
              <span className="font-data text-lg font-semibold tabular-nums text-foreground">
                {confidencePct}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                confidence
              </span>
            </div>
          )}

          {/* Tech stack pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-glass-border bg-glass-bg px-1.5 py-0.5 text-[10px] text-muted-foreground/70"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 5 && (
                <span className="px-1 text-[10px] text-muted-foreground/40">
                  +{tags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Footer: last activity */}
          <p className="text-[10px] text-foreground/50">
            Last: {formatRelative(project.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
