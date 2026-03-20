/**
 * BillingHistoryChart — 6-month billing trend bar chart.
 *
 * Shows monthly costs with breakdown by resource type.
 */

interface MonthlyBilling {
  month: string;
  serverCost: number;
  volumeCost: number;
  ipCost: number;
  trafficCost: number;
  totalCost: number;
}

interface BillingHistoryChartProps {
  data: MonthlyBilling[];
  currency?: string;
}

export function BillingHistoryChart({ data, currency = "EUR" }: BillingHistoryChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No billing data available.</p>;
  }

  const maxCost = Math.max(...data.map((d) => d.totalCost), 1);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Billing History (6 months)</h3>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {data.map((month) => {
          const height = (month.totalCost / maxCost) * 100;
          return (
            <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-mono text-gray-600">
                {currency} {month.totalCost.toFixed(0)}
              </span>
              <div
                className="w-full rounded-t bg-blue-500"
                style={{ height: `${height}%`, minHeight: 2 }}
                title={`Server: ${month.serverCost.toFixed(2)}, Volume: ${month.volumeCost.toFixed(2)}, IP: ${month.ipCost.toFixed(2)}, Traffic: ${month.trafficCost.toFixed(2)}`}
              />
              <span className="text-xs text-gray-400">{month.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
