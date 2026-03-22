/**
 * Settings page — /settings
 *
 * Client component. Standalone page accessed via sidebar Settings button.
 * 7 tabs: General, Projects, Sources, Notifications, AI, MFA, Audit.
 * Tab content extracted to src/components/settings/settings-tabs.tsx.
 */

"use client";

import { useState } from "react";
import { ClientTabs } from "@/components/layout/page-tabs";
import {
  GeneralTab,
  ProjectsTab,
  SourcesTab,
  NotificationsTab,
  AITab,
  MFATab,
  AuditTab,
} from "@/components/settings/settings-tabs";

const SETTINGS_TABS = [
  "General",
  "Projects",
  "Sources",
  "Notifications",
  "AI",
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
  MFA: MFATab,
  Audit: AuditTab,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const Content = TAB_CONTENT[activeTab];

  return (
    <div className="space-y-6">
      <ClientTabs
        tabs={[...SETTINGS_TABS]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as SettingsTab)}
      />
      <Content />
    </div>
  );
}
