import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Page width constraint: `max-w-7xl` content column with responsive gutters.
 * Every page section should sit inside one.
 */
export function Container({
  className,
  as: Component = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Component
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
