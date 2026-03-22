import { Skeleton, CardSkeleton } from "@/components/layout/skeleton";

export default function HealthDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="h-6 w-48" />
      <CardSkeleton />
    </div>
  );
}
