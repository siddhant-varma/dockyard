/**
 * Settings tab barrel exports.
 *
 * Each tab is extracted into its own file to keep files under 400 lines.
 * This module re-exports all tabs so the settings page can import from
 * a single path.
 */

export { GeneralTab } from "./general-tab";
export { ProjectsTab } from "./projects-tab";
export { SourcesTab } from "./sources-tab";
export { NotificationsTab } from "./notifications-tab";
export { AITab } from "./ai-tab";
export { MFATab } from "./mfa-tab";
export { AuditTab } from "./audit-tab";
