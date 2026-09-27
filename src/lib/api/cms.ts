import { apiList, apiRequest } from "./client";
import type { CampusEvent, Locale, NewsArticle, Paginated } from "./types";

export interface EditorNewsArticle extends Omit<NewsArticle, "published_at"> {
  published_at: string | null;
  archived_at: string | null;
}

export interface EditorCampusEvent extends CampusEvent {
  published_at: string | null;
  archived_at: string | null;
}

export type NewsDraftInput = {
  title_en: string;
  title_fr?: string | null;
  excerpt_en?: string | null;
  excerpt_fr?: string | null;
  content_en?: string | null;
  content_fr?: string | null;
  category?: string | null;
  tags?: string[];
  cover_image_url?: string | null;
};

export type EventDraftInput = {
  title_en: string;
  title_fr?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  starts_at: string;
  ends_at?: string | null;
  venue?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
};

function editorOptions(token: string, locale: Locale) {
  return { token, locale, cache: "no-store" as const };
}

export function listEditorNews(token: string, locale: Locale, page = 1): Promise<Paginated<EditorNewsArticle>> {
  return apiList<EditorNewsArticle>("/cms/news", {
    ...editorOptions(token, locale), query: { page, per_page: 20 },
  });
}

export function createNewsDraft(
  payload: NewsDraftInput, token: string, locale: Locale,
): Promise<EditorNewsArticle> {
  return apiRequest<EditorNewsArticle>("/cms/news", {
    ...editorOptions(token, locale), method: "POST", body: payload,
  });
}

export function updateNewsDraft(
  id: string, payload: NewsDraftInput, token: string, locale: Locale,
): Promise<EditorNewsArticle> {
  return apiRequest<EditorNewsArticle>(`/cms/news/${encodeURIComponent(id)}`, {
    ...editorOptions(token, locale), method: "PATCH", body: payload,
  });
}

export function publishNews(
  id: string, token: string, locale: Locale, publishAt?: string,
): Promise<EditorNewsArticle> {
  return apiRequest<EditorNewsArticle>(`/cms/news/${encodeURIComponent(id)}/publish`, {
    ...editorOptions(token, locale), method: "POST", body: publishAt ? { publish_at: publishAt } : {},
  });
}

export function archiveNews(id: string, token: string, locale: Locale): Promise<EditorNewsArticle> {
  return apiRequest<EditorNewsArticle>(`/cms/news/${encodeURIComponent(id)}/archive`, {
    ...editorOptions(token, locale), method: "POST",
  });
}

export function listEditorEvents(token: string, locale: Locale, page = 1): Promise<Paginated<EditorCampusEvent>> {
  return apiList<EditorCampusEvent>("/cms/events", {
    ...editorOptions(token, locale), query: { page, per_page: 20 },
  });
}

export function createEventDraft(
  payload: EventDraftInput, token: string, locale: Locale,
): Promise<EditorCampusEvent> {
  return apiRequest<EditorCampusEvent>("/cms/events", {
    ...editorOptions(token, locale), method: "POST", body: payload,
  });
}

export function updateEventDraft(
  id: string, payload: EventDraftInput, token: string, locale: Locale,
): Promise<EditorCampusEvent> {
  return apiRequest<EditorCampusEvent>(`/cms/events/${encodeURIComponent(id)}`, {
    ...editorOptions(token, locale), method: "PATCH", body: payload,
  });
}

export function publishEvent(
  id: string, token: string, locale: Locale, publishAt?: string,
): Promise<EditorCampusEvent> {
  return apiRequest<EditorCampusEvent>(`/cms/events/${encodeURIComponent(id)}/publish`, {
    ...editorOptions(token, locale), method: "POST", body: publishAt ? { publish_at: publishAt } : {},
  });
}

export function archiveEvent(id: string, token: string, locale: Locale): Promise<EditorCampusEvent> {
  return apiRequest<EditorCampusEvent>(`/cms/events/${encodeURIComponent(id)}/archive`, {
    ...editorOptions(token, locale), method: "POST",
  });
}
