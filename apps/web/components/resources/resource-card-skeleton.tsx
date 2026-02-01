import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

const HEIGHTS = ["h-32", "h-40", "h-48"] as const;

interface ResourceCardSkeletonProps {
  index?: number;
}

const ResourceCardSkeleton = ({ index = 0 }: ResourceCardSkeletonProps) => {
  const heightClass = HEIGHTS[index % HEIGHTS.length];
  return (
    <Card className="bg-card border-border/50 overflow-hidden break-inside-avoid mb-4">
      {/* Image skeleton - variable height for masonry effect (deterministic from index) */}
      <Skeleton className={cn("w-full", heightClass)} />

      <CardContent className="p-4">
        {/* Type Badge & External Link */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <Skeleton className="w-4 h-4" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-2" />

        {/* Description */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-3" />

        {/* Author */}
        <Skeleton className="h-3 w-24 mb-3" />

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Skeleton className="w-14 h-5 rounded-full" />
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-12 h-5 rounded-full" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Skeleton className="w-10 h-5 rounded-full" />
          <Skeleton className="w-14 h-5 rounded-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-20 h-3" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="w-14 h-7 rounded-full" />
            <Skeleton className="w-14 h-7 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceCardSkeleton;
