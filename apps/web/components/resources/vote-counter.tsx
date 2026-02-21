"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const formatVoteCount = (count: number): string => {
  const abs = Math.abs(count);
  if (abs < 1000) return `${count}`;

  const sign = count < 0 ? "-" : "";
  const valueInK = abs / 1000;
  const rounded =
    valueInK < 10 ? Math.round(valueInK * 10) / 10 : Math.round(valueInK);
  const normalized = Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(1).replace(/\.0$/, "");

  return `${sign}${normalized}k`;
};

export const VoteCounter = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const [state, setState] = useState({
    current: value,
    previous: value,
    direction: "up" as "up" | "down",
    animKey: 0,
  });
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;

    const dir = value > prevRef.current ? "up" : "down";
    setState((prev) => ({
      current: value,
      previous: prevRef.current,
      direction: dir,
      animKey: prev.animKey + 1,
    }));

    prevRef.current = value;
  }, [value]);

  const { current, previous, direction, animKey } = state;
  const hasAnimated = animKey > 0;
  const currentLabel = formatVoteCount(current);
  const previousLabel = formatVoteCount(previous);
  const sizerLabel =
    previousLabel.length > currentLabel.length ? previousLabel : currentLabel;

  return (
    <div className="relative h-5 w-auto min-w-[1ch] overflow-hidden">
      {/* Keeps intrinsic width based on widest active label while layers animate absolutely */}
      <span
        aria-hidden="true"
        className={cn(
          "invisible block px-px text-xs font-semibold tabular-nums",
          className,
        )}
      >
        {sizerLabel}
      </span>
      {hasAnimated && (
        <span
          key={`out-${animKey}`}
          className={cn(
            "absolute inset-0 flex items-center justify-center  font-semibold tabular-nums",
            direction === "up" ? "animate-slideOutUp" : "animate-slideOutDown",
            className,
          )}
        >
          {previousLabel}
        </span>
      )}
      <span
        key={`in-${animKey}`}
        className={cn(
          "absolute inset-0 flex items-center justify-center  font-semibold tabular-nums",
          hasAnimated &&
            (direction === "up" ? "animate-slideInUp" : "animate-slideInDown"),
          className,
        )}
      >
        {currentLabel}
      </span>
    </div>
  );
};
