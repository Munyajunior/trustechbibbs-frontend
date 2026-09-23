import type { ListQuery } from "@/lib/api/types";

/**
 * Centralised React Query keys.
 *
 * Always build keys from here — never inline an array literal in a component.
 * It keeps invalidation reliable (`queryClient.invalidateQueries({ queryKey:
 * queryKeys.programs.all })` nukes every program query, filters included).
 */
export const queryKeys = {
  programs: {
    all: ["programs"] as const,
    list: (query: ListQuery = {}) => ["programs", "list", query] as const,
    detail: (slug: string) => ["programs", "detail", slug] as const,
  },
  news: {
    all: ["news"] as const,
    list: (query: ListQuery = {}) => ["news", "list", query] as const,
    detail: (slug: string) => ["news", "detail", slug] as const,
  },
  events: {
    all: ["events"] as const,
    list: (query: ListQuery = {}) => ["events", "list", query] as const,
  },
  search: (term: string) => ["search", term] as const,
} as const;

/**
 * Stale times from the performance spec (ms). Server state stays fresh for
 * these windows before React Query refetches in the background.
 */
export const STALE_TIME = {
  programs: 30 * 60 * 1000, // 30 min
  news: 5 * 60 * 1000, // 5 min
  events: 5 * 60 * 1000, // 5 min
  profile: 5 * 60 * 1000, // 5 min
  results: 15 * 60 * 1000, // 15 min
  notifications: 60 * 1000, // 1 min
} as const;
