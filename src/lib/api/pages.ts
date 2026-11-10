import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type PageBlock = {
  type: "heading" | "paragraph" | "image" | "callout";
  text_en?: string | null;
  text_fr?: string | null;
  image_url?: string | null;
  alt_en?: string | null;
  alt_fr?: string | null;
};

export type SitePage = {
  id: string;
  slug: string;
  title_en: string;
  title_fr: string | null;
  summary_en: string | null;
  summary_fr: string | null;
  cover_image_url: string | null;
  blocks: PageBlock[];
  published_at: string;
};

export type EditorSitePage = Omit<SitePage, "published_at"> & {
  published_at: string | null;
  archived_at: string | null;
  updated_at: string;
};

export type PageDraft = Pick<SitePage,
  "slug" | "title_en" | "title_fr" | "summary_en" | "summary_fr" | "cover_image_url" | "blocks"
>;

export function listPublicPages(locale: Locale): Promise<SitePage[]> {
  return apiRequest<SitePage[]>("/public/pages", {
    locale, next: { revalidate: 3600, tags: ["pages"] },
  });
}

export function getPublicPage(slug: string, locale: Locale): Promise<SitePage> {
  return apiRequest<SitePage>(`/public/pages/${encodeURIComponent(slug)}`, {
    locale, next: { revalidate: 3600, tags: ["pages", `page:${slug}`] },
  });
}

const options = (token: string, locale: Locale) => ({ token, locale, cache: "no-store" as const });

export function listEditorPages(token: string, locale: Locale, page = 1): Promise<Paginated<EditorSitePage>> {
  return apiList<EditorSitePage>("/cms/pages", {
    ...options(token, locale), query: { page, per_page: 20 },
  });
}

export function createPageDraft(payload: PageDraft, token: string, locale: Locale): Promise<EditorSitePage> {
  return apiRequest<EditorSitePage>("/cms/pages", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function updatePageDraft(id: string, payload: PageDraft, token: string, locale: Locale): Promise<EditorSitePage> {
  return apiRequest<EditorSitePage>(`/cms/pages/${encodeURIComponent(id)}`, {
    ...options(token, locale), method: "PATCH", body: payload,
  });
}

export function publishPage(id: string, token: string, locale: Locale): Promise<EditorSitePage> {
  return apiRequest<EditorSitePage>(`/cms/pages/${encodeURIComponent(id)}/publish`, {
    ...options(token, locale), method: "POST",
  });
}

export function archivePage(id: string, token: string, locale: Locale): Promise<EditorSitePage> {
  return apiRequest<EditorSitePage>(`/cms/pages/${encodeURIComponent(id)}/archive`, {
    ...options(token, locale), method: "POST",
  });
}
