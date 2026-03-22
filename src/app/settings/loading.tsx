import { Skeleton, CardSkeleton } from "@/components/layout/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-full rounded-xl" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
