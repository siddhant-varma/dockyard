import { GridSkeleton, Skeleton } from "@/components/layout/skeleton";

export default function WatchtowerLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="h-10 w-48 rounded-xl" />
      <GridSkeleton count={8} />
    </div>
  );
}
