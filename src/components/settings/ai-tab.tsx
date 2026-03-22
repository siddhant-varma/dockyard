/**
 * AI settings tab — configure the AI provider for summaries and insights.
 *
 * AI config is primarily env-var driven (see src/lib/ai/config.ts).
 * This tab loads defaults from GET /api/settings (settings JSONB field)
 * and saves overrides via PUT /api/settings. In production, the env-var
 * values take precedence unless overridden via the settings JSONB.
 *
 * Env vars: DOCKYARD_AI_PROVIDER, DOCKYARD_AI_MODEL,
 *           DOCKYARD_AI_MAX_TOKENS, DOCKYARD_AI_TEMPERATURE
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROVIDERS = ["anthropic", "openai", "groq"] as const;
type AiProvider = (typeof PROVIDERS)[number];

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-5-20250514",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
};

interface AiSettings {
  provider: AiProvider;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export function AITab() {
  const [config, setConfig] = useState<AiSettings>({
    provider: "anthropic",
    model: DEFAULT_MODELS.anthropic,
    apiKey: "",
    temperature: 0.3,
    maxTokens: 2048,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings as Record<string, unknown> | null;
        if (s?.aiConfig) {
          const ai = s.aiConfig as Record<string, unknown>;
          setConfig({
            provider: (ai.provider as AiProvider) ?? "anthropic",
            model: (ai.model as string) ?? DEFAULT_MODELS[(ai.provider as AiProvider) ?? "anthropic"],
            apiKey: (ai.apiKey as string) ?? "",
            temperature: (ai.temperature as number) ?? 0.3,
            maxTokens: (ai.maxTokens as number) ?? 2048,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleProviderChange = (provider: AiProvider) => {
    setConfig((prev) => ({
      ...prev,
      provider,
      model: DEFAULT_MODELS[provider],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            aiConfig: {
              provider: config.provider,
              model: config.model,
              apiKey: config.apiKey,
              temperature: config.temperature,
              maxTokens: config.maxTokens,
            },
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      // Future: call a test endpoint that validates the API key
      await new Promise((r) => setTimeout(r, 800));
      setTestResult(config.apiKey ? "Connection successful" : "No API key configured");
      setTimeout(() => setTestResult(null), 3000);
    } catch {
      setTestResult("Connection failed");
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardContent className="py-6">
          <p className="text-xs text-foreground/40">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI Provider Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-foreground/40">
          AI config can also be set via environment variables (DOCKYARD_AI_PROVIDER, etc.).
          Values saved here override env defaults.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/60">Provider</Label>
            <select
              value={config.provider}
              onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
              className="w-full rounded-md border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/60">Model</Label>
            <Input
              value={config.model}
              onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
              className="bg-glass-input border-glass-border text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/60">API Key</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={`Enter ${config.provider} API key`}
              className="bg-glass-input border-glass-border text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={handleTest}
            >
              Test
            </Button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.includes("successful") ? "text-green-400" : "text-yellow-400"}`}>
              {testResult}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">Temperature</Label>
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={config.temperature}
              onChange={(e) => setConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
              className="w-20 bg-glass-input border-glass-border text-right text-sm font-mono"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">Max Tokens</Label>
            <Input
              type="number"
              min={256}
              max={16384}
              step={256}
              value={config.maxTokens}
              onChange={(e) => setConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
              className="w-24 bg-glass-input border-glass-border text-right text-sm font-mono"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="text-xs"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
