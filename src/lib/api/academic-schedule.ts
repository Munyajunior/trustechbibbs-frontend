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

export type SessionType = "CM" | "TD" | "TP";

export interface SectionMeeting {
  id: string;
  section_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  venue_name: string | null;
  session_type: SessionType;
  classroom_id: string | null;
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

export interface Campus {
  id: string;
  code: string;
  name_en: string;
  name_fr: string;
  city: string | null;
  is_active: boolean;
}

export interface Classroom {
  id: string;
  campus_id: string;
  code: string;
  name: string;
  capacity: number | null;
  is_active: boolean;
}

export type ClassroomInput = Omit<Classroom, "id">;

export type NonTeachingKind = "HOLIDAY" | "EXAM_PERIOD" | "OTHER";

export interface NonTeachingDay {
  id: string;
  campus_id: string | null;
  day: string;
  label_en: string;
  label_fr: string;
  kind: NonTeachingKind;
}

export type NonTeachingDayInput = Omit<NonTeachingDay, "id">;

export interface TimetableReadiness {
  term_id: string;
  sections_total: number;
  sections_with_meetings: number;
  sections_without_meetings: {
    id: string; code: string; course_code: string;
    course_title_en: string; course_title_fr: string | null; department_id: string;
  }[];
  meetings_without_classroom: number;
}

export function listCampuses(token: string, locale: Locale) {
  return apiRequest<Campus[]>("/academic/campuses", options(token, locale));
}

export function listClassrooms(
  params: { campus_id?: string; include_inactive?: boolean }, token: string, locale: Locale,
) {
  return apiRequest<Classroom[]>("/academic/classrooms", {
    ...options(token, locale),
    query: { campus_id: params.campus_id, include_inactive: params.include_inactive ? "true" : undefined },
  });
}

export function createClassroom(payload: ClassroomInput, token: string, locale: Locale) {
  return apiRequest<Classroom>("/academic/classrooms", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function updateClassroom(id: string, payload: ClassroomInput, token: string, locale: Locale) {
  return apiRequest<Classroom>(`/academic/classrooms/${id}`, {
    ...options(token, locale), method: "PUT", body: payload,
  });
}

export function listNonTeachingDays(from: string, to: string, token: string, locale: Locale) {
  return apiRequest<NonTeachingDay[]>("/academic/non-teaching-days", {
    ...options(token, locale), query: { from, to },
  });
}

export function addNonTeachingDay(payload: NonTeachingDayInput, token: string, locale: Locale) {
  return apiRequest<NonTeachingDay>("/academic/non-teaching-days", {
    ...options(token, locale), method: "POST", body: payload,
  });
}

export function removeNonTeachingDay(id: string, token: string, locale: Locale) {
  return apiRequest<{ removed: boolean }>(`/academic/non-teaching-days/${id}`, {
    ...options(token, locale), method: "DELETE",
  });
}

export function getTimetableReadiness(termId: string, token: string, locale: Locale) {
  return apiRequest<TimetableReadiness>(`/academic/terms/${termId}/readiness`, options(token, locale));
}
