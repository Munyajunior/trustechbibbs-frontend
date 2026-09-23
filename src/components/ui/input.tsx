import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error state. Pair with `aria-describedby` on the message. */
  invalid?: boolean;
}

/**
 * Input — 44px default height per the design system.
 * Focus styling is inherited from the global `:focus-visible` rule.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-md border bg-white px-3 text-sm text-gray-900",
        "placeholder:text-gray-400",
        "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
        invalid ? "border-error" : "border-gray-300",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/** Multi-line variant of {@link Input}. */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, rows = 5, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    aria-invalid={invalid || undefined}
    className={cn(
      "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900",
      "placeholder:text-gray-400",
      "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60",
      invalid ? "border-error" : "border-gray-300",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Accessible field label. `htmlFor` is required — never rely on placeholders. */
export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-gray-900", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-error" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
