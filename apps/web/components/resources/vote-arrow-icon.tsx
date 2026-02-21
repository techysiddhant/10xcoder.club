"use client";

import { cn } from "@/lib/utils";

export const VoteArrowIcon = ({
  direction,
  active = false,
  className,
}: {
  direction: "up" | "down";
  active?: boolean;
  className?: string;
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-5 w-5 transition-all duration-200",
        direction === "down" && "rotate-180",
        className,
      )}
      aria-hidden="true"
    >
      <path
        d="M12.0017 21.9982H10.0475C9.03149 21.9982 7.32508 22.1082 7.32508 20.6026V13.5667C7.32508 13.0684 7.01695 12.7268 6.43689 12.7268H2.59948C1.43841 12.7268 2.24946 11.8116 2.66039 11.4193C3.07133 11.027 6.69819 7.22967 6.69819 7.22967C6.69819 7.22967 10.941 2.78849 11.4091 2.34169C11.8772 1.8949 12.1044 1.87739 12.5909 2.34169C13.0774 2.806 17.3018 7.22967 17.3018 7.22967C17.3018 7.22967 20.9287 11.027 21.3396 11.4193C21.7505 11.8116 22.5616 12.7268 21.4005 12.7268H17.5631C16.983 12.7268 16.6749 13.0684 16.6749 13.5667V20.6026C16.6749 22.1082 14.9685 21.9982 13.9525 21.9982H12.0017Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
