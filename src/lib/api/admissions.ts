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
  submitted_at?: string | null;
  program_name_en?: string | null;
  program_name_fr?: string | null;
  applicant_name?: string | null;
  applicant_email?: string | null;
}

/** Status transitions the backend accepts for staff (mirrors ALLOWED_STATUS_TRANSITIONS server-side). */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW", "ADMITTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "ADMITTED", "REJECTED"],
  INTERVIEW: ["ADMITTED", "REJECTED"],
};

/** Statuses staff may move an application to from `current` (empty when final/unknown). */
export function getAllowedTransitions(current: string): string[] {
  return [...(ALLOWED_STATUS_TRANSITIONS[current] ?? [])];
}

/** Rejection requires a non-blank comment (backend: REJECTION_COMMENT_REQUIRED). */
export function isCommentRequired(status: string): boolean {
  return status === "REJECTED";
}

export const REVIEW_SORT_FIELDS = [
  "created_at", "submitted_at", "reference_number", "status", "intake", "applicant_name", "program_name",
] as const;
export type ReviewSortField = (typeof REVIEW_SORT_FIELDS)[number];
export const DEFAULT_REVIEW_SORT = "-created_at";

export interface ReviewQueueFilters {
  status?: string;
  search?: string;
  program_id?: string;
  intake?: string;
  submitted_from?: string;
  submitted_to?: string;
  sort?: string;
  page?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a sort the backend accepts (field, optionally prefixed by "-"). */
export function isValidReviewSort(value: string): boolean {
  return (REVIEW_SORT_FIELDS as readonly string[]).includes(value.replace(/^-/, ""));
}

/** Drop empty values and trim text so only meaningful params reach the API. */
export function buildReviewQuery(filters: ReviewQueueFilters, perPage = 20): Record<string, string | number> {
  const query: Record<string, string | number> = { page: Math.max(1, filters.page ?? 1), per_page: perPage };
  const text = (value?: string) => (value ?? "").trim();
  if (text(filters.status)) query.status = text(filters.status);
  if (text(filters.search)) query.search = text(filters.search);
  if (text(filters.program_id)) query.program_id = text(filters.program_id);
  if (text(filters.intake)) query.intake = text(filters.intake);
  if (DATE_RE.test(text(filters.submitted_from))) query.submitted_from = text(filters.submitted_from);
  if (DATE_RE.test(text(filters.submitted_to))) query.submitted_to = text(filters.submitted_to);
  if (text(filters.sort) && isValidReviewSort(text(filters.sort))) query.sort = text(filters.sort);
  return query;
}

/** Read queue filters from URL search params; invalid values are ignored. */
export function parseReviewFilters(params: { get(name: string): string | null }): ReviewQueueFilters {
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const get = (name: string) => (params.get(name) ?? "").trim();
  const sort = get("sort");
  return {
    status: get("status"),
    search: get("search"),
    program_id: get("program_id"),
    intake: get("intake"),
    submitted_from: DATE_RE.test(get("submitted_from")) ? get("submitted_from") : "",
    submitted_to: DATE_RE.test(get("submitted_to")) ? get("submitted_to") : "",
    sort: sort && isValidReviewSort(sort) ? sort : "",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** Serialise filters to a query string (no leading "?"); defaults are omitted to keep URLs clean. */
export function serializeReviewFilters(filters: ReviewQueueFilters): string {
  const query = buildReviewQuery(filters);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "per_page") continue;
    if (key === "page" && value === 1) continue;
    if (key === "sort" && value === DEFAULT_REVIEW_SORT) continue;
    params.set(key, String(value));
  }
  return params.toString();
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
  filtersOrStatus: ReviewQueueFilters | string = {},
  legacyPage?: number,
): Promise<Paginated<ReviewApplicationListItem>> {
  // Legacy positional form (status, page) is still used by the staff dashboard.
  const filters: ReviewQueueFilters = typeof filtersOrStatus === "string"
    ? { status: filtersOrStatus, page: legacyPage }
    : filtersOrStatus;
  return apiList<ReviewApplicationListItem>("/admissions/applications", {
    token,
    locale,
    query: buildReviewQuery(filters),
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
