/**
 * Alerts page — /watchtower/alerts
 *
 * Server component. Fetches active alert events and alert rules in parallel,
 * then renders:
 * - AlertEventsList: live firing/acknowledged events
 * - Alert rule creation form (inline, submits to POST /api/alerts)
 */

import { AlertEventsList } from "@/components/alerts/alert-events-list";
import { AlertRuleForm } from "@/components/alerts/alert-rule-form";

interface AlertEvent {
  id: string;
  severity: string;
  status: string;
  message: string | null;
  triggeredAt: string;
  projectId: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
}

async function fetchAlertEvents(): Promise<AlertEvent[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/alerts/events`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return res.json() as Promise<AlertEvent[]>;
}

async function fetchAlertRules(): Promise<AlertRule[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/alerts`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  return res.json() as Promise<AlertRule[]>;
}

export default async function AlertsPage() {
  const [events, rules] = await Promise.all([
    fetchAlertEvents(),
    fetchAlertRules(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Alert Rules & Events
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Active alert events and rule configuration.
        </p>
      </div>

      {/* Active events */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          Active Events
        </h2>
        <AlertEventsList initialEvents={events} />
      </section>

      {/* Rule list */}
      {rules.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Alert Rules
          </h2>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {rule.name}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {rule.metric} {rule.operator} {rule.threshold}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {rule.severity.toUpperCase()}
                    </span>
                    <span
                      className={`text-xs ${
                        rule.enabled
                          ? "text-green-600 dark:text-green-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Create new rule */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          Create Alert Rule
        </h2>
        <AlertRuleForm />
      </section>
    </div>
  );
}
