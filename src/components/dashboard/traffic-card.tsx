/**
 * TrafficCard — shows ingress/egress usage with overage warnings.
 */

interface TrafficUsage {
  ingressGb: number;
  egressGb: number;
  includedGb: number;
  overageGb: number;
  projectedGb: number;
}

interface TrafficCardProps {
  usage: TrafficUsage | null;
}

export function TrafficCard({ usage }: TrafficCardProps) {
  if (!usage) return <p className="text-sm text-gray-500">No traffic data.</p>;

  const usedPercent = Math.min(100, ((usage.ingressGb + usage.egressGb) / usage.includedGb) * 100);
  const barColor = usedPercent >= 100 ? "bg-red-500" : usedPercent >= 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Traffic Usage</h4>
      <div className="flex justify-between text-xs text-gray-500">
        <span>In: {usage.ingressGb.toFixed(1)} GB</span>
        <span>Out: {usage.egressGb.toFixed(1)} GB</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(usedPercent, 100)}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{usedPercent.toFixed(0)}% of {usage.includedGb} GB</span>
        {usage.overageGb > 0 && <span className="font-medium text-red-600">+{usage.overageGb.toFixed(1)} GB overage</span>}
      </div>
    </div>
  );
}
