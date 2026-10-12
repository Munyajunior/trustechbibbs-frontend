import { apiList, apiRequest } from "./client";
import type { Locale, Paginated } from "./types";

export type TranscriptRequestStatus = "REQUESTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface TranscriptRequest {
  id: string;
  reference_number: string;
  student_record_id: string;
  student_id: string;
  student_name: string;
  transcript_type: "OFFICIAL" | "STUDENT_COPY";
  quantity: number;
  delivery_method: "PICKUP" | "EMAIL";
  notes: string | null;
  status: TranscriptRequestStatus;
  decision_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface TranscriptRequestInput {
  transcript_type: TranscriptRequest["transcript_type"];
  quantity: number;
  delivery_method: TranscriptRequest["delivery_method"];
  notes: string | null;
}

const options = (token: string, locale: Locale) => ({ token, locale, cache: "no-store" as const });

export function createTranscriptRequest(input: TranscriptRequestInput, token: string, locale: Locale) {
  return apiRequest<TranscriptRequest>("/students/me/transcript-requests", {
    ...options(token, locale), method: "POST", body: input,
  });
}

export function listMyTranscriptRequests(token: string, locale: Locale) {
  return apiRequest<TranscriptRequest[]>("/students/me/transcript-requests", options(token, locale));
}

export function cancelTranscriptRequest(id: string, token: string, locale: Locale) {
  return apiRequest<TranscriptRequest>(`/students/me/transcript-requests/${id}/cancel`, {
    ...options(token, locale), method: "POST",
  });
}

export function listStaffTranscriptRequests(token: string, locale: Locale, page = 1, status?: TranscriptRequestStatus) {
  return apiList<TranscriptRequest>("/examination/transcript-requests", {
    ...options(token, locale), query: { page, per_page: 20, status },
  }) as Promise<Paginated<TranscriptRequest>>;
}

export function reviewTranscriptRequest(
  id: string, status: "IN_REVIEW" | "APPROVED" | "REJECTED", decisionNote: string | null,
  token: string, locale: Locale,
) {
  return apiRequest<TranscriptRequest>(`/examination/transcript-requests/${id}`, {
    ...options(token, locale), method: "PATCH", body: { status, decision_note: decisionNote },
  });
}
