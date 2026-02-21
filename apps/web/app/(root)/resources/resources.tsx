"use client";

import { useCallback, useEffect, useMemo } from "react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useInView } from "react-intersection-observer";

import ResourceFilter from "@/components/resources/resource-filter";
import ResourceGrid from "@/components/resources/resource-grid";
import ResourceGridSkeleton from "@/components/resources/resource-grid-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useResources } from "@/hooks/use-resources";
import { Loader2 } from "lucide-react";
import CreateResource from "@/components/resources/create-resource";
import { useVote } from "@/hooks/use-vote";
import type { ResourceListItem } from "@/lib/types";
import {
  applyVoteChange,
  clampVoteCount,
  mapApiVoteToUiVote,
} from "@/lib/vote-utils";
import { useVoteCache } from "@/hooks/use-vote-cache";

const FILTER_DEBOUNCE_MS = 400;

const Resources = () => {
  const { patchResourcesCache, patchResourceDetailCache } = useVoteCache();
  const { submitVote } = useVote();
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [selectedTypes, setSelectedTypes] = useQueryState(
    "types",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [selectedTechStack, setSelectedTechStack] = useQueryState(
    "tech",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const debouncedSearch = useDebounce(searchQuery, 300);

  // API supports single resourceType; use first selected type for consistency with backend
  const filterPayload = useMemo(
    () => ({
      resourceType: selectedTypes?.[0],
      tag: selectedTags?.length ? selectedTags : undefined,
      techStack: selectedTechStack?.length ? selectedTechStack : undefined,
    }),
    [selectedTypes, selectedTags, selectedTechStack],
  );
  const debouncedFilters = useDebounce(filterPayload, FILTER_DEBOUNCE_MS);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useResources({
    search: debouncedSearch || undefined,
    resourceType: debouncedFilters.resourceType,
    tag: debouncedFilters.tag,
    techStack: debouncedFilters.techStack,
  });

  const isFilterPending =
    JSON.stringify(filterPayload) !== JSON.stringify(debouncedFilters);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resources = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const handleVote = useCallback(
    (id: string, vote: "up" | "down" | null) => {
      const previousResource = resources.find((resource) => resource.id === id);
      if (!previousResource) return;

      const currentVote = mapApiVoteToUiVote(previousResource.userVote);
      const targetVote = vote ?? currentVote;

      if (!targetVote) return;

      patchResourcesCache(id, (resource) => applyVoteChange(resource, vote));
      patchResourceDetailCache(id, (resource) =>
        applyVoteChange(resource, vote),
      );

      void submitVote({ resourceId: id, targetVote })
        .then((result) => {
          const syncVoteState = (
            resource: ResourceListItem,
          ): ResourceListItem => ({
            ...resource,
            userVote: result.userVote,
            upvoteCount: clampVoteCount(result.upvotes),
            downvoteCount: clampVoteCount(result.downvotes),
          });

          patchResourcesCache(id, syncVoteState);
          patchResourceDetailCache(id, (resource) => ({
            ...resource,
            userVote: result.userVote,
            upvoteCount: clampVoteCount(result.upvotes),
            downvoteCount: clampVoteCount(result.downvotes),
          }));
        })
        .catch(() => {
          const rollbackVoteState = (
            resource: ResourceListItem,
          ): ResourceListItem => ({
            ...resource,
            userVote: previousResource.userVote,
            upvoteCount: clampVoteCount(previousResource.upvoteCount),
            downvoteCount: clampVoteCount(previousResource.downvoteCount),
          });

          patchResourcesCache(id, rollbackVoteState);
          patchResourceDetailCache(id, (resource) => ({
            ...resource,
            userVote: previousResource.userVote,
            upvoteCount: clampVoteCount(previousResource.upvoteCount),
            downvoteCount: clampVoteCount(previousResource.downvoteCount),
          }));
        });
    },
    [patchResourceDetailCache, patchResourcesCache, resources, submitVote],
  );

  const handleResourceCreate = useCallback(() => {
    // TODO: Implement resource creation modal/redirect
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedTechStack([]);
    setSelectedTags([]);
  }, [setSearchQuery, setSelectedTypes, setSelectedTechStack, setSelectedTags]);

  const isSearching = searchQuery !== debouncedSearch;

  const filtersApplied =
    searchQuery.trim() !== "" ||
    (selectedTypes?.length ?? 0) > 0 ||
    (selectedTechStack?.length ?? 0) > 0 ||
    (selectedTags?.length ?? 0) > 0;

  return (
    <main className="pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Resources
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover curated resources from the developer community
            </p>
          </div>
          <CreateResource />
        </div>

        {/* Filters */}
        <div className="mb-8">
          <ResourceFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTypes={selectedTypes as string[]}
            onTypesChange={setSelectedTypes}
            selectedTechStack={selectedTechStack as string[]}
            onTechStackChange={setSelectedTechStack}
            selectedTags={selectedTags as string[]}
            onTagsChange={setSelectedTags}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Content */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-destructive mb-2">Failed to load resources</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error
                ? error.message
                : "Please try again later"}
            </p>
          </div>
        ) : isLoading || isSearching || isFilterPending ? (
          <ResourceGridSkeleton count={12} />
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {filtersApplied ? (
              <>
                <p className="text-muted-foreground mb-4">
                  No resources match your filters.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                  <span className="text-muted-foreground">or</span>
                  <CreateResource />
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">No resources yet.</p>
                <CreateResource />
              </>
            )}
          </div>
        ) : (
          <>
            <ResourceGrid resources={resources} onVote={handleVote} />

            {/* Load More Trigger */}
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && resources.length > 0 && (
              <p className="text-center text-muted-foreground py-8">
                You&apos;ve reached the end
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Resources;
