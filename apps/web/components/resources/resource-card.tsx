import { useMemo } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  BookOpen,
  Video,
  GitFork,
  Wrench,
  GraduationCap,
  Podcast,
  ExternalLink,
  User,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useRouter } from "next/navigation";
import type { ResourceListItem } from "@/lib/types";
import { SmartImage } from "@/components/shared/smart-image";
import Link from "next/link";
import { VoteCounter } from "./vote-counter";
import { VoteArrowIcon } from "./vote-arrow-icon";

interface ResourceCardProps {
  resource: ResourceListItem;
  onVote: (id: string, vote: "up" | "down" | null) => void;
}

const typeIcons: Record<string, typeof BookOpen> = {
  article: BookOpen,
  video: Video,
  template: GitFork,
  tool: Wrench,
  course: GraduationCap,
  podcast: Podcast,
};

const typeColors: Record<string, string> = {
  article: "bg-green-500/10 text-green-500",
  video: "bg-blue-500/10 text-blue-500",
  template: "bg-purple-500/10 text-purple-500",
  tool: "bg-orange-500/10 text-orange-500",
  course: "bg-pink-500/10 text-pink-500",
  podcast: "bg-cyan-500/10 text-cyan-500",
};

const ResourceCard = ({ resource, onVote }: ResourceCardProps) => {
  const router = useRouter();
  const userVote: "up" | "down" | null = useMemo(() => {
    if (resource.userVote === "upvote") return "up";
    if (resource.userVote === "downvote") return "down";
    return null;
  }, [resource.userVote]);
  const upvoteCount = resource.upvoteCount;
  const downvoteCount = resource.downvoteCount;

  const Icon = typeIcons[resource.resourceType] || BookOpen;
  const colorClass = typeColors[resource.resourceType] || typeColors.article;

  const handleVote = (e: React.MouseEvent, voteType: "up" | "down") => {
    e.preventDefault();
    e.stopPropagation();

    let newVote: "up" | "down" | null;

    if (userVote === voteType) {
      // Clicking the same vote again removes it
      newVote = null;
    } else if (userVote === null) {
      // No previous vote, add new vote
      newVote = voteType;
    } else {
      // Switching vote
      newVote = voteType;
    }

    onVote(resource.id, newVote);
  };

  const handleCardClick = () => {
    router.push(`/resources/${resource.id}`);
  };

  return (
    <Card
      className="group p-0 bg-card border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300 break-inside-avoid mb-4 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image */}
      {resource.image && (
        <div className="relative overflow-hidden">
          <SmartImage
            src={resource.image}
            alt={resource.title}
            width={640}
            height={360}
            aspectRatio="16/9"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            kind="card"
            className="w-full"
            imgClassName="group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <CardContent className={cn("pb-2 px-2", !resource.image && "pt-0")}>
        {/* Type Badge & External Link */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                colorClass,
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {resource.resourceType}
            </Badge>
          </div>
          <Link
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${resource.title || "resource"} in new tab`}
          >
            <ExternalLink className="w-4 h-4" aria-hidden />
          </Link>
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>

        {/* Credits (Author) */}
        {resource.credits && (
          <p className="text-xs text-muted-foreground mb-3">
            by{" "}
            <span className="text-foreground font-medium">
              {resource.credits}
            </span>
          </p>
        )}

        {/* Tech Stack */}
        {resource.techStack && resource.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {resource.techStack.map((tech) => (
              <Badge key={tech.id} variant="secondary" className="text-xs">
                {tech.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {resource.tags.slice(0, 4).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                {tag.name}
              </Badge>
            ))}
            {resource.tags.length > 4 && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                +{resource.tags.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Footer: Creator & Vote Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={resource.creator.image ?? undefined} />
              <AvatarFallback className="text-xs">
                <User className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {resource.creator.name ||
                resource.creator.username ||
                "Anonymous"}
            </span>
          </div>

          {/* Vote buttons - Clean pill style with arrow icons */}
          <div className="flex items-center gap-2">
            {/* Upvote */}
            <button
              type="button"
              onClick={(e) => handleVote(e, "up")}
              aria-label="Upvote resource"
              aria-pressed={userVote === "up"}
              className={cn(
                "group/vote cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition-all duration-200",
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
              <span aria-hidden="true">
                <VoteCounter value={upvoteCount} className="text-[#f5f7fa]" />
              </span>
              <span className="sr-only" aria-live="polite">
                {upvoteCount} upvotes
              </span>
            </button>

            {/* Downvote */}
            <button
              type="button"
              onClick={(e) => handleVote(e, "down")}
              aria-label="Downvote resource"
              aria-pressed={userVote === "down"}
              className={cn(
                "group/vote cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition-all duration-200",
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
              <span aria-hidden="true">
                <VoteCounter value={downvoteCount} className="text-[#f5f7fa]" />
              </span>
              <span className="sr-only" aria-live="polite">
                {downvoteCount} downvotes
              </span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceCard;
