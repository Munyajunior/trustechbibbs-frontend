import { API_BASE_URL, ApiError } from "./client";
import type { Locale } from "./types";

export type MediaSlot = { slot: string; custom: boolean; updated_at: string | null };

async function mediaRequest<T>(path: string, token: string, locale: Locale, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/cms/media${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Accept-Language": locale, ...init.headers },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new ApiError(response.status, payload.error);
  }
  return payload.data as T;
}

export const listMediaSlots = (token: string, locale: Locale) =>
  mediaRequest<MediaSlot[]>("/slots", token, locale);

export async function replaceMediaSlot(slot: string, file: File, token: string, locale: Locale) {
  const body = new FormData();
  body.set("file", file);
  return mediaRequest<{ slot: string; custom: boolean }>(`/slots/${slot}`, token, locale, { method: "PUT", body });
}

export const restoreMediaSlot = (slot: string, token: string, locale: Locale) =>
  mediaRequest<{ slot: string; custom: boolean }>(`/slots/${slot}`, token, locale, { method: "DELETE" });

export async function uploadCmsCover(file: File, token: string, locale: Locale): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const result = await mediaRequest<{ url: string }>("/uploads", token, locale, { method: "POST", body });
  return result.url;
}

export async function uploadCmsVideo(file: File, token: string, locale: Locale): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const result = await mediaRequest<{ url: string }>("/video-uploads", token, locale, { method: "POST", body });
  return result.url;
}

export async function uploadCmsPanorama(file: File, token: string, locale: Locale): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const result = await mediaRequest<{ url: string }>("/panorama-uploads", token, locale, { method: "POST", body });
  return result.url;
}
