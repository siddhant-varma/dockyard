/**
 * Shared types for Watchtower alert components.
 */

export interface AlertEvent {
  id: string;
  severity: "sev1" | "sev2" | "sev3";
  title: string;
  source: string;
  firingFor: string;
  status: "firing" | "acknowledged" | "resolved";
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: string;
  window: string;
  projects: string;
  enabled: boolean;
}
