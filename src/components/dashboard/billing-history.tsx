/**
 * BillingHistory — 6-month bar chart of billing costs.
 *
 * Uses Tremor BarChart for proper data visualization.
 * Matches WIREFRAMES.md "Billing History (6mo)" section.
 */

"use client";

import { BarChart } from "@tremor/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MonthCost {
  month: string;
  cost: number;
  projected?: boolean;
}

interface BillingHistoryProps {
  data: MonthCost[];
  currency?: string;
}

export function BillingHistory({
  data,
  currency = "$",
}: BillingHistoryProps) {
  const chartData = data.map((d) => ({
    month: d.month,
    Cost: d.cost,
  }));

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Billing History (6mo)</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          index="month"
          categories={["Cost"]}
          colors={["blue"]}
          valueFormatter={(v) => `${currency}${v.toFixed(0)}`}
          showLegend={false}
          showGridLines={false}
          className="h-28"
        />
      </CardContent>
    </Card>
  );
}
