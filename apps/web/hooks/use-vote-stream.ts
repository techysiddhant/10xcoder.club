"use client";

import { publicEnv } from "@/env/public";
import { useEffect, useRef, useState } from "react";

export type VoteStreamUpdate = {
  resourceId: string;
  upvotes: number;
  downvotes: number;
};

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

export const useVoteStream = ({
  enabled = true,
  onVoteUpdate,
}: {
  enabled?: boolean;
  onVoteUpdate: (update: VoteStreamUpdate) => void;
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const latestOnVoteUpdateRef = useRef(onVoteUpdate);

  useEffect(() => {
    latestOnVoteUpdateRef.current = onVoteUpdate;
  }, [onVoteUpdate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const streamUrl = `${publicEnv.NEXT_PUBLIC_API_URL}/api/vote/stream`;
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as VoteStreamMessage;

        if ("type" in payload && payload.type === "connected") {
          return;
        }

        if (
          "resourceId" in payload &&
          typeof payload.resourceId === "string" &&
          typeof payload.upvotes === "number" &&
          typeof payload.downvotes === "number"
        ) {
          latestOnVoteUpdateRef.current({
            resourceId: payload.resourceId,
            upvotes: payload.upvotes,
            downvotes: payload.downvotes,
          });
        }
      } catch (error) {
        console.error("Failed to parse vote SSE message", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  return { isConnected };
};
