import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Button — Trustech Design Language.
 *
 * Sizes map to the spec's fixed heights (sm 36 / md 44 / lg 52 / xl 60). The
 * 44px default is also the minimum comfortable tap target on mobile.
 *
 * Note `accent` uses gray-900 text: white on gold is only 2.8:1 and fails AA.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        secondary: "bg-primary-subtle text-primary hover:bg-primary-light/40",
        accent: "bg-accent text-gray-900 hover:bg-accent-hover",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary-subtle",
        ghost: "bg-transparent text-primary hover:bg-primary-subtle",
        destructive: "bg-error text-white hover:bg-error/90",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-13 px-6 text-base",
        xl: "h-15 px-8 text-base",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
