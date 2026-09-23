/**
 * Typed wrappers for the unauthenticated `/public/*` endpoints that power the
 * Phase-1 marketing site.
 *
 * ISR note: each read uses the `revalidate` window from the performance spec —
 * news/events refresh hourly, programs/about daily. See docs/PERFORMANCE_SEO.md.
 */

import { apiList, apiRequest } from "./client";
import type {
  CampusEvent,
  ContactSubmission,
  ListQuery,
  Locale,
  NewsArticle,
  Paginated,
  Program,
} from "./types";

/** Revalidation windows (seconds) per the performance budget. */
export const REVALIDATE = {
  /** Programs and About-style evergreen content: 24h. */
  static: 86_400,
  /** Homepage, news and events: 1h. */
  dynamic: 3_600,
} as const;

interface LocaleOption {
  locale?: Locale;
}

/** List academic programs. */
export function getPrograms(
  query: ListQuery = {},
  { locale = "en" }: LocaleOption = {},
): Promise<Paginated<Program>> {
  return apiList<Program>("/public/programs", {
    locale,
    query: { per_page: 12, ...query },
    next: { revalidate: REVALIDATE.static, tags: ["programs"] },
  });
}

/** Fetch a single program by slug. */
export function getProgram(
  slug: string,
  { locale = "en" }: LocaleOption = {},
): Promise<Program> {
  return apiRequest<Program>(`/public/programs/${encodeURIComponent(slug)}`, {
    locale,
    next: { revalidate: REVALIDATE.static, tags: ["programs", `program:${slug}`] },
  });
}

/** List published news articles (newest first). */
export function getNews(
  query: ListQuery = {},
  { locale = "en" }: LocaleOption = {},
): Promise<Paginated<NewsArticle>> {
  return apiList<NewsArticle>("/public/news", {
    locale,
    query: { per_page: 9, sort: "-published_at", ...query },
    next: { revalidate: REVALIDATE.dynamic, tags: ["news"] },
  });
}

/** Fetch a single news article by slug. */
export function getNewsArticle(
  slug: string,
  { locale = "en" }: LocaleOption = {},
): Promise<NewsArticle> {
  return apiRequest<NewsArticle>(`/public/news/${encodeURIComponent(slug)}`, {
    locale,
    next: { revalidate: REVALIDATE.dynamic, tags: ["news", `news:${slug}`] },
  });
}

/** List upcoming events. */
export function getEvents(
  query: ListQuery = {},
  { locale = "en" }: LocaleOption = {},
): Promise<Paginated<CampusEvent>> {
  return apiList<CampusEvent>("/public/events", {
    locale,
    query: { per_page: 10, sort: "starts_at", ...query },
    next: { revalidate: REVALIDATE.dynamic, tags: ["events"] },
  });
}

/** Fetch one public event by slug. */
export function getEvent(
  slug: string,
  { locale = "en" }: LocaleOption = {},
): Promise<CampusEvent> {
  return apiRequest<CampusEvent>(`/public/events/${encodeURIComponent(slug)}`, {
    locale,
    next: { revalidate: REVALIDATE.dynamic, tags: ["events", `event:${slug}`] },
  });
}

/** Global site search. */
export function search(
  term: string,
  { locale = "en" }: LocaleOption = {},
): Promise<Paginated<Program | NewsArticle | CampusEvent>> {
  return apiList<Program | NewsArticle | CampusEvent>("/public/search", {
    locale,
    query: { search: term },
    cache: "no-store",
  });
}

/** Submit the contact form. */
export function submitContact(
  payload: ContactSubmission,
  { locale = "en" }: LocaleOption = {},
): Promise<{ reference: string }> {
  return apiRequest<{ reference: string }>("/public/contact", {
    method: "POST",
    locale,
    body: payload,
    cache: "no-store",
  });
}
