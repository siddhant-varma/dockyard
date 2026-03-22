import { CardSkeleton, Skeleton } from "@/components/layout/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
