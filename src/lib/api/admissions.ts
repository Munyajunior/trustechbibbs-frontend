import { API_BASE_URL, ApiError, ApiUnreachableError, apiList, apiRequest } from "./client";
import type { Locale, Paginated, Program } from "./types";
import type { ApiErrorBody, Envelope } from "./types";

export interface ApplicationDraftPayload {
  program_first_choice: string;
  program_second_choice?: string;
  intake: string;
  personal_info: Record<string, string>;
  academic_history: Array<Record<string, unknown>>;
}

export interface ApplicationDraft {
  id: string;
  reference_number: string;
  status: string;
  application_fee: string;
  next_step: string;
  created_at: string;
}

export interface ApplicationDetail {
  id: string;
  reference_number: string;
  status: string;
  intake: string;
  program_first_choice: string;
  program_second_choice: string | null;
  personal_info: Record<string, string>;
  academic_history: Array<Record<string, unknown>>;
  fee_paid: boolean;
  submitted_at: string | null;
  status_history: Array<{ status: string; changed_at: string; comment: string | null }>;
}

export interface ApplicantApplicationListItem {
  id: string;
  reference_number: string;
  status: string;
  intake: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface ReviewApplicationListItem {
  id: string;
  reference_number: string;
  status: string;
  intake: string;
  program_first_choice: string;
  applicant_id: string;
  created_at: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  user_id: string;
  source_application_id: string;
  email_institutional: string;
  program_id: string;
  enrollment_year: number;
  enrollment_status: string;
}

export interface EnrollmentSummary {
  total_active: number;
  by_program: Array<{
    program_id: string | null;
    program_code: string | null;
    program_name_en: string | null;
    program_name_fr: string | null;
    active_students: number;
  }>;
}

export interface ApplicationDocument {
  id: string;
  kind: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  has_thumbnail: boolean;
}

export function listApplicationDocuments(applicationId: string, token: string, locale: Locale): Promise<ApplicationDocument[]> {
  return apiRequest<ApplicationDocument[]>(`/admissions/applications/${applicationId}/documents`, { token, locale, cache: "no-store" });
}

export async function uploadApplicationDocument(applicationId: string, kind: string, file: File, token: string, locale: Locale): Promise<ApplicationDocument> {
  const body = new FormData();
  body.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/admissions/applications/${applicationId}/documents/${kind}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": locale },
      body,
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }
  const payload = await response.json().catch(() => null) as Envelope<ApplicationDocument> | null;
  if (!response.ok || !payload || !payload.success) {
    const fallback: ApiErrorBody = { code: "UPLOAD_FAILED", message_en: "The document could not be uploaded.", message_fr: "Le document n’a pas pu être téléversé.", details: [], reference_id: "n/a" };
    throw new ApiError(response.status, payload && !payload.success ? payload.error : fallback);
  }
  return payload.data;
}

export async function getApplicationDocumentPreview(applicationId: string, kind: string, token: string, locale: Locale): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/admissions/applications/${applicationId}/documents/${kind}`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": locale }, cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload?.error ?? { code: "PREVIEW_FAILED", message_en: "Preview unavailable.", message_fr: "Aperçu indisponible.", details: [], reference_id: "n/a" });
  }
  return response.blob();
}

export function getApplicationPrograms(locale: Locale): Promise<Paginated<Program>> {
  return apiList<Program>("/public/programs", {
    locale,
    query: { per_page: 50 },
    cache: "no-store",
  });
}

export function createApplicationDraft(
  payload: ApplicationDraftPayload,
  token: string,
  locale: Locale,
): Promise<ApplicationDraft> {
  return apiRequest<ApplicationDraft>("/admissions/applications", {
    method: "POST",
    body: payload,
    token,
    locale,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    cache: "no-store",
  });
}

export function updateApplicationDraft(
  applicationId: string,
  payload: Pick<ApplicationDraftPayload, "academic_history">,
  token: string,
  locale: Locale,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(`/admissions/applications/${applicationId}`, {
    method: "PATCH",
    body: payload,
    token,
    locale,
    cache: "no-store",
  });
}

export function submitApplication(
  applicationId: string,
  token: string,
  locale: Locale,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(`/admissions/applications/${applicationId}/submit`, {
    method: "POST",
    token,
    locale,
    cache: "no-store",
  });
}

export function getMyApplications(
  token: string,
  locale: Locale,
): Promise<Paginated<ApplicantApplicationListItem>> {
  return apiList<ApplicantApplicationListItem>("/admissions/applications/mine", {
    token,
    locale,
    query: { per_page: 20 },
    cache: "no-store",
  });
}

export function getApplication(
  applicationId: string,
  token: string,
  locale: Locale,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(`/admissions/applications/${applicationId}`, {
    token,
    locale,
    cache: "no-store",
  });
}

export function getApplicationsForReview(
  token: string,
  locale: Locale,
  status?: string,
): Promise<Paginated<ReviewApplicationListItem>> {
  return apiList<ReviewApplicationListItem>("/admissions/applications", {
    token,
    locale,
    query: { per_page: 50, status },
    cache: "no-store",
  });
}

export function getApplicationForReview(
  applicationId: string,
  token: string,
  locale: Locale,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(`/admissions/applications/${applicationId}/review`, {
    token,
    locale,
    cache: "no-store",
  });
}

export function updateApplicationStatus(
  applicationId: string,
  status: string,
  comment: string,
  token: string,
  locale: Locale,
): Promise<ApplicationDetail> {
  return apiRequest<ApplicationDetail>(`/admissions/applications/${applicationId}/status`, {
    method: "PATCH",
    body: { status, comment: comment || null },
    token,
    locale,
    cache: "no-store",
  });
}

export function enrollAdmittedApplicant(
  applicationId: string,
  token: string,
  locale: Locale,
): Promise<StudentEnrollment> {
  return apiRequest<StudentEnrollment>(`/students/enrollments/from-application/${applicationId}`, {
    method: "POST",
    token,
    locale,
    cache: "no-store",
  });
}

export function getEnrollmentSummary(token: string, locale: Locale): Promise<EnrollmentSummary> {
  return apiRequest<EnrollmentSummary>("/students/enrollments/summary", {
    token,
    locale,
    cache: "no-store",
  });
}
