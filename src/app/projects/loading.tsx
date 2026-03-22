import { GridSkeleton, Skeleton } from "@/components/layout/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <GridSkeleton count={6} />
    </div>
  );
}
