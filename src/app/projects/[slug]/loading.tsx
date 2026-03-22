import { Skeleton, CardSkeleton } from "@/components/layout/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-full rounded-xl" />
      <Skeleton className="h-6 w-64" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    </div>
  );
}
