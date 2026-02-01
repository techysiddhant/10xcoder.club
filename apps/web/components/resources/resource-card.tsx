import { useState, useRef, useEffect } from "react";
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
  ArrowBigUp,
  ArrowBigDown,
  User,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useRouter } from "next/navigation";
import type { ResourceListItem } from "@/lib/types";
import Link from "next/link";

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

// Animated counter component with smooth spring-like animation
const AnimatedCounter = ({
  value,
  color,
}: {
  value: number;
  color: string;
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevDisplayValue, setPrevDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setPrevDisplayValue(prevValue.current);
      setDirection(value > prevValue.current ? "up" : "down");
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 200);

      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="relative h-4 overflow-hidden w-8 flex items-center justify-center">
      <span
        className={cn(
          "absolute transition-all duration-200 ease-out font-medium text-xs tabular-nums",
          isAnimating && direction === "up" && "-translate-y-full opacity-0",
          isAnimating && direction === "down" && "translate-y-full opacity-0",
          !isAnimating && "translate-y-0 opacity-100",
          color,
        )}
      >
        {isAnimating ? prevDisplayValue : displayValue}
      </span>
      {isAnimating && (
        <span
          className={cn(
            "absolute font-medium text-xs tabular-nums transition-all duration-200 ease-out",
            direction === "up"
              ? "translate-y-full opacity-0 animate-[slideInUp_0.2s_ease-out_forwards]"
              : "-translate-y-full opacity-0 animate-[slideInDown_0.2s_ease-out_forwards]",
            color,
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
};

const ResourceCard = ({ resource, onVote }: ResourceCardProps) => {
  const router = useRouter();
  // Map API vote format to component format
  const initialVote =
    resource.userVote === "upvote"
      ? "up"
      : resource.userVote === "downvote"
        ? "down"
        : null;
  const [userVote, setUserVote] = useState<"up" | "down" | null>(initialVote);
  const [upvoteCount, setUpvoteCount] = useState(resource.upvoteCount);
  const [downvoteCount, setDownvoteCount] = useState(resource.downvoteCount);

  // Resync state when resource changes (e.g. after vote or refetch) so we don't rely on remount
  useEffect(() => {
    setUserVote(
      resource.userVote === "upvote"
        ? "up"
        : resource.userVote === "downvote"
          ? "down"
          : null,
    );
    setUpvoteCount(resource.upvoteCount);
    setDownvoteCount(resource.downvoteCount);
  }, [
    resource.id,
    resource.userVote,
    resource.upvoteCount,
    resource.downvoteCount,
  ]);

  const Icon = typeIcons[resource.resourceType] || BookOpen;
  const colorClass = typeColors[resource.resourceType] || typeColors.article;

  const handleVote = (e: React.MouseEvent, voteType: "up" | "down") => {
    e.preventDefault();
    e.stopPropagation();

    let newVote: "up" | "down" | null;

    if (userVote === voteType) {
      // Clicking the same vote again removes it
      newVote = null;
      if (voteType === "up") {
        setUpvoteCount((prev) => prev - 1);
      } else {
        setDownvoteCount((prev) => prev - 1);
      }
    } else if (userVote === null) {
      // No previous vote, add new vote
      newVote = voteType;
      if (voteType === "up") {
        setUpvoteCount((prev) => prev + 1);
      } else {
        setDownvoteCount((prev) => prev + 1);
      }
    } else {
      // Switching vote
      newVote = voteType;
      if (voteType === "up") {
        setUpvoteCount((prev) => prev + 1);
        setDownvoteCount((prev) => prev - 1);
      } else {
        setUpvoteCount((prev) => prev - 1);
        setDownvoteCount((prev) => prev + 1);
      }
    }

    setUserVote(newVote);
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
          <img
            src={resource.image}
            alt={resource.title}
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <CardContent className={cn("p-4", !resource.image && "pt-4")}>
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
                "group/vote flex items-center gap-1 rounded-full px-2.5 py-1 transition-all duration-200",
                "active:scale-95",
                userVote === "up"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-muted/50 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600",
              )}
            >
              <ArrowBigUp
                className={cn(
                  "w-4 h-4 transition-all duration-200",
                  userVote === "up"
                    ? "fill-white"
                    : "group-hover/vote:fill-emerald-500/20",
                )}
                aria-hidden
              />
              <span aria-hidden="true">
                <AnimatedCounter
                  value={upvoteCount}
                  color={userVote === "up" ? "text-white" : "text-inherit"}
                />
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
                "group/vote flex items-center gap-1 rounded-full px-2.5 py-1 transition-all duration-200",
                "active:scale-95",
                userVote === "down"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-muted/50 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600",
              )}
            >
              <ArrowBigDown
                className={cn(
                  "w-4 h-4 transition-all duration-200",
                  userVote === "down"
                    ? "fill-white"
                    : "group-hover/vote:fill-rose-500/20",
                )}
                aria-hidden
              />
              <span aria-hidden="true">
                <AnimatedCounter
                  value={downvoteCount}
                  color={userVote === "down" ? "text-white" : "text-inherit"}
                />
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
