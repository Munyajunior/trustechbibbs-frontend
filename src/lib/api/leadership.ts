import { apiRequest } from "./client";
import type { LeadershipProfile, Locale } from "./types";

export type LeadershipInput = Pick<LeadershipProfile,
  "name" | "title_en" | "title_fr" | "department_en" | "department_fr" |
  "biography_en" | "biography_fr" | "email" | "phone" | "photo_url" |
  "reports_to_id" | "sort_order">;

export const listStaffLeadership = (token: string, locale: Locale) =>
  apiRequest<LeadershipProfile[]>("/cms/leadership", { token, locale, cache: "no-store" });

export const saveLeadershipProfile = (
  payload: LeadershipInput, token: string, locale: Locale, id?: string,
) => apiRequest<LeadershipProfile>(id ? `/cms/leadership/${id}` : "/cms/leadership", {
  method: id ? "PUT" : "POST", body: payload, token, locale, cache: "no-store",
});

export const setLeadershipPublished = (id: string, publish: boolean, token: string, locale: Locale) =>
  apiRequest<LeadershipProfile>(`/cms/leadership/${id}/${publish ? "publish" : "unpublish"}`, {
    method: "POST", token, locale, cache: "no-store",
  });

export const deleteLeadershipProfile = (id: string, token: string, locale: Locale) =>
  apiRequest<{ id: string; deleted: boolean }>(`/cms/leadership/${id}`, {
    method: "DELETE", token, locale, cache: "no-store",
  });
