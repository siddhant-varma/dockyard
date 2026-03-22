"use client";

/**
 * ContextHandoff — displays the AI context handoff block for a project.
 *
 * Fetches from GET /api/projects/:slug/handoff?format=json and renders
 * the structured snapshot with a "Copy to Clipboard" button for easy
 * transfer to AI coding agents.
 */

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContextHandoffProps {
  /** Project slug used to build the API URL. */
  slug: string;
}

interface HandoffData {
  projectName?: string;
  phase?: string;
  velocity?: Record<string, unknown>;
  blockers?: Array<Record<string, unknown>>;
  recentActivity?: Array<Record<string, unknown>>;
  health?: Record<string, unknown>;
  [key: string]: unknown;
}

export function ContextHandoff({ slug }: ContextHandoffProps) {
  const [data, setData] = useState<HandoffData | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [jsonRes, mdRes] = await Promise.all([
          fetch(`/api/projects/${slug}/handoff?format=json`),
          fetch(`/api/projects/${slug}/handoff?format=markdown`),
        ]);

        if (cancelled) return;

        if (jsonRes.ok) {
          setData(await jsonRes.json());
        } else {
          setError("Failed to load handoff data");
        }

        if (mdRes.ok) {
          setRawText(await mdRes.text());
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleCopy = useCallback(async () => {
    const text = rawText || JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rawText, data]);

  if (loading) {
    return (
      <Card className="bg-card border-glass-border backdrop-blur-lg animate-pulse">
        <CardContent className="h-32 p-4" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Context Handoff</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/40">
            {error ?? "No handoff data available."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Context Handoff</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
        </div>
        <p className="text-[10px] text-foreground/30">
          Structured snapshot for AI coding agents
        </p>
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-glass-border bg-background/30 p-3 text-xs leading-relaxed text-foreground/60 font-mono">
          {rawText || JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
