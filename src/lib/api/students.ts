import { apiList, apiRequest } from "./client";
import type { Locale } from "./types";
import type { CurriculumCourse } from "./academic-catalogue";
import type { AcademicTerm } from "./academic-schedule";

export interface StudentProfile {
  id: string;
  student_id: string;
  program_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email_personal: string | null;
  email_institutional: string;
  address_permanent: Record<string, string>;
  guardian_name: string | null;
  guardian_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_conditions: string | null;
  profile_photo: string | null;
  enrollment_year: number;
  current_level: number;
  current_semester: number;
  enrollment_status: string;
  updated_at: string;
}

export type StudentProfileUpdate = Pick<
  StudentProfile,
  | "nationality"
  | "phone_primary"
  | "phone_secondary"
  | "email_personal"
  | "address_permanent"
  | "guardian_name"
  | "guardian_phone"
  | "emergency_contact_name"
  | "emergency_contact_phone"
  | "medical_conditions"
>;

export function getMyStudentProfile(token: string, locale: Locale): Promise<StudentProfile> {
  return apiRequest<StudentProfile>("/students/me", { token, locale, cache: "no-store" });
}

export interface StudentCourseOverview {
  student_id: string;
  program_id: string | null;
  level: number;
  semester: number;
  courses: CurriculumCourse[];
}

export function getMyCurrentCourses(token: string, locale: Locale): Promise<StudentCourseOverview> {
  return apiRequest<StudentCourseOverview>("/students/me/courses", {
    token, locale, cache: "no-store",
  });
}

export interface StudentRegistrationWindow {
  term: AcademicTerm | null;
  phase: "NOT_SCHEDULED" | "UPCOMING" | "OPEN" | "ADD_DROP";
}

export function getMyRegistrationWindow(token: string, locale: Locale): Promise<StudentRegistrationWindow> {
  return apiRequest<StudentRegistrationWindow>("/students/me/registration-window", {
    token, locale, cache: "no-store",
  });
}

export function updateMyStudentProfile(
  payload: StudentProfileUpdate,
  token: string,
  locale: Locale,
): Promise<StudentProfile> {
  return apiRequest<StudentProfile>("/students/me", {
    method: "PATCH",
    body: payload,
    token,
    locale,
    cache: "no-store",
  });
}

/* -------------------------------------------------------------------------- */
/* Staff student lookup (registrar, admin, super admin)                       */
/* -------------------------------------------------------------------------- */

export const STUDENT_STATUSES = ["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export interface StudentListItem {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email_institutional: string;
  email_personal: string | null;
  program_id: string | null;
  program_code: string | null;
  program_name_en: string | null;
  program_name_fr: string | null;
  enrollment_year: number;
  current_level: number;
  current_semester: number;
  enrollment_status: StudentStatus | string;
}

export interface StudentStaffDetail extends StudentProfile {
  user_id: string;
  source_application_id: string | null;
  program_code: string | null;
  program_name_en: string | null;
  program_name_fr: string | null;
  created_at: string;
}

export type StudentStaffUpdate = Partial<
  Pick<
    StudentProfile,
    | "first_name"
    | "last_name"
    | "date_of_birth"
    | "nationality"
    | "phone_primary"
    | "phone_secondary"
    | "email_personal"
    | "guardian_name"
    | "guardian_phone"
    | "emergency_contact_name"
    | "emergency_contact_phone"
    | "current_level"
    | "current_semester"
  > & { enrollment_status: StudentStatus }
>;

export interface StudentSearchQuery {
  search?: string;
  enrollment_status?: StudentStatus;
  enrollment_year?: number;
  page?: number;
  per_page?: number;
  sort?: string;
}

export function searchStudents(query: StudentSearchQuery, token: string, locale: Locale) {
  return apiList<StudentListItem>("/students", {
    token, locale, cache: "no-store", query: { per_page: 20, ...query },
  });
}

export function getStudentForStaff(id: string, token: string, locale: Locale) {
  return apiRequest<StudentStaffDetail>(`/students/${id}`, { token, locale, cache: "no-store" });
}

export function updateStudentForStaff(id: string, payload: StudentStaffUpdate, token: string, locale: Locale) {
  return apiRequest<StudentStaffDetail>(`/students/${id}`, {
    token, locale, cache: "no-store", method: "PATCH", body: payload,
  });
}
