import { apiRequest } from "./client";
import type { HomeBanner, Locale } from "./types";

export type BannerInput = Omit<HomeBanner, "id" | "published_at">;

function options(token: string, locale: Locale) {
  return { token, locale, cache: "no-store" as const };
}

export function listStaffBanners(token: string, locale: Locale) {
  return apiRequest<HomeBanner[]>("/cms/banners", options(token, locale));
}

export function createBanner(payload: BannerInput, token: string, locale: Locale) {
  return apiRequest<HomeBanner>("/cms/banners", { ...options(token, locale), method: "POST", body: payload });
}

export function updateBanner(id: string, payload: BannerInput, token: string, locale: Locale) {
  return apiRequest<HomeBanner>(`/cms/banners/${encodeURIComponent(id)}`, { ...options(token, locale), method: "PUT", body: payload });
}

export function setBannerPublication(id: string, publish: boolean, token: string, locale: Locale) {
  return apiRequest<HomeBanner>(`/cms/banners/${encodeURIComponent(id)}/${publish ? "publish" : "unpublish"}`, { ...options(token, locale), method: "POST" });
}
