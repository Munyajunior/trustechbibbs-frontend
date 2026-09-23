import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts so the last utility wins.
 * Standard Shadcn helper — use it in every component that accepts `className`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a money amount coming from the API (DECIMAL serialized as string). */
export function formatCurrency(
  amount: string | number,
  currency = "XAF",
  locale = "en",
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format an ISO date string for display. */
export function formatDate(iso: string, locale = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(date);
}
