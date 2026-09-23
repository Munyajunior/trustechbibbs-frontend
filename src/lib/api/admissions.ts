import { apiList, apiRequest } from "./client";
import type { Locale, Paginated, Program } from "./types";

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
