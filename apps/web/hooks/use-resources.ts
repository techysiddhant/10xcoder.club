"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getResources } from "@/lib/http";
import type { GetResourcesParams, GetResourcesResponse } from "@/lib/types";

const RESOURCES_QUERY_KEY = "resources";

export function useResources(params: Omit<GetResourcesParams, "cursor">) {
  const query = useInfiniteQuery({
    queryKey: [RESOURCES_QUERY_KEY, params],
    queryFn: async ({ pageParam }): Promise<GetResourcesResponse> => {
      const res = await getResources({
        ...params,
        cursor: pageParam as string | undefined,
        limit: params.limit ?? 20,
      });
      return res.data as GetResourcesResponse;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
