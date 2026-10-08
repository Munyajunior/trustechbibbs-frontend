import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type SchoolKey = "engineering" | "business" | "health" | "education" | "communication" | "tourism" | "agriculture";

export interface EditorProgram {
  id: string;
  code: string;
  slug: string | null;
  name_en: string;
  name_fr: string | null;
  degree_level: string;
  duration_years: number;
  school_key: SchoolKey | null;
  description_en: string | null;
  description_fr: string | null;
  admission_requirements_en: string | null;
  admission_requirements_fr: string | null;
  career_prospects_en: string | null;
  career_prospects_fr: string | null;
  curriculum_outline_en: string | null;
  curriculum_outline_fr: string | null;
  published_at: string | null;
  is_active: boolean;
  is_featured: boolean;
}

export interface ProgramDraftInput {
  code: string;
  name_en: string;
  name_fr: string | null;
  degree_level: string;
  duration_years: number;
  school_key: SchoolKey;
  is_featured: boolean;
  description_en: string | null;
  description_fr: string | null;
  admission_requirements_en: string | null;
  admission_requirements_fr: string | null;
  career_prospects_en: string | null;
  career_prospects_fr: string | null;
  curriculum_outline_en: string | null;
  curriculum_outline_fr: string | null;
}

function options(token: string, locale: Locale) {
  return { token, locale, cache: "no-store" as const };
}

export function listEditorPrograms(token: string, locale: Locale, page = 1) {
  return apiList<EditorProgram>("/academic/programs", {
    ...options(token, locale), query: { page, per_page: 20 },
  }) as Promise<Paginated<EditorProgram>>;
}

export function createProgramDraft(payload: ProgramDraftInput, token: string, locale: Locale) {
  return apiRequest<EditorProgram>("/academic/programs", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function updateProgramDraft(id: string, payload: ProgramDraftInput, token: string, locale: Locale) {
  const { code: _immutableCode, ...changes } = payload;
  void _immutableCode;
  return apiRequest<EditorProgram>(`/academic/programs/${encodeURIComponent(id)}`, {
    ...options(token, locale), method: "PATCH", body: changes,
  });
}

export function publishProgram(id: string, token: string, locale: Locale) {
  return apiRequest<EditorProgram>(`/academic/programs/${encodeURIComponent(id)}/publish`, {
    ...options(token, locale), method: "POST",
  });
}

export function unpublishProgram(id: string, token: string, locale: Locale) {
  return apiRequest<EditorProgram>(`/academic/programs/${encodeURIComponent(id)}/unpublish`, {
    ...options(token, locale), method: "POST",
  });
}
