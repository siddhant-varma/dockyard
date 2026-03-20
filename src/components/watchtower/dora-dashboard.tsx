/**
 * DoraDashboard — displays the four DORA metrics in a 2x2 grid.
 *
 * Each card shows: metric name, value, performance level badge, trend.
 */

interface DoraMetric {
  name: string;
  value: string;
  level: "elite" | "high" | "medium" | "low";
  trend: "up" | "down" | "stable";
}

interface DoraDashboardProps {
  metrics: {
    deployFrequency: DoraMetric;
    leadTime: DoraMetric;
    mttr: DoraMetric;
    changeFailureRate: DoraMetric;
  };
}

const LEVEL_COLORS: Record<string, string> = {
  elite: "bg-green-100 text-green-800",
  high: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

const TREND_ICONS: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export function DoraDashboard({ metrics }: DoraDashboardProps) {
  const cards = [
    { ...metrics.deployFrequency, label: "Deploy Frequency" },
    { ...metrics.leadTime, label: "Lead Time for Changes" },
    { ...metrics.mttr, label: "Mean Time to Recovery" },
    { ...metrics.changeFailureRate, label: "Change Failure Rate" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-600">{card.label}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[card.level]}`}>
              {card.level.charAt(0).toUpperCase() + card.level.slice(1)}
            </span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold">{card.value}</span>
            <span className="text-sm text-gray-500">{TREND_ICONS[card.trend]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
