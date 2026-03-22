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

import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { useReAuth } from "@/components/auth/reauth-modal";

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

/** Shape returned by GET /api/projects/[slug]/config */
interface ApiConfigEntry {
  id: string;
  key: string;
  value_encrypted: string;
  environment: string;
  is_secret: boolean;
  category: string;
  display_name: string;
  description: string;
  input_type: string;
  input_options: unknown;
}

/** Map API input_type to local ConfigEntry type */
function mapInputType(
  inputType: string,
  isSecret: boolean,
): ConfigEntry["type"] {
  if (isSecret) return "secret";
  if (inputType === "toggle") return "toggle";
  if (inputType === "number") return "number";
  return "text";
}

/** Group a flat array of API config entries into ConfigCategory[] */
function groupByCategory(entries: ApiConfigEntry[]): ConfigCategory[] {
  const groups = new Map<string, ConfigEntry[]>();
  for (const entry of entries) {
    const cat = entry.category || "General";
    if (!groups.has(cat)) groups.set(cat, []);
    const group = groups.get(cat) ?? [];
    group.push({
      key: entry.key,
      value: entry.is_secret ? "***" : entry.value_encrypted,
      type: mapInputType(entry.input_type, entry.is_secret),
    });
  }
  return Array.from(groups.entries()).map(([name, items]) => ({
    name,
    entries: items,
  }));
}

export default function ConfigPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [categories, setCategories] =
    useState<ConfigCategory[]>(DEMO_CATEGORIES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["Database", "AI Provider"])
  );
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { requireReAuth, ReAuthGate } = useReAuth();

  // GAP-008: Auto-rollback toggle state
  const [autoRollback, setAutoRollback] = useState(true);

  // GAP-009: Template selection state
  const [templates, setTemplates] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  /** Update a single config entry value in local state */
  const updateEntryValue = (
    categoryName: string,
    entryKey: string,
    newValue: string,
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name !== categoryName
          ? cat
          : {
              ...cat,
              entries: cat.entries.map((e) =>
                e.key !== entryKey ? e : { ...e, value: newValue },
              ),
            },
      ),
    );
  };

  /** POST current config to apply endpoint and trigger redeploy */
  const handleApply = async () => {
    const confirmed = await requireReAuth(
      "Apply configuration changes and trigger a redeploy? This will restart the application with the new environment variables."
    );
    if (!confirmed) return;

    setApplying(true);
    setFeedback(null);
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const entries = categories.flatMap((cat) =>
        cat.entries.map((e) => ({
          key: e.key,
          value: e.value,
          category: cat.name,
        })),
      );
      const res = await fetch(`${base}/api/projects/${slug}/config/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
      }
      setFeedback({
        type: "success",
        message: "Config applied — redeploy triggered.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to apply config.",
      });
    } finally {
      setApplying(false);
    }
  };

  /** Save current categories as a reusable config template */
  const handleSaveTemplate = async () => {
    const templateName = prompt("Template name:");
    if (!templateName) return;
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${base}/api/projects/${slug}/config/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: templateName, categories }),
        },
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setFeedback({ type: "success", message: "Template saved." });
    } catch {
      setFeedback({ type: "error", message: "Failed to save template." });
    }
  };

  /** GAP-008: Toggle auto-rollback setting for the project. */
  const handleAutoRollbackToggle = async (enabled: boolean) => {
    setAutoRollback(enabled);
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${base}/api/projects/${slug}/config/rollback`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );
      if (!res.ok) {
        setAutoRollback(!enabled);
        setFeedback({
          type: "error",
          message: "Failed to update auto-rollback setting.",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: `Auto-rollback ${enabled ? "enabled" : "disabled"}.`,
      });
    } catch {
      setAutoRollback(!enabled);
      setFeedback({
        type: "error",
        message: "Failed to update auto-rollback setting.",
      });
    }
  };

  /** GAP-009: Apply a config template to the project. */
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${base}/api/projects/${slug}/config/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            templateId: selectedTemplateId,
          }),
        },
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setFeedback({ type: "success", message: "Template applied." });
      // Reload config entries after applying template
      const configRes = await fetch(`${base}/api/projects/${slug}/config`);
      if (configRes.ok) {
        const data = (await configRes.json()) as ApiConfigEntry[];
        if (data.length > 0) {
          setCategories(groupByCategory(data));
        }
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to apply template." });
    }
  };

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Fetch config entries
    fetch(`${base}/api/projects/${slug}/config`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<ApiConfigEntry[]>;
      })
      .then((data) => {
        if (data && data.length > 0) {
          setCategories(groupByCategory(data));
        }
      })
      .catch(() => {
        /* Keep DEMO_CATEGORIES as fallback */
      });

    // GAP-008: Fetch auto-rollback config
    fetch(`${base}/api/projects/${slug}/config/rollback`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ enabled: boolean }>;
      })
      .then((data) => {
        if (data) setAutoRollback(data.enabled);
      })
      .catch(() => {});

    // GAP-009: Fetch available templates
    fetch(`${base}/api/projects/${slug}/config/templates`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ id: string; name: string }[]>;
      })
      .then((data) => {
        if (data && Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {});
  }, [slug]);

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
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="max-w-[200px] rounded-md bg-glass-input border border-glass-border px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Select template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={!selectedTemplateId}
          onClick={handleApplyTemplate}
        >
          Apply
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleSaveTemplate}
        >
          Save as Template
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-foreground/50">Auto-Rollback</span>
          <Switch
            checked={autoRollback}
            onCheckedChange={handleAutoRollbackToggle}
          />
        </div>
      </div>

      {/* Category groups */}
      {categories.map((cat) => {
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
                          <Switch
                            checked={entry.value === "true"}
                            onCheckedChange={(checked: boolean) =>
                              updateEntryValue(
                                cat.name,
                                entry.key,
                                String(checked),
                              )
                            }
                          />
                        ) : entry.type === "secret" ? (
                          <Input
                            type={
                              revealedKeys.has(entry.key) ? "text" : "password"
                            }
                            value={entry.value}
                            onChange={(e) =>
                              updateEntryValue(
                                cat.name,
                                entry.key,
                                e.target.value,
                              )
                            }
                            className="w-full bg-glass-input border-glass-border text-sm sm:max-w-[300px]"
                          />
                        ) : (
                          <Input
                            value={entry.value}
                            onChange={(e) =>
                              updateEntryValue(
                                cat.name,
                                entry.key,
                                e.target.value,
                              )
                            }
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

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-3">
        <Button
          size="sm"
          className="text-xs"
          disabled={applying}
          onClick={handleApply}
        >
          {applying ? "Applying..." : "Apply & Redeploy"}
        </Button>
      </div>

      <ReAuthGate />
    </div>
  );
}
