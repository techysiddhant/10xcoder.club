import ResourceCardSkeleton from "./resource-card-skeleton";

interface ResourceGridSkeletonProps {
  count?: number;
}

const ResourceGridSkeleton = ({ count = 10 }: ResourceGridSkeletonProps) => {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ResourceCardSkeleton key={index} index={index} />
      ))}
    </div>
  );
};

export default ResourceGridSkeleton;
