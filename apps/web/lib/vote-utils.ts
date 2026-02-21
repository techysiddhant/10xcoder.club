import type { ResourceListItem } from "@/lib/types";

export type UiVote = "up" | "down" | null;

type VoteableResource = Pick<
  ResourceListItem,
  "userVote" | "upvoteCount" | "downvoteCount"
>;

export const mapApiVoteToUiVote = (
  userVote: ResourceListItem["userVote"],
): UiVote => {
  if (userVote === "upvote") return "up";
  if (userVote === "downvote") return "down";
  return null;
};

export const mapUiVoteToApiVote = (
  userVote: UiVote,
): ResourceListItem["userVote"] => {
  if (userVote === "up") return "upvote";
  if (userVote === "down") return "downvote";
  return null;
};

export const clampVoteCount = (count: number) => Math.max(0, count);

export const applyVoteChange = <T extends VoteableResource>(
  resource: T,
  nextVote: UiVote,
  previousVote: UiVote = mapApiVoteToUiVote(resource.userVote),
): T => {
  let upvotes = clampVoteCount(resource.upvoteCount);
  let downvotes = clampVoteCount(resource.downvoteCount);

  if (previousVote === nextVote) {
    return resource;
  }

  if (previousVote === "up") upvotes = Math.max(0, upvotes - 1);
  if (previousVote === "down") downvotes = Math.max(0, downvotes - 1);
  if (nextVote === "up") upvotes += 1;
  if (nextVote === "down") downvotes += 1;

  return {
    ...resource,
    userVote: mapUiVoteToApiVote(nextVote),
    upvoteCount: clampVoteCount(upvotes),
    downvoteCount: clampVoteCount(downvotes),
  };
};
