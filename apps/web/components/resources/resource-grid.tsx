import ResourceCard from "./resource-card";
import { PackageOpen } from "lucide-react";
import type { ResourceListItem } from "@/lib/types";

interface ResourceGridProps {
  resources: ResourceListItem[];
  onVote: (id: string, vote: "up" | "down" | null) => void;
}

const ResourceGrid = ({ resources, onVote }: ResourceGridProps) => {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No resources found
        </h3>
        <p className="text-muted-foreground max-w-md">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4">
      {resources.map((resource) => (
        <div key={resource.id} className="break-inside-avoid">
          <ResourceCard resource={resource} onVote={onVote} />
        </div>
      ))}
    </div>
  );
};

export default ResourceGrid;
