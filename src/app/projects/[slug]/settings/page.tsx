/**
 * Project Settings page — /projects/[slug]/settings
 *
 * Client component. DIP level selector, connection strength,
 * notification overrides.
 * Matches Stitch "Project Settings" section from combined wireframe.
 */

"use client";

import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";

const DIP_LEVELS = [
  { level: 1, name: "Passive", desc: "Health checks only" },
  { level: 2, name: "Active", desc: "+ Deployments & config" },
  { level: 3, name: "Integrated", desc: "+ Webhooks & metrics" },
  { level: 4, name: "Full", desc: "+ AI insights & auto-actions" },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">
        Project Settings
      </h1>

      {/* DIP Level */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            DIP Level (DockYard Integration Protocol)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DIP_LEVELS.map((dip) => (
            <label
              key={dip.level}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-glass-border p-3 transition-colors hover:bg-glass-hover"
            >
              <input
                type="radio"
                name="dip-level"
                defaultChecked={dip.level === 2}
                className="accent-[var(--color-brand-500)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground/80">
                    Level {dip.level} — {dip.name}
                  </span>
                </div>
                <p className="text-xs text-foreground/40">{dip.desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Connection Strength */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Connection Strength</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/50">Signal health</span>
            <span className="font-mono text-sm font-medium text-foreground/70">
              80%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5">
            <div className="h-full w-[80%] rounded-full bg-green-400" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-foreground/60">
                Health checks connected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-foreground/60">
                Deploy hooks registered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground/20">○</span>
              <span className="text-foreground/40">
                .dockyard.json not found
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground/20">○</span>
              <span className="text-foreground/40">
                Metrics endpoint not configured
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Overrides */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notification Overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Deploy notifications
            </Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Alert escalations
            </Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Weekly AI summaries
            </Label>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button size="sm" className="text-xs">
          Save Settings
        </Button>
        <Button variant="outline" size="sm" className="text-xs text-red-400">
          Archive Project
        </Button>
      </div>
    </div>
  );
}
