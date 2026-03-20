/**
 * ConfidenceBreakdown — shows factor-by-factor confidence score analysis.
 *
 * Displays each contributing factor (velocity, blockers, recency, health)
 * with its impact on the overall score and explanatory tooltips.
 *
 * @param breakdown - The breakdown object from the confidence calculation.
 * @param score - The overall confidence score.
 * @param decayWarning - Whether to show a staleness warning.
 */

interface BreakdownData {
  velocityFactor: number;
  blockerPenalty: number;
  recencyPenalty: number;
  healthPenalty: number;
  manualOverride: boolean;
}

interface ConfidenceBreakdownProps {
  breakdown: BreakdownData;
  score: number;
  decayWarning: boolean;
}

const FACTOR_INFO = {
  velocity: {
    label: "Velocity",
    description: "Based on items completed per week vs remaining roadmap items",
    positive: true,
  },
  blockers: {
    label: "Blockers",
    description: "Active blockers reduce confidence by 0.05-0.15 each based on severity",
    positive: false,
  },
  recency: {
    label: "Checkpoint Recency",
    description: "Score decays 0.02/day after 14 days without a manual checkpoint",
    positive: false,
  },
  health: {
    label: "Service Health",
    description: "Degraded services reduce by 0.10, down services by 0.20",
    positive: false,
  },
} as const;

export function ConfidenceBreakdown({
  breakdown,
  score,
  decayWarning,
}: ConfidenceBreakdownProps) {
  return (
    <div className="space-y-3">
      {breakdown.manualOverride && (
        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
          Score set by manual checkpoint (overrides automated calculation for 7 days)
        </div>
      )}

      <div className="space-y-2">
        <FactorRow
          label={FACTOR_INFO.velocity.label}
          value={breakdown.velocityFactor}
          description={FACTOR_INFO.velocity.description}
          positive
        />
        <FactorRow
          label={FACTOR_INFO.blockers.label}
          value={breakdown.blockerPenalty}
          description={FACTOR_INFO.blockers.description}
          positive={false}
        />
        <FactorRow
          label={FACTOR_INFO.recency.label}
          value={breakdown.recencyPenalty}
          description={FACTOR_INFO.recency.description}
          positive={false}
        />
        <FactorRow
          label={FACTOR_INFO.health.label}
          value={breakdown.healthPenalty}
          description={FACTOR_INFO.health.description}
          positive={false}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-sm font-semibold">Overall Score</span>
        <span className="text-sm font-bold">{Math.round(score * 100)}%</span>
      </div>

      {decayWarning && (
        <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700">
          Score is decaying — add a manual checkpoint to refresh.
        </div>
      )}
    </div>
  );
}

function FactorRow({
  label,
  value,
  description,
  positive,
}: {
  label: string;
  value: number;
  description: string;
  positive: boolean;
}) {
  const display = positive
    ? `+${(value * 100).toFixed(0)}%`
    : value > 0
      ? `-${(value * 100).toFixed(0)}%`
      : "0%";

  const colorClass = positive
    ? "text-green-600"
    : value > 0
      ? "text-red-600"
      : "text-gray-400";

  return (
    <div className="flex items-center justify-between text-sm" title={description}>
      <span className="text-gray-600">{label}</span>
      <span className={`font-mono font-medium ${colorClass}`}>{display}</span>
    </div>
  );
}
