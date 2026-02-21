"use client";

import type {
  GetResourcesResponse,
  ResourceListItem,
  ResourceDetailItem,
} from "@/lib/types";
import { applyVoteChange, type UiVote } from "@/lib/vote-utils";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export const createOptimisticVoteUpdater =
  (previousVote: UiVote, nextVote: UiVote) =>
  <
    T extends Pick<
      ResourceListItem,
      "userVote" | "upvoteCount" | "downvoteCount"
    >,
  >(
    resource: T,
  ) =>
    applyVoteChange(resource, nextVote, previousVote);

export const useVoteCache = () => {
  const queryClient = useQueryClient();

  const patchResourcesCache = useCallback(
    (
      resourceId: string,
      updater: (resource: ResourceListItem) => ResourceListItem,
    ) => {
      queryClient.setQueriesData<InfiniteData<GetResourcesResponse>>(
        { queryKey: ["resources"] },
        (current) => {
          if (!current) return current;

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((resource) =>
                resource.id === resourceId ? updater(resource) : resource,
              ),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  const patchResourceDetailCache = useCallback(
    (
      resourceId: string,
      updater: (resource: ResourceDetailItem) => ResourceDetailItem,
    ) => {
      queryClient.setQueryData<ResourceDetailItem | undefined>(
        ["resource", resourceId],
        (current) => {
          if (!current) return current;
          return updater(current);
        },
      );
    },
    [queryClient],
  );

  return {
    patchResourcesCache,
    patchResourceDetailCache,
  };
};
