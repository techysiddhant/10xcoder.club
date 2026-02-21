"use client";

import {
  downvoteResource,
  upvoteResource,
  type VoteResponse,
} from "@/lib/http";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";

export type VoteTarget = "up" | "down";

export const useVote = () => {
  const mutation = useMutation({
    mutationFn: async ({
      resourceId,
      targetVote,
    }: {
      resourceId: string;
      targetVote: VoteTarget;
    }): Promise<VoteResponse> => {
      const response =
        targetVote === "up"
          ? await upvoteResource(resourceId)
          : await downvoteResource(resourceId);

      return response.data;
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.error("Sign in to vote on resources");
        return;
      }

      toast.error("Failed to update vote. Please try again.");
    },
  });

  return {
    submitVote: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};
