/**
 * Settings page — /settings
 *
 * Client component. Standalone page accessed via sidebar Settings button.
 * 8 tabs: General, Projects, Sources, Notifications, AI, Kuma, MFA, Audit.
 * Active tab synced with URL search param `?tab=` for persistence across refresh.
 */

"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ClientTabs } from "@/components/layout/page-tabs";
import {
  GeneralTab,
  ProjectsTab,
  SourcesTab,
  NotificationsTab,
  AITab,
  MFATab,
  AuditTab,
  KumaTab,
} from "@/components/settings/settings-tabs";

const SETTINGS_TABS = [
  "General",
  "Projects",
  "Sources",
  "Notifications",
  "AI",
  "Kuma",
  "MFA",
  "Audit",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_CONTENT: Record<SettingsTab, () => React.JSX.Element> = {
  General: GeneralTab,
  Projects: ProjectsTab,
  Sources: SourcesTab,
  Notifications: NotificationsTab,
  AI: AITab,
  Kuma: KumaTab,
  MFA: MFATab,
  Audit: AuditTab,
};

function isValidTab(tab: string | null): tab is SettingsTab {
  return tab !== null && (SETTINGS_TABS as readonly string[]).includes(tab);
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab");
  const activeTab: SettingsTab = isValidTab(rawTab) ? rawTab : "General";
  const Content = TAB_CONTENT[activeTab];

  const handleTabChange = (tab: string) => {
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <ClientTabs
        tabs={[...SETTINGS_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <Content />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded-md bg-card/50" />
          <div className="h-64 animate-pulse rounded-md bg-card/50" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
