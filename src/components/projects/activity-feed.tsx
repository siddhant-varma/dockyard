/**
 * ActivityFeed — vertical timeline of recent project events.
 *
 * Matches Stitch "Live Stream" section + WIREFRAMES.md sidebar activity.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ActivityEvent {
  id: string;
  type: "push" | "deploy" | "config" | "alert" | "member";
  summary: string;
  timeAgo: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const TYPE_ICON: Record<string, string> = {
  push: "text-blue-400",
  deploy: "text-green-400",
  config: "text-yellow-400",
  alert: "text-red-400",
  member: "text-purple-400",
};

const TYPE_SYMBOL: Record<string, string> = {
  push: "↑",
  deploy: "✓",
  config: "⚙",
  alert: "!",
  member: "+",
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-foreground/40">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold ${TYPE_ICON[event.type] ?? "text-foreground/40"}`}
                >
                  {TYPE_SYMBOL[event.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/70">{event.summary}</p>
                  <p className="text-[10px] text-foreground/30">
                    {event.timeAgo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
