"use client";

import { publicEnv } from "@/env/public";
import type { GetResourcesResponse, ResourceDetailItem } from "@/lib/types";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type VoteStreamMessage =
  | {
      type: "connected";
      clientId: string;
    }
  | {
      resourceId: string;
      upvotes: number;
      downvotes: number;
      action?: "add" | "remove" | "switch";
      type?: "upvote" | "downvote";
    };

export const VoteStreamProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const streamUrl = `${publicEnv.NEXT_PUBLIC_API_URL}/api/vote/stream`;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    const reconnectDelayMs = 3_000;

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as VoteStreamMessage;

        if ("type" in payload && payload.type === "connected") {
          return;
        }

        if (
          !("resourceId" in payload) ||
          typeof payload.resourceId !== "string" ||
          typeof payload.upvotes !== "number" ||
          typeof payload.downvotes !== "number"
        ) {
          return;
        }

        const upvotes = Math.max(0, payload.upvotes);
        const downvotes = Math.max(0, payload.downvotes);

        queryClient.setQueriesData<InfiniteData<GetResourcesResponse>>(
          { queryKey: ["resources"] },
          (current) => {
            if (!current) return current;

            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                data: page.data.map((resource) =>
                  resource.id === payload.resourceId
                    ? {
                        ...resource,
                        upvoteCount: upvotes,
                        downvoteCount: downvotes,
                      }
                    : resource,
                ),
              })),
            };
          },
        );

        queryClient.setQueryData<ResourceDetailItem | undefined>(
          ["resource", payload.resourceId],
          (current) => {
            if (!current) return current;

            return {
              ...current,
              upvoteCount: upvotes,
              downvoteCount: downvotes,
            };
          },
        );
      } catch (error) {
        console.error("Failed to parse vote SSE message", error);
      }
    };

    const scheduleReconnect = () => {
      if (!isMounted || reconnectTimeout) return;

      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
      }, reconnectDelayMs);
    };

    const connect = () => {
      eventSource = new EventSource(streamUrl);
      eventSource.onmessage = handleMessage;
      eventSource.onerror = (error) => {
        console.error("Vote SSE connection error", {
          streamUrl,
          readyState: eventSource?.readyState,
          error,
        });

        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  return <>{children}</>;
};
