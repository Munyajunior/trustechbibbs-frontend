/**
 * Typed wrappers for the unauthenticated `/public/*` endpoints that power the
 * Phase-1 marketing site.
 *
 * ISR note: each read uses the `revalidate` window from the performance spec —
 * news/events refresh hourly, programs/about daily. See docs/PERFORMANCE_SEO.md.
 */

import { API_BASE_URL, ApiError, ApiUnreachableError, apiList, apiRequest } from "./client";
import type {
  ApiErrorBody,
  CampusEvent,
  GalleryAlbum,
  GalleryAlbumDetail,
  LeadershipProfile,
  ContactSubmission,
  Envelope,
  HomeBanner,
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

/** Active homepage banners; scheduling must take effect without a static build. */
export function getHomeBanners({ locale = "en" }: LocaleOption = {}): Promise<HomeBanner[]> {
  return apiRequest<HomeBanner[]>("/public/banners", { locale, cache: "no-store" });
}

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

/** Levels represented by published programmes, for catalogue filters. */
export function getProgramFilters(
  { locale = "en" }: LocaleOption = {},
): Promise<{ levels: string[] }> {
  return apiRequest<{ levels: string[] }>("/public/programs/filters", {
    locale,
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

/** Categories represented by currently published news articles. */
export function getNewsFilters({ locale = "en" }: LocaleOption = {}): Promise<{ categories: string[] }> {
  return apiRequest<{ categories: string[] }>("/public/news/filters", {
    locale,
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

/** Categories represented by published upcoming or in-progress events. */
export function getEventFilters({ locale = "en" }: LocaleOption = {}): Promise<{ categories: string[] }> {
  return apiRequest<{ categories: string[] }>("/public/events/filters", {
    locale,
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

/** Published gallery albums and their published media. */
export function getGalleryAlbums({ locale = "en" }: LocaleOption = {}): Promise<GalleryAlbum[]> {
  return apiRequest<GalleryAlbum[]>("/public/gallery", {
    locale,
    next: { revalidate: REVALIDATE.dynamic, tags: ["gallery"] },
  });
}

export function getLeadershipProfiles({ locale = "en" }: LocaleOption = {}): Promise<LeadershipProfile[]> {
  return apiRequest<LeadershipProfile[]>("/public/leadership", {
    locale,
    next: { revalidate: REVALIDATE.static, tags: ["leadership"] },
  });
}

export function getGalleryAlbum(
  slug: string,
  { locale = "en" }: LocaleOption = {},
): Promise<GalleryAlbumDetail> {
  return apiRequest<GalleryAlbumDetail>(`/public/gallery/${encodeURIComponent(slug)}`, {
    locale,
    next: { revalidate: REVALIDATE.dynamic, tags: ["gallery", `gallery:${slug}`] },
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

/** Submit an enquiry and one private attachment in a single request. */
export async function submitContactWithAttachment(
  payload: ContactSubmission, file: File, { locale = "en" }: LocaleOption = {},
): Promise<{ reference: string }> {
  const body = new FormData();
  body.append("payload", JSON.stringify(payload));
  body.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/public/contact/with-attachment`, {
      method: "POST", headers: { "Accept-Language": locale }, body, cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }
  const result = await response.json().catch(() => null) as Envelope<{ reference: string }> | null;
  if (!response.ok || !result || !result.success) {
    const fallback: ApiErrorBody = {
      code: "CONTACT_FAILED", message_en: "Your message could not be sent.",
      message_fr: "Votre message n'a pas pu être envoyé.", details: [], reference_id: "n/a",
    };
    throw new ApiError(response.status, result && !result.success ? result.error : fallback);
  }
  return result.data;
}
