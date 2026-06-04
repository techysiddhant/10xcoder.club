"use client";
import { getResourceById } from "@/lib/http";
import type { ResourceDetailItem, ResourcePlaylistItem } from "@/lib/types";
import { cn, formatYouTubeDuration } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  GitFork,
  GraduationCap,
  ListVideo,
  Play,
  Podcast,
  User,
  Video,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AspectRatio } from "@workspace/ui/components/aspect-ratio";
import { SmartImage } from "@/components/shared/smart-image";
import { ReadMoreDescription } from "@/components/resources/read-more-description";
import { useVote } from "@/hooks/use-vote";
import { VoteCounter } from "@/components/resources/vote-counter";
import { VoteArrowIcon } from "@/components/resources/vote-arrow-icon";
import {
  createOptimisticVoteUpdater,
  useVoteCache,
} from "@/hooks/use-vote-cache";
import { clampVoteCount, mapApiVoteToUiVote } from "@/lib/vote-utils";
function format(date: Date, pattern: string): string {
  if (pattern === "MMM d, yyyy") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }
  return date.toISOString();
}

const typeIcons = {
  article: BookOpen,
  video: Video,
  template: GitFork,
  tool: Wrench,
  course: GraduationCap,
  podcast: Podcast,
};

const typeColors = {
  article: "bg-green-500/10 text-green-500 border-green-500/20",
  video: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  template: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  tool: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  course: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  podcast: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

const ResourceDetail = ({ id }: { id: string }) => {
  const { patchResourcesCache, patchResourceDetailCache } = useVoteCache();
  const { submitVote } = useVote();
  const {
    data: resource,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["resource", id],
    queryFn: () =>
      getResourceById(id).then((res) => res.data.data as ResourceDetailItem),
  });
  const router = useRouter();
  const patchResourceCache = (
    updater: (existing: ResourceDetailItem) => ResourceDetailItem,
  ) => patchResourceDetailCache(id, updater);

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "We couldn't load this resource. Please try again."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/resources")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Button>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!resource && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Resource Not Found
            </h1>
            <p className="text-muted-foreground mb-4">
              The resource you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/resources")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className="flex-1 py-8">
        <div className="container max-w-4xl mx-auto px-4 flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  const res = resource!;
  const Icon = typeIcons[res.resourceType] ?? BookOpen;
  const userVote = mapApiVoteToUiVote(res.userVote);
  const upvoteCount = clampVoteCount(res.upvoteCount ?? 0);
  const downvoteCount = clampVoteCount(res.downvoteCount ?? 0);
  const handleVote = (voteType: "up" | "down") => {
    const nextVote = userVote === voteType ? null : voteType;
    const targetVote = nextVote ?? userVote;
    if (!targetVote) return;

    const previousState = {
      userVote: res.userVote,
      upvoteCount,
      downvoteCount,
    };

    const optimisticUpdater = createOptimisticVoteUpdater(userVote, nextVote);
    patchResourceCache(optimisticUpdater);
    patchResourcesCache(id, optimisticUpdater);

    void submitVote({ resourceId: id, targetVote })
      .then((result) => {
        patchResourceCache((existing) => ({
          ...existing,
          userVote: result.userVote,
          upvoteCount: clampVoteCount(result.upvotes),
          downvoteCount: clampVoteCount(result.downvotes),
        }));
        patchResourcesCache(id, (existing) => ({
          ...existing,
          userVote: result.userVote,
          upvoteCount: clampVoteCount(result.upvotes),
          downvoteCount: clampVoteCount(result.downvotes),
        }));
      })
      .catch(() => {
        patchResourceCache((existing) => ({
          ...existing,
          userVote: previousState.userVote,
          upvoteCount: clampVoteCount(previousState.upvoteCount),
          downvoteCount: clampVoteCount(previousState.downvoteCount),
        }));
        patchResourcesCache(id, (existing) => ({
          ...existing,
          userVote: previousState.userVote,
          upvoteCount: clampVoteCount(previousState.upvoteCount),
          downvoteCount: clampVoteCount(previousState.downvoteCount),
        }));
      });
  };
  return (
    <main className="flex-1 py-8">
      <div className="w-full max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/resources")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resources
        </Button>

        {/* Pending Notice */}
        {res.status === "pending" && (
          <Card className="mb-6 p-0 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-600 mb-1">
                  Under Review
                </h3>
                <p className="text-sm text-muted-foreground">
                  This resource is pending review. It will be visible to
                  everyone once approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection Notice */}
        {res.status === "rejected" && res.rejectionReason && (
          <Card className="mb-6 p-0 border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-600 mb-1">
                  Resource Rejected
                </h3>
                <p className="text-sm text-muted-foreground">
                  {res.rejectionReason}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Card */}
        <Card className="overflow-hidden border-border/50 p-0">
          {/* Image */}
          {res.image && (
            <div className="relative w-full overflow-hidden bg-muted">
              <SmartImage
                src={res.image}
                alt={res.title}
                width={1280}
                height={720}
                aspectRatio="16/9"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 85vw, 1200px"
                priority
                kind="detail"
                className="w-full"
              />
            </div>
          )}

          <CardContent className="pb-6 md:pb-8">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border",
                  typeColors[res.resourceType],
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <Badge
                variant="outline"
                className={cn("capitalize", typeColors[res.resourceType])}
              >
                {res.resourceType}
              </Badge>
              <Badge
                variant="outline"
                className={cn("capitalize", statusColors[res.status])}
              >
                {res.status}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {res.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  by{" "}
                  <span className="text-foreground font-medium">
                    {res.credits ?? "Unknown"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(res.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Tech Stack - above description, distinct from tags (solid chips + icon) */}
            {res.techStack && res.techStack.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {res.techStack.map((tech) => (
                    <span
                      key={tech.id}
                      className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <ReadMoreDescription content={res.description ?? ""} />
            </div>

            {/* Tags */}
            {res.tags && res.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {res.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Playlist Section - Only for video resources */}
            {res.resourceType === "video" &&
              res.metadata?.playlistId &&
              (res.metadata?.playlistVideos?.length ?? 0) > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ListVideo className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-medium text-foreground">
                      Playlist ({res.metadata?.playlistVideos?.length ?? 0}{" "}
                      videos)
                    </h3>
                  </div>
                  <Card className="border-border/50 overflow-hidden">
                    <div className="divide-y divide-border">
                      {res.metadata?.playlistVideos?.map(
                        (item: ResourcePlaylistItem, index: number) => (
                          <a
                            key={index}
                            href={`https://www.youtube.com/watch?v=${item.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <Play className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-500 transition-colors">
                                {index + 1}. {item?.title}
                              </p>
                            </div>
                            {item?.duration && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatYouTubeDuration(item?.duration)}
                                </span>
                              </div>
                            )}
                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ),
                      )}
                    </div>
                  </Card>
                </div>
              )}

            <Separator className="my-6" />

            {/* Footer: Added By, Vote & Visit */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={res.creator?.image ?? undefined} />
                  <AvatarFallback>
                    {(() => {
                      const initial = (res.creator?.name ?? "Unknown")
                        .trim()
                        .charAt(0)
                        .toUpperCase();
                      return initial ? initial : <User className="w-5 h-5" />;
                    })()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Added by
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {res.creator?.name ?? "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVote("up")}
                    aria-label="Upvote resource"
                    aria-pressed={userVote === "up"}
                    className={cn(
                      "group/vote cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
                      userVote === "up"
                        ? "border-primary/40 bg-[#10141a] text-primary shadow-sm"
                        : "border-[#242a33] bg-[#10141a] text-[#f5f7fa] hover:border-[#323a46] hover:bg-[#131821]",
                    )}
                  >
                    <VoteArrowIcon
                      direction="up"
                      active={userVote === "up"}
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        userVote !== "up" && "group-hover/vote:scale-110",
                      )}
                    />
                    <VoteCounter
                      value={upvoteCount}
                      className="text-[#f5f7fa]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVote("down")}
                    aria-label="Downvote resource"
                    aria-pressed={userVote === "down"}
                    className={cn(
                      "group/vote cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
                      userVote === "down"
                        ? "border-[#2f2930] bg-[#10141a] text-[#f87171] shadow-[0_0_0_1px_rgba(248,113,113,0.12)]"
                        : "border-[#242a33] bg-[#10141a] text-[#f5f7fa] hover:border-[#323a46] hover:bg-[#131821]",
                    )}
                  >
                    <VoteArrowIcon
                      direction="down"
                      active={userVote === "down"}
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        userVote !== "down" && "group-hover/vote:scale-110",
                      )}
                    />
                    <VoteCounter
                      value={downvoteCount}
                      className="text-[#f5f7fa]"
                    />
                  </button>
                </div>

                {/* Visit Button */}
                <Button asChild className="w-full sm:w-auto">
                  <a href={res.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Resource
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ResourceDetail;
