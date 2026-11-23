import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/api/types";

/** Server message in the user's locale (the API is bilingual), else the supplied fallback. */
export function hrErrorMessage(caught: unknown, locale: Locale, fallback: string): string {
  return caught instanceof ApiError ? caught.localizedMessage(locale) : fallback;
}

/** Parse a whole, positive XAF amount; returns null for anything else. */
export function parseAmount(value: string): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  return amount > 0 && Number.isSafeInteger(amount) ? amount : null;
}

export const PAYROLL_ROLES = ["accountant", "finance_director", "admin", "super_admin"];
export const LECTURER_READER_ROLES = [...PAYROLL_ROLES, "department_head"];
