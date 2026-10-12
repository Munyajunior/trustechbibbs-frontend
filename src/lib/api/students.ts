import { apiRequest } from "./client";
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
