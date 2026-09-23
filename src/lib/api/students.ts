import { apiRequest } from "./client";
import type { Locale } from "./types";

export interface StudentProfile {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  nationality: string | null;
  phone_primary: string | null;
  email_personal: string | null;
  email_institutional: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  enrollment_year: number;
  current_level: number;
  current_semester: number;
  enrollment_status: string;
}

export type StudentProfileUpdate = Pick<
  StudentProfile,
  | "nationality"
  | "phone_primary"
  | "email_personal"
  | "guardian_name"
  | "guardian_phone"
  | "emergency_contact_name"
  | "emergency_contact_phone"
>;

export function getMyStudentProfile(token: string, locale: Locale): Promise<StudentProfile> {
  return apiRequest<StudentProfile>("/students/me", { token, locale, cache: "no-store" });
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
