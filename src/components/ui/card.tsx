import * as React from "react";

import { cn } from "@/lib/utils";

/** Surface container. Use `interactive` for cards that are links/buttons. */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white",
        // `relative` anchors the full-card link overlay (`after:absolute after:inset-0`).
        interactive &&
          "relative transition-shadow duration-150 hover:border-primary-light hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg font-semibold text-gray-900", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 p-5 pt-0", className)} {...props} />
  );
}

/** Small status/category pill. */
export function Badge({
  className,
  tone = "primary",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "primary" | "accent" | "neutral";
}) {
  const tones = {
    primary: "bg-primary-subtle text-primary",
    accent: "bg-accent-subtle text-accent-hover",
    neutral: "bg-gray-100 text-gray-700",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
