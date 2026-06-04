"use client";

import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useState, useEffect } from "react";
import { Image } from "@unpic/react";
import { ImageOff } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  buildImageKitLqipUrl,
  CARD_IMAGE_BREAKPOINTS,
  DETAIL_IMAGE_BREAKPOINTS,
  getImageKitQuality,
  getImagePolicy,
  type SmartImageKind,
} from "@/lib/images";

type NativeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  | "alt"
  | "className"
  | "decoding"
  | "fetchPriority"
  | "height"
  | "loading"
  | "sizes"
  | "src"
  | "srcSet"
  | "width"
>;

export interface SmartImageProps extends NativeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number | `${number}/${number}` | `${number}:${number}`;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  kind?: SmartImageKind;
}

function normalizeAspectRatio(
  aspectRatio: SmartImageProps["aspectRatio"],
  width?: number,
  height?: number,
) {
  if (typeof aspectRatio === "number") {
    return `${aspectRatio}`;
  }

  if (typeof aspectRatio === "string") {
    return aspectRatio
      .split(/[:/]/)
      .map((part) => part.trim())
      .join(" / ");
  }

  if (width && height) {
    return `${width} / ${height}`;
  }

  return "16 / 9";
}

function getNumericAspectRatio(
  aspectRatio: SmartImageProps["aspectRatio"],
  width?: number,
  height?: number,
) {
  if (typeof aspectRatio === "number") {
    return aspectRatio;
  }

  if (typeof aspectRatio === "string") {
    const parts = aspectRatio
      .split(/[:/]/)
      .map((part) => Number(part.trim()))
      .filter((part) => Number.isFinite(part) && part > 0);

    if (parts.length === 2) {
      return parts[0] / parts[1];
    }
  }

  if (width && height) {
    return width / height;
  }

  return 16 / 9;
}

export function SmartImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  sizes,
  priority = false,
  className,
  imgClassName,
  kind = "default",
  ...imgProps
}: SmartImageProps) {
  const {
    onLoad: consumerOnLoad,
    onError: consumerOnError,
    ...restImgProps
  } = imgProps;
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasLoaded(false);
    setHasError(false);
  }, [src]);

  const policy = getImagePolicy(src);
  const placeholderSrc =
    policy === "imagekit" ? buildImageKitLqipUrl(src) : undefined;
  const breakpoints =
    kind === "detail" ? DETAIL_IMAGE_BREAKPOINTS : CARD_IMAGE_BREAKPOINTS;
  const cssAspectRatio = normalizeAspectRatio(aspectRatio, width, height);
  const numericAspectRatio = getNumericAspectRatio(aspectRatio, width, height);
  const resolvedWidth =
    width ??
    (height
      ? Math.round(height * numericAspectRatio)
      : kind === "detail"
        ? 1280
        : 640);
  const resolvedHeight =
    height ?? Math.max(1, Math.round(resolvedWidth / numericAspectRatio));

  const wrapperStyle: CSSProperties = {
    aspectRatio: cssAspectRatio,
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        !hasLoaded && !hasError && !placeholderSrc && "animate-pulse",
        className,
      )}
      style={wrapperStyle}
    >
      {!hasLoaded && !hasError && !placeholderSrc ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-br from-muted via-muted/80 to-muted/60"
        />
      ) : null}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Image failed to load</span>
        </div>
      ) : null}

      <Image
        {...restImgProps}
        src={src}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes={sizes}
        layout="constrained"
        background={placeholderSrc}
        breakpoints={policy === "imagekit" ? breakpoints : undefined}
        operations={
          policy === "imagekit"
            ? {
                imagekit: {
                  quality: getImageKitQuality(kind),
                },
              }
            : undefined
        }
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding={priority ? "sync" : "async"}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          policy === "external" && !hasLoaded && !hasError && "opacity-0",
          (policy === "imagekit" || hasLoaded) && !hasError && "opacity-100",
          imgClassName,
        )}
        onLoad={(event) => {
          setHasLoaded(true);
          consumerOnLoad?.(event);
        }}
        onError={(event) => {
          setHasError(true);
          consumerOnError?.(event);
        }}
      />
    </div>
  );
}
