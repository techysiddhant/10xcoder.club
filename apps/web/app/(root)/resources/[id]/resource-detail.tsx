"use client";
import { getResourceById } from "@/lib/http";
import type { ResourceDetailItem, ResourcePlaylistItem } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  ArrowBigDown,
  ArrowBigUp,
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
import { MarkdownRenderer } from "@/components/editor/markdown-renderer";
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
              The resource you're looking for doesn't exist.
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
  const Icon = typeIcons[res.resourceType];
  const userVote: "up" | "down" | null =
    res.userVote === "upvote"
      ? "up"
      : res.userVote === "downvote"
        ? "down"
        : null;
  const upvoteCount = res.upvoteCount ?? 0;
  const downvoteCount = res.downvoteCount ?? 0;
  const handleVote = (voteType: "up" | "down") => {
    // TODO: Implement vote logic
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
            <div className="relative w-full  aspect-video overflow-hidden bg-muted">
              <img
                src={res.image}
                alt={res.title}
                className="w-full  aspect-video object-cover"
              />
            </div>
          )}

          <CardContent className="p-6 md:p-8">
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

            {/* Description */}
            <div
              className="max-w-none mb-6 text-[15px] leading-7"
              // dangerouslySetInnerHTML={{ __html: res.description ?? '' }}
            >
              <MarkdownRenderer content={res.description ?? ""} />
            </div>

            {/* Tech Stack */}
            {res.techStack && res.techStack.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {res.techStack.map((tech) => (
                    <Badge key={tech.id} variant="secondary">
                      {tech.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
              res.playlist &&
              res.playlist.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ListVideo className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-medium text-foreground">
                      Playlist ({res.playlist.length} videos)
                    </h3>
                  </div>
                  <Card className="border-border/50 overflow-hidden">
                    <div className="divide-y divide-border">
                      {res.playlist.map(
                        (item: ResourcePlaylistItem, index: number) => (
                          <a
                            key={index}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <Play className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-blue-500 transition-colors">
                                {index + 1}. {item.title}
                              </p>
                            </div>
                            {item.duration && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{item.duration}</span>
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
                    onClick={() => handleVote("up")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95",
                      userVote === "up"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-muted/50 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600",
                    )}
                  >
                    <ArrowBigUp
                      className={cn(
                        "w-5 h-5",
                        userVote === "up" && "fill-white",
                      )}
                    />
                    <span className="font-medium text-sm">{upvoteCount}</span>
                  </button>

                  <button
                    onClick={() => handleVote("down")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95",
                      userVote === "down"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-muted/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600",
                    )}
                  >
                    <ArrowBigDown
                      className={cn(
                        "w-5 h-5",
                        userVote === "down" && "fill-white",
                      )}
                    />
                    <span className="font-medium text-sm">{downvoteCount}</span>
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
