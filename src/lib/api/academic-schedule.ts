import { apiRequest } from "./client";
import type { Locale } from "./types";

export interface AcademicTerm {
  id: string;
  academic_year: string;
  semester: number;
  starts_on: string;
  ends_on: string;
  registration_opens_at: string;
  registration_closes_at: string;
  add_drop_closes_at: string;
  min_credits: number;
  max_credits: number;
  is_published: boolean;
}

export type TermInput = Omit<AcademicTerm, "id">;

export interface CourseSection {
  id: string;
  term_id: string;
  course_id: string;
  code: string;
  capacity: number;
  lecturer_name: string | null;
  delivery_mode: "ON_CAMPUS" | "ONLINE" | "HYBRID";
  is_published: boolean;
}

export type SectionInput = Omit<CourseSection, "id">;

export interface SectionMeeting {
  id: string;
  section_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  venue_name: string | null;
}

export type MeetingInput = Omit<SectionMeeting, "id" | "section_id">;

const options = (token: string, locale: Locale) => ({ token, locale, cache: "no-store" as const });

export function listTerms(token: string, locale: Locale) {
  return apiRequest<AcademicTerm[]>("/academic/terms", options(token, locale));
}

export function createTerm(payload: TermInput, token: string, locale: Locale) {
  return apiRequest<AcademicTerm>("/academic/terms", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function updateTerm(id: string, payload: TermInput, token: string, locale: Locale) {
  return apiRequest<AcademicTerm>(`/academic/terms/${id}`, {
    ...options(token, locale), method: "PUT", body: payload,
  });
}

export function listSections(termId: string, token: string, locale: Locale) {
  return apiRequest<CourseSection[]>(`/academic/terms/${termId}/sections`, options(token, locale));
}

export function createSection(payload: SectionInput, token: string, locale: Locale) {
  return apiRequest<CourseSection>("/academic/sections", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function updateSection(
  id: string, payload: Partial<Pick<CourseSection, "capacity" | "lecturer_name" | "delivery_mode" | "is_published">>,
  token: string, locale: Locale,
) {
  return apiRequest<CourseSection>(`/academic/sections/${id}`, {
    ...options(token, locale), method: "PATCH", body: payload,
  });
}

export function listMeetings(sectionId: string, token: string, locale: Locale) {
  return apiRequest<SectionMeeting[]>(`/academic/sections/${sectionId}/meetings`, options(token, locale));
}

export function addMeeting(sectionId: string, payload: MeetingInput, token: string, locale: Locale) {
  return apiRequest<SectionMeeting>(`/academic/sections/${sectionId}/meetings`, {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function removeMeeting(
  sectionId: string, meetingId: string, token: string, locale: Locale,
) {
  return apiRequest<{ removed: boolean }>(`/academic/sections/${sectionId}/meetings/${meetingId}`, {
    ...options(token, locale), method: "DELETE",
  });
}
