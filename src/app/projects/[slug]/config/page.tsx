/**
 * Project Config page — /projects/[slug]/config
 *
 * Client component for interactive env var editing.
 * Matches Stitch "Project Configuration" wireframe + WIREFRAMES.md §9.
 *
 * Template bar, collapsible category groups, env var rows with
 * secret/reveal/slider/toggle inputs.
 */

"use client";

import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";

interface ConfigEntry {
  key: string;
  value: string;
  type: "text" | "secret" | "number" | "toggle";
}

interface ConfigCategory {
  name: string;
  entries: ConfigEntry[];
}

const DEMO_CATEGORIES: ConfigCategory[] = [
  {
    name: "Database",
    entries: [
      { key: "DATABASE_URL", value: "postgresql://...", type: "secret" },
      { key: "DB_POOL_SIZE", value: "20", type: "number" },
      { key: "DB_SSL", value: "true", type: "toggle" },
    ],
  },
  {
    name: "AI Provider",
    entries: [
      { key: "AI_PROVIDER", value: "Anthropic", type: "text" },
      { key: "AI_API_KEY", value: "sk-ant-...", type: "secret" },
      { key: "AI_MODEL", value: "claude-sonnet-4-5-20250514", type: "text" },
      { key: "AI_TEMPERATURE", value: "0.7", type: "number" },
      { key: "AI_MAX_TOKENS", value: "4096", type: "number" },
    ],
  },
  {
    name: "General",
    entries: [
      { key: "NODE_ENV", value: "production", type: "text" },
      { key: "LOG_LEVEL", value: "info", type: "text" },
    ],
  },
  {
    name: "Auth",
    entries: [
      { key: "AUTH_SECRET", value: "***", type: "secret" },
      { key: "GITHUB_CLIENT_ID", value: "Ov23li...", type: "secret" },
      { key: "GITHUB_CLIENT_SECRET", value: "***", type: "secret" },
    ],
  },
];

export default function ConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["Database", "AI Provider"])
  );
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Configuration</h1>

      {/* Template + Rollback bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-5 py-3">
        <Input
          placeholder="Select template..."
          className="max-w-[200px] bg-glass-input border-glass-border text-sm"
        />
        <Button variant="outline" size="sm" className="text-xs">
          Apply
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          Save as Template
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-foreground/50">Auto-Rollback</span>
          <Switch defaultChecked />
        </div>
      </div>

      {/* Category groups */}
      {DEMO_CATEGORIES.map((cat) => {
        const isOpen = expanded.has(cat.name);
        return (
          <div key={cat.name}>
            <button
              onClick={() => toggleCategory(cat.name)}
              className="flex w-full items-center gap-2 py-2 text-sm text-foreground/60 hover:text-foreground/80"
            >
              <span className="text-xs">{isOpen ? "▾" : "▸"}</span>
              <span className="font-medium">{cat.name}</span>
              <span className="text-xs text-foreground/30">
                ({cat.entries.length})
              </span>
            </button>

            {isOpen && (
              <Card className="bg-card border-glass-border backdrop-blur-lg">
                <CardContent className="divide-y divide-glass-border py-2">
                  {cat.entries.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <span className="w-full font-mono text-xs text-foreground/70 sm:w-auto sm:min-w-[160px]">
                        {entry.key}
                      </span>

                      <div className="flex flex-1 items-center gap-2">
                        {entry.type === "toggle" ? (
                          <Switch defaultChecked={entry.value === "true"} />
                        ) : entry.type === "secret" ? (
                          <Input
                            type={
                              revealedKeys.has(entry.key) ? "text" : "password"
                            }
                            defaultValue={entry.value}
                            className="w-full bg-glass-input border-glass-border text-sm sm:max-w-[300px]"
                          />
                        ) : (
                          <Input
                            defaultValue={entry.value}
                            className="w-full bg-glass-input border-glass-border text-sm sm:max-w-[300px]"
                          />
                        )}

                        {entry.type === "secret" && (
                          <>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-yellow-400 border-yellow-500/30"
                            >
                              secret
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px]"
                              onClick={() => toggleReveal(entry.key)}
                            >
                              {revealedKeys.has(entry.key)
                                ? "Hide"
                                : "Reveal"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}

      {/* Action bar */}
      <div className="flex gap-3">
        <Button size="sm" className="text-xs">
          Apply & Redeploy
        </Button>
      </div>
    </div>
  );
}
