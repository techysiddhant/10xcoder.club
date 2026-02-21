"use client";

import { MarkdownRenderer } from "@/components/editor/markdown-renderer";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const COLLAPSED_HEIGHT_PX = 226; // ~8 lines at leading-7

export function ReadMoreDescription({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !content?.trim()) return;

    const checkHeight = () => {
      setShowToggle(el.scrollHeight > COLLAPSED_HEIGHT_PX);
    };

    // Wait one frame so markdown layout is fully measured
    const raf = requestAnimationFrame(checkHeight);
    const ro = new ResizeObserver(checkHeight);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [content]);

  if (!content?.trim()) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative overflow-hidden transition-[max-height] duration-300 ease-out",
          isExpanded ? "max-h-[3000px]" : "max-h-[226px]",
        )}
        style={
          showToggle && !isExpanded
            ? {
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%)",
              }
            : undefined
        }
      >
        <div ref={contentRef} className="max-w-none text-[15px] leading-7">
          <MarkdownRenderer content={content} />
        </div>
      </div>

      {showToggle && (
        <div className="mt-3 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((e) => !e)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/25 px-3 py-1.5 text-sm font-medium text-primary/90",
              "bg-primary/5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "transition-colors duration-150",
            )}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </>
            ) : (
              <>
                Show more
                <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
