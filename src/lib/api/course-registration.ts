import type { CurriculumCourse } from "./academic-catalogue";
import type { AcademicTerm, CourseSection, SectionMeeting } from "./academic-schedule";
import { apiRequest } from "./client";
import type { Locale } from "./types";

export interface RegistrationSectionOption {
  section: CourseSection;
  meetings: SectionMeeting[];
  seats_available: number;
}

export interface RegistrationCourseOption {
  curriculum: CurriculumCourse;
  sections: RegistrationSectionOption[];
}

export interface RegistrationOptions {
  term: AcademicTerm | null;
  phase: "NOT_SCHEDULED" | "UPCOMING" | "OPEN" | "ADD_DROP";
  courses: RegistrationCourseOption[];
}

export interface Enrollment {
  id: string;
  course_id: string;
  section_id: string;
  term_id: string;
  status: string;
  registration_date: string;
  course_code: string;
  course_name_en: string;
  course_name_fr: string | null;
  section_code: string;
  meetings: SectionMeeting[];
}

export interface RegistrationConfirmation {
  student_id: string;
  academic_year: string;
  semester: number;
  total_credits: number;
  enrollments: Enrollment[];
}

export function getRegistrationOptions(token: string, locale: Locale) {
  return apiRequest<RegistrationOptions>("/students/me/registration-options", {
    token, locale, cache: "no-store",
  });
}

export function getExistingRegistration(
  academicYear: string, semester: number, token: string, locale: Locale,
) {
  return apiRequest<RegistrationConfirmation | null>(
    `/students/me/registrations/${academicYear}/${semester}`,
    { token, locale, cache: "no-store" },
  );
}

export function getLatestRegistration(token: string, locale: Locale) {
  return apiRequest<RegistrationConfirmation | null>("/students/me/registrations/latest", {
    token, locale, cache: "no-store",
  });
}

export function registerCourses(
  academicYear: string, semester: number, sectionIds: string[],
  token: string, locale: Locale,
) {
  return apiRequest<RegistrationConfirmation>("/students/me/registrations", {
    method: "POST",
    body: { academic_year: academicYear, semester, section_ids: sectionIds },
    token, locale, cache: "no-store",
  });
}

export function changeRegisteredCourses(
  academicYear: string, semester: number, sectionIds: string[],
  token: string, locale: Locale,
) {
  return apiRequest<RegistrationConfirmation>("/students/me/registrations", {
    method: "PUT",
    body: { academic_year: academicYear, semester, section_ids: sectionIds },
    token, locale, cache: "no-store",
  });
}
