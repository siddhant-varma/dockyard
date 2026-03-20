/**
 * Settings page — /settings
 *
 * Server component. Renders 7 tabs: General, Projects, Sources,
 * Notifications, AI, MFA, Audit. Glass Observatory styling.
 * New tabs (Notifications, AI, MFA, Audit) wire Phase 2 features.
 */

import Link from "next/link";
import { db } from "@/db/connection";
import { platformSettings, discoverySources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GeneralTab } from "@/components/settings/general-tab";
import { ProjectsTab } from "@/components/settings/projects-tab";
import { SourcesTab } from "@/components/settings/sources-tab";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "general", label: "General" },
  { id: "projects", label: "Projects" },
  { id: "sources", label: "Sources" },
  { id: "notifications", label: "Notifications" },
  { id: "ai", label: "AI" },
  { id: "mfa", label: "MFA" },
  { id: "audit", label: "Audit" },
] as const;

export default async function SettingsPage({ searchParams }: Props) {
  const { tab = "general" } = await searchParams;

  let settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, "singleton"),
  });

  if (!settings) {
    [settings] = await db
      .insert(platformSettings)
      .values({
        id: "singleton",
        operatingMode: "local",
        autoScan: true,
        scanInterval: 300,
      })
      .onConflictDoNothing()
      .returning();

    if (!settings) {
      settings = await db.query.platformSettings.findFirst({
        where: eq(platformSettings.id, "singleton"),
      });
    }
  }

  const allProjects = await db.query.projects.findMany({
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  let allSources = await db.query.discoverySources.findMany({
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });

  if (allSources.length === 0) {
    await db
      .insert(discoverySources)
      .values({
        type: "filesystem",
        name: "Local Projects",
        config: { path: "..", recursive: false },
        enabled: true,
      })
      .onConflictDoNothing();

    allSources = await db.query.discoverySources.findMany({
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Settings</h1>

      {/* Tab bar */}
      <div className="mb-6 border-b border-glass-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Settings tabs">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`/settings?tab=${t.id}`}
                className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[var(--color-brand-500)]"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-500)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "general" && (
        <GeneralTab
          initial={{
            operatingMode: settings?.operatingMode ?? "local",
            autoScan: settings?.autoScan ?? true,
            scanInterval: settings?.scanInterval ?? 300,
          }}
        />
      )}

      {tab === "projects" && (
        <ProjectsTab
          initial={allProjects.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,
            discoveredVia: p.discoveredVia,
            techStack: p.techStack,
          }))}
        />
      )}

      {tab === "sources" && (
        <SourcesTab
          initial={allSources.map((s) => ({
            id: s.id,
            type: s.type,
            name: s.name,
            enabled: s.enabled,
            lastScanAt: s.lastScanAt?.toISOString() ?? null,
            lastScanResult: s.lastScanResult as {
              found?: number;
            } | null,
          }))}
        />
      )}

      {tab === "notifications" && <NotificationsPlaceholder />}
      {tab === "ai" && <AiProviderPlaceholder />}
      {tab === "mfa" && <MfaPlaceholder />}
      {tab === "audit" && <AuditPlaceholder />}
    </div>
  );
}

/** Placeholder for Notifications tab — to be built with full provider config. */
function NotificationsPlaceholder() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground/70">
        Configure notification channels for alerts and incidents.
      </p>
      {["Slack", "Email (Resend)", "Web Push"].map((channel) => (
        <div
          key={channel}
          className="flex items-center justify-between rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-sm"
        >
          <div>
            <h3 className="text-sm font-medium text-foreground">{channel}</h3>
            <p className="text-xs text-muted-foreground/50">Not configured</p>
          </div>
          <span className="rounded-full bg-glass-hover border border-glass-border px-2.5 py-0.5 text-xs text-muted-foreground/50">
            Setup Required
          </span>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for AI Provider tab. */
function AiProviderPlaceholder() {
  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm space-y-4">
      <p className="text-sm text-muted-foreground/70">
        Configure the AI provider for weekly summaries and confidence scoring.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground/70 mb-1">
            Provider
          </label>
          <div className="rounded-lg border border-glass-border bg-glass-input px-3 py-2 text-sm text-muted-foreground/50">
            Not configured
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground/70 mb-1">
            Model
          </label>
          <div className="rounded-lg border border-glass-border bg-glass-input px-3 py-2 text-sm text-muted-foreground/50">
            —
          </div>
        </div>
      </div>
    </div>
  );
}

/** Placeholder for MFA tab — wires existing MfaEnrollment component. */
function MfaPlaceholder() {
  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm space-y-4">
      <p className="text-sm text-muted-foreground/70">
        Set up multi-factor authentication for your account.
      </p>
      <div className="rounded-xl border border-dashed border-glass-border-strong bg-glass-bg p-8 text-center">
        <p className="text-sm text-muted-foreground/60">
          Passkey (FIDO2) and TOTP enrollment available when authenticated.
        </p>
      </div>
    </div>
  );
}

/** Placeholder for Audit Log tab. */
function AuditPlaceholder() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground/70">
        Immutable log of all mutations across the platform.
      </p>
      <div className="overflow-hidden rounded-xl border border-glass-border bg-glass-bg backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-glass-border text-left">
              {["Timestamp", "Actor", "Action", "Target"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-muted-foreground/50"
              >
                No audit entries yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
